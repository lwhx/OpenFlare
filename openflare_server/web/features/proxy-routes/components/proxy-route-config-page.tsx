'use client';

import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { InlineMessage } from '@/components/feedback/inline-message';
import { LoadingState } from '@/components/feedback/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { AppCard } from '@/components/ui/app-card';
import { getManagedDomains } from '@/features/managed-domains/api/managed-domains';
import { getTlsCertificates } from '@/features/tls-certificates/api/tls-certificates';
import type { TlsCertificateItem } from '@/features/tls-certificates/types';
import {
  getProxyRoute,
  updateProxyRoute,
} from '@/features/proxy-routes/api/proxy-routes';
import { DomainListInput } from '@/features/proxy-routes/components/domain-list-input';
import {
  buildPayloadFromRoute,
  customHeadersToText,
  getErrorMessage,
  getWebsiteConfigSection,
  linesFromTextarea,
  normalizeLimitRate,
  parseCustomHeadersText,
  parseOriginUrl,
  parseOriginUrls,
  validateCacheRules,
  validateDomains,
  validateLimitRate,
  validateOriginHost,
  websiteConfigSections,
} from '@/features/proxy-routes/helpers';
import type {
  ProxyRouteItem,
  ProxyRouteMutationPayload,
} from '@/features/proxy-routes/types';
import {
  PrimaryButton,
  ResourceField,
  ResourceInput,
  ResourceSelect,
  ResourceTextarea,
  SecondaryButton,
  ToggleField,
} from '@/features/shared/components/resource-primitives';
import { cn } from '@/lib/utils/cn';

type FeedbackState = {
  tone: 'success' | 'danger';
  message: string;
};

type SaveContext = {
  message: string;
};

type SaveHandler = (
  payload: ProxyRouteMutationPayload,
  context: SaveContext,
) => void;

const domainSettingsSchema = z
  .object({
    site_name: z.string().trim().min(1, '请输入站点标识').max(255, '站点标识不能超过 255 个字符'),
    domains_text: z.string().trim().min(1, '请至少填写一个域名'),
    enabled: z.boolean(),
  })
  .superRefine((value, context) => {
    const domains = linesFromTextarea(value.domains_text).map((item) =>
      item.toLowerCase(),
    );
    const error = validateDomains(domains);
    if (error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['domains_text'],
        message: error,
      });
    }
  });

const rateLimitSchema = z
  .object({
    limit_conn_per_server: z.string(),
    limit_conn_per_ip: z.string(),
    limit_rate: z.string(),
  })
  .superRefine((value, context) => {
    for (const field of ['limit_conn_per_server', 'limit_conn_per_ip'] as const) {
      const rawValue = value[field].trim();
      if (!rawValue) {
        continue;
      }
      if (!/^\d+$/.test(rawValue)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: '请输入大于等于 0 的整数',
        });
      }
    }

    const limitRateError = validateLimitRate(value.limit_rate);
    if (limitRateError) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['limit_rate'],
        message: limitRateError,
      });
    }
  });

const reverseProxySchema = z
  .object({
    origin_urls_text: z.string().trim().min(1, '请至少填写一个上游地址'),
    origin_host: z.string(),
    custom_headers_text: z.string(),
    remark: z.string().max(255, '备注不能超过 255 个字符'),
  })
  .superRefine((value, context) => {
    const { error } = parseOriginUrls(value.origin_urls_text);
    if (error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['origin_urls_text'],
        message: error,
      });
    }

    const originHostError = validateOriginHost(value.origin_host);
    if (originHostError) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['origin_host'],
        message: originHostError,
      });
    }

    const { error: headerError } = parseCustomHeadersText(
      value.custom_headers_text,
    );
    if (headerError) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['custom_headers_text'],
        message: headerError,
      });
    }
  });

const httpsSchema = z
  .object({
    enable_https: z.boolean(),
    cert_ids: z.array(z.string()),
    redirect_http: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.enable_https && value.cert_ids.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cert_ids'],
        message: '启用 HTTPS 时必须选择证书',
      });
    }
  });

const cacheSchema = z
  .object({
    cache_enabled: z.boolean(),
    cache_policy: z.enum(['url', 'suffix', 'path_prefix', 'path_exact']),
    cache_rules_text: z.string(),
  })
  .superRefine((value, context) => {
    if (!value.cache_enabled) {
      return;
    }

    const rules = linesFromTextarea(value.cache_rules_text);
    const error = validateCacheRules(value.cache_policy, rules);
    if (error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cache_rules_text'],
        message: error,
      });
    }
  });

type DomainSettingsValues = z.infer<typeof domainSettingsSchema>;
type RateLimitValues = z.infer<typeof rateLimitSchema>;
type ReverseProxyValues = z.infer<typeof reverseProxySchema>;
type HTTPSValues = z.infer<typeof httpsSchema>;
type CacheValues = z.infer<typeof cacheSchema>;

function ConfigSectionShell({
  title,
  description,
  formId,
  saving,
  children,
}: {
  title: string;
  description: string;
  formId: string;
  saving: boolean;
  children: ReactNode;
}) {
  return (
    <AppCard
      title={title}
      description={description}
      action={
        <PrimaryButton type="submit" form={formId} disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </PrimaryButton>
      }
    >
      {children}
    </AppCard>
  );
}

function DomainSettingsSection({
  route,
  saving,
  onSave,
  suggestionSources,
}: {
  route: ProxyRouteItem;
  saving: boolean;
  onSave: SaveHandler;
  suggestionSources: string[];
}) {
  const form = useForm<DomainSettingsValues>({
    resolver: zodResolver(domainSettingsSchema),
    defaultValues: {
      site_name: route.site_name,
      domains_text: route.domains.join('\n'),
      enabled: route.enabled,
    },
  });

  useEffect(() => {
    form.reset({
      site_name: route.site_name,
      domains_text: route.domains.join('\n'),
      enabled: route.enabled,
    });
  }, [form, route]);

  return (
    <ConfigSectionShell
      title="域名设置"
      description="配置站点。"
      formId="proxy-route-domains-form"
      saving={saving}
    >
      <form
        id="proxy-route-domains-form"
        className="space-y-5"
        onSubmit={form.handleSubmit((values) => {
          const domains = linesFromTextarea(values.domains_text).map((item) =>
            item.toLowerCase(),
          );

          onSave(
            buildPayloadFromRoute(route, {
              site_name: values.site_name.trim(),
              domain: domains[0],
              domains,
              enabled: values.enabled,
            }),
            { message: '域名设置已保存。' },
          );
        })}
      >
        <ToggleField
              label="启用站点"
              description="关闭后站点会保留配置，但不会被纳入发布渲染。"
              checked={form.watch('enabled')}
              onChange={(checked) =>
                  form.setValue('enabled', checked, { shouldDirty: true })
              }
        />
        <ResourceField
          label="站点标识"
          hint="建议使用稳定、可读的业务标识，不必与域名完全一致。"
          error={form.formState.errors.site_name?.message}
        >
          <ResourceInput
            placeholder="marketing-site"
            {...form.register('site_name')}
          />
        </ResourceField>

        <ResourceField
          label="域名列表"
          hint="一个输入框填写一个域名，点击右侧 + 可以继续追加。输入时会优先提示已有域名后缀。"
          error={form.formState.errors.domains_text?.message}
        >
          <Controller
            control={form.control}
            name="domains_text"
            render={({ field }) => (
              <DomainListInput
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                suggestionSources={suggestionSources}
              />
            )}
          />
        </ResourceField>

      </form>
    </ConfigSectionShell>
  );
}

function RateLimitSection({
  route,
  saving,
  onSave,
}: {
  route: ProxyRouteItem;
  saving: boolean;
  onSave: SaveHandler;
}) {
  const form = useForm<RateLimitValues>({
    resolver: zodResolver(rateLimitSchema),
    defaultValues: {
      limit_conn_per_server: route.limit_conn_per_server
        ? String(route.limit_conn_per_server)
        : '',
      limit_conn_per_ip: route.limit_conn_per_ip
        ? String(route.limit_conn_per_ip)
        : '',
      limit_rate: route.limit_rate || '',
    },
  });

  useEffect(() => {
    form.reset({
      limit_conn_per_server: route.limit_conn_per_server
        ? String(route.limit_conn_per_server)
        : '',
      limit_conn_per_ip: route.limit_conn_per_ip
        ? String(route.limit_conn_per_ip)
        : '',
      limit_rate: route.limit_rate || '',
    });
  }, [form, route]);

  return (
    <ConfigSectionShell
      title="流量限制"
      description="网站限流, 空值或 0 表示关闭。"
      formId="proxy-route-limits-form"
      saving={saving}
    >
      <form
        id="proxy-route-limits-form"
        className="grid gap-5 md:grid-cols-2"
        onSubmit={form.handleSubmit((values) => {
          onSave(
            buildPayloadFromRoute(route, {
              limit_conn_per_server: Number(
                values.limit_conn_per_server.trim() || '0',
              ),
              limit_conn_per_ip: Number(values.limit_conn_per_ip.trim() || '0'),
              limit_rate: normalizeLimitRate(values.limit_rate),
            }),
            { message: '流量限制已保存。' },
          );
        })}
      >
        <ResourceField
          label="并发限制"
          hint="限制当前站点最大并发数"
          error={form.formState.errors.limit_conn_per_server?.message}
        >
          <ResourceInput
            placeholder="120"
            {...form.register('limit_conn_per_server')}
          />
        </ResourceField>

        <ResourceField
          label="单IP限制"
          hint="限制单个IP访问最大并发数"
          error={form.formState.errors.limit_conn_per_ip?.message}
        >
          <ResourceInput
            placeholder="12"
            {...form.register('limit_conn_per_ip')}
          />
        </ResourceField>

        <ResourceField
          label="流量限制"
          hint="限制每个请求的流量上限。"
          error={form.formState.errors.limit_rate?.message}
          className="md:col-span-2"
        >
          <ResourceInput placeholder="512k/1m" {...form.register('limit_rate')} />
        </ResourceField>
      </form>
    </ConfigSectionShell>
  );
}

function ReverseProxySection({
  route,
  saving,
  onSave,
}: {
  route: ProxyRouteItem;
  saving: boolean;
  onSave: SaveHandler;
}) {
  const form = useForm<ReverseProxyValues>({
    resolver: zodResolver(reverseProxySchema),
    defaultValues: {
      origin_urls_text: route.upstream_list.join('\n'),
      origin_host: route.origin_host || '',
      custom_headers_text: customHeadersToText(route.custom_header_list),
      remark: route.remark || '',
    },
  });

  useEffect(() => {
    form.reset({
      origin_urls_text: route.upstream_list.join('\n'),
      origin_host: route.origin_host || '',
      custom_headers_text: customHeadersToText(route.custom_header_list),
      remark: route.remark || '',
    });
  }, [form, route]);

  return (
    <ConfigSectionShell
      title="反向代理"
      description="第一行作为主回源；如果填写多行，会自动进入多上游负载均衡模式。"
      formId="proxy-route-proxy-form"
      saving={saving}
    >
      <form
        id="proxy-route-proxy-form"
        className="space-y-5"
        onSubmit={form.handleSubmit((values) => {
          const { urls } = parseOriginUrls(values.origin_urls_text);
          const primaryOrigin = parseOriginUrl(urls[0]);
          const { headers } = parseCustomHeadersText(values.custom_headers_text);

          onSave(
            buildPayloadFromRoute(route, {
              origin_id: null,
              origin_url: urls[0],
              origin_scheme: primaryOrigin.scheme,
              origin_address: primaryOrigin.address,
              origin_port: primaryOrigin.port,
              origin_uri: primaryOrigin.uri,
              origin_host: values.origin_host.trim(),
              upstreams: urls.slice(1),
              custom_headers: headers,
              remark: values.remark.trim(),
            }),
            { message: '反向代理设置已保存。' },
          );
        })}
      >
        <ResourceField
          label="上游地址"
          hint="每行一个完整 URL。多上游模式下不要带 path 或 query。"
          error={form.formState.errors.origin_urls_text?.message}
        >
          <ResourceTextarea
            aria-label="上游地址"
            className="min-h-40"
            placeholder={'https://origin-a.internal:443\nhttps://origin-b.internal:443'}
            {...form.register('origin_urls_text')}
          />
        </ResourceField>

        <ResourceField
          label="Origin Host Header"
          hint="留空时默认透传访问域名 $host。"
          error={form.formState.errors.origin_host?.message}
        >
          <ResourceInput
            placeholder="origin.example.internal"
            {...form.register('origin_host')}
          />
        </ResourceField>

        <ResourceField
          label="自定义请求头"
          hint="每行一条，格式为 Key: Value。"
          error={form.formState.errors.custom_headers_text?.message}
        >
          <ResourceTextarea
            className="min-h-32"
            placeholder={'X-Trace-Id: $request_id\nX-Site: marketing'}
            {...form.register('custom_headers_text')}
          />
        </ResourceField>

        <ResourceField
          label="备注"
          error={form.formState.errors.remark?.message}
        >
          <ResourceTextarea
            placeholder="例如：多活回源，优先使用上海入口"
            {...form.register('remark')}
          />
        </ResourceField>
      </form>
    </ConfigSectionShell>
  );
}

function HTTPSSection({
  route,
  certificates,
  saving,
  onSave,
}: {
  route: ProxyRouteItem;
  certificates: TlsCertificateItem[];
  saving: boolean;
  onSave: SaveHandler;
}) {
  const form = useForm<HTTPSValues>({
    resolver: zodResolver(httpsSchema),
    defaultValues: {
      enable_https: route.enable_https,
      cert_ids:
        route.cert_ids.length > 0
          ? route.cert_ids.map((certID) => String(certID))
          : route.cert_id
            ? [String(route.cert_id)]
            : [],
      redirect_http: route.redirect_http,
    },
  });

  useEffect(() => {
    form.reset({
      enable_https: route.enable_https,
      cert_ids:
        route.cert_ids.length > 0
          ? route.cert_ids.map((certID) => String(certID))
          : route.cert_id
            ? [String(route.cert_id)]
            : [],
      redirect_http: route.redirect_http,
    });
  }, [form, route]);

  const watchedEnableHTTPS = form.watch('enable_https');
  const watchedCertIDs = form.watch('cert_ids');

  return (
    <ConfigSectionShell
      title="HTTPS"
      description="启用后必须选择覆盖当前全部域名的证书。发布时服务端会再次验证证书覆盖范围。"
      formId="proxy-route-https-form"
      saving={saving}
    >
      <form
        id="proxy-route-https-form"
        className="space-y-5"
        onSubmit={form.handleSubmit((values) => {
          onSave(
            buildPayloadFromRoute(route, {
              enable_https: values.enable_https,
              cert_id:
                values.enable_https &&
                values.cert_ids.some((value) => Number(value) > 0)
                  ? Number(
                      values.cert_ids.find((value) => Number(value) > 0) ?? 0,
                    )
                  : null,
              cert_ids: values.enable_https
                ? values.cert_ids
                    .map((value) => Number(value))
                    .filter((value) => Number.isFinite(value) && value > 0)
                : [],
              redirect_http: values.enable_https ? values.redirect_http : false,
            }),
            { message: 'HTTPS 设置已保存。' },
          );
        })}
      >
        <ToggleField
          label="启用 HTTPS"
          description="关闭后站点只会渲染 HTTP server。"
          checked={watchedEnableHTTPS}
          onChange={(checked) => {
            form.setValue('enable_https', checked, { shouldDirty: true });
            if (!checked) {
              form.setValue('cert_ids', [], { shouldDirty: true });
              form.setValue('redirect_http', false, { shouldDirty: true });
            }
          }}
        />

        <ResourceField
          label="证书"
          error={form.formState.errors.cert_ids?.message}
          hint="请确保该证书能覆盖当前站点的全部域名。"
        >
          <ResourceSelect
            multiple
            size={Math.min(Math.max(certificates.length, 4), 8)}
            className="min-h-44"
            disabled={!watchedEnableHTTPS}
            {...form.register('cert_ids')}
          >
            <option value="">请选择证书</option>
            {certificates.map((certificate) => (
              <option key={certificate.id} value={certificate.id}>
                {certificate.not_after
                  ? `${certificate.name} · ${certificate.not_after}`
                  : certificate.name}
              </option>
            ))}
          </ResourceSelect>
          {watchedEnableHTTPS && watchedCertIDs.length > 0 ? (
            <p className="text-xs leading-5 text-[var(--foreground-secondary)]">
              已选择 {watchedCertIDs.length} 张证书，发布时会校验证书集合是否覆盖全部域名。
            </p>
          ) : null}
        </ResourceField>

        <ToggleField
          label="HTTP 自动跳转到 HTTPS"
          description="开启后会生成额外的 80 端口重定向 server。"
          checked={form.watch('redirect_http')}
          disabled={!watchedEnableHTTPS}
          onChange={(checked) =>
            form.setValue('redirect_http', checked, { shouldDirty: true })
          }
        />
      </form>
    </ConfigSectionShell>
  );
}

function CacheSection({
  route,
  saving,
  onSave,
}: {
  route: ProxyRouteItem;
  saving: boolean;
  onSave: SaveHandler;
}) {
  const form = useForm<CacheValues>({
    resolver: zodResolver(cacheSchema),
    defaultValues: {
      cache_enabled: route.cache_enabled,
      cache_policy: (route.cache_policy || 'url') as CacheValues['cache_policy'],
      cache_rules_text: route.cache_rule_list.join('\n'),
    },
  });

  useEffect(() => {
    form.reset({
      cache_enabled: route.cache_enabled,
      cache_policy: (route.cache_policy || 'url') as CacheValues['cache_policy'],
      cache_rules_text: route.cache_rule_list.join('\n'),
    });
  }, [form, route]);

  const watchedEnabled = form.watch('cache_enabled');
  const watchedPolicy = form.watch('cache_policy');

  return (
    <ConfigSectionShell
      title="缓存"
      description="保留现有安全绕过逻辑，只对当前站点生效。"
      formId="proxy-route-cache-form"
      saving={saving}
    >
      <form
        id="proxy-route-cache-form"
        className="space-y-5"
        onSubmit={form.handleSubmit((values) => {
          const rules = linesFromTextarea(values.cache_rules_text);
          onSave(
            buildPayloadFromRoute(route, {
              cache_enabled: values.cache_enabled,
              cache_policy: values.cache_enabled ? values.cache_policy : 'url',
              cache_rules:
                values.cache_enabled && values.cache_policy !== 'url' ? rules : [],
            }),
            { message: '缓存设置已保存。' },
          );
        })}
      >
        <ToggleField
          label="启用站点缓存"
          description="系统仍会自动绕过非 GET、带 Authorization 或常见登录态 Cookie 的请求。"
          checked={watchedEnabled}
          onChange={(checked) =>
            form.setValue('cache_enabled', checked, { shouldDirty: true })
          }
        />

        <ResourceField label="缓存策略">
          <ResourceSelect
            disabled={!watchedEnabled}
            {...form.register('cache_policy')}
          >
            <option value="url">按 URL 缓存</option>
            <option value="suffix">按后缀缓存</option>
            <option value="path_prefix">按路径前缀缓存</option>
            <option value="path_exact">按精确路径缓存</option>
          </ResourceSelect>
        </ResourceField>

        <ResourceField
          label="缓存规则"
          error={form.formState.errors.cache_rules_text?.message}
          hint={
            watchedPolicy === 'suffix'
              ? '每行一个后缀，例如 jpg、css、js。'
              : watchedPolicy === 'path_prefix'
                ? '每行一个路径前缀，例如 /assets、/static。'
                : watchedPolicy === 'path_exact'
                  ? '每行一个精确路径，例如 /robots.txt。'
                  : '按 URL 缓存时无需额外规则。'
          }
        >
          <ResourceTextarea
            disabled={!watchedEnabled || watchedPolicy === 'url'}
            className="min-h-32"
            placeholder={
              watchedPolicy === 'suffix'
                ? 'jpg\ncss\njs'
                : watchedPolicy === 'path_prefix'
                  ? '/assets\n/static'
                  : watchedPolicy === 'path_exact'
                    ? '/robots.txt\n/manifest.json'
                    : '按 URL 缓存无需额外规则'
            }
            {...form.register('cache_rules_text')}
          />
        </ResourceField>
      </form>
    </ConfigSectionShell>
  );
}

export function ProxyRouteConfigPage({
  routeId,
  initialSection,
}: {
  routeId: string;
  initialSection?: string;
}) {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const numericRouteID = Number(routeId);
  const currentSection = getWebsiteConfigSection(initialSection);

  const routeQuery = useQuery({
    queryKey: ['proxy-routes', 'detail', numericRouteID],
    queryFn: () => getProxyRoute(numericRouteID),
    enabled: Number.isFinite(numericRouteID) && numericRouteID > 0,
  });
  const certificatesQuery = useQuery({
    queryKey: ['tls-certificates', 'list'],
    queryFn: getTlsCertificates,
  });
  const managedDomainsQuery = useQuery({
    queryKey: ['managed-domains'],
    queryFn: getManagedDomains,
  });

  const saveMutation = useMutation({
    mutationFn: async ({
      payload,
      context,
    }: {
      payload: Parameters<typeof updateProxyRoute>[1];
      context: SaveContext;
    }) => {
      const updatedRoute = await updateProxyRoute(numericRouteID, payload);
      return { updatedRoute, context };
    },
    onSuccess: async ({ updatedRoute, context }) => {
      queryClient.setQueryData(
        ['proxy-routes', 'detail', numericRouteID],
        updatedRoute,
      );
      setFeedback({ tone: 'success', message: context.message });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['proxy-routes'] }),
        queryClient.invalidateQueries({ queryKey: ['config-versions', 'diff'] }),
      ]);
    },
    onError: (error) => {
      setFeedback({ tone: 'danger', message: getErrorMessage(error) });
    },
  });

  const route = routeQuery.data;
  const certificates = useMemo(
    () => certificatesQuery.data ?? [],
    [certificatesQuery.data],
  );
  const domainSuggestionSources = useMemo(() => {
    return [
      ...(route?.domains ?? []),
      ...(managedDomainsQuery.data?.map((item) => item.domain) ?? []),
    ];
  }, [managedDomainsQuery.data, route?.domains]);

  if (!Number.isFinite(numericRouteID) || numericRouteID <= 0) {
    return (
      <EmptyState
        title="缺少网站 ID"
        description="请从网站列表进入配置子页面。"
      />
    );
  }

  if (routeQuery.isLoading || certificatesQuery.isLoading) {
    return <LoadingState />;
  }

  if (routeQuery.isError) {
    return (
      <ErrorState
        title="网站详情加载失败"
        description={getErrorMessage(routeQuery.error)}
      />
    );
  }

  if (certificatesQuery.isError) {
    return (
      <ErrorState
        title="证书列表加载失败"
        description={getErrorMessage(certificatesQuery.error)}
      />
    );
  }

  if (!route) {
    return (
      <EmptyState
        title="网站不存在"
        description="该网站可能已被删除，或当前 ID 无法匹配到记录。"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={route.site_name}
        description={`主域名 ${route.primary_domain}，共 ${route.domain_count} 个域名`}
        action={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/proxy-route"
              className="inline-flex items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--control-background)] px-4 py-3 text-sm font-medium text-[var(--foreground-primary)] transition hover:bg-[var(--control-background-hover)]"
            >
              返回列表
            </Link>
            <SecondaryButton
              type="button"
              onClick={() =>
                queryClient.invalidateQueries({
                  queryKey: ['proxy-routes', 'detail', numericRouteID],
                })
              }
            >
              刷新详情
            </SecondaryButton>
          </div>
        }
      />

      {feedback ? (
        <InlineMessage tone={feedback.tone} message={feedback.message} />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <AppCard title="配置分区" >
            <div className="space-y-2">
              {websiteConfigSections.map((section) => {
                const active = section.key === currentSection;
                return (
                  <Link
                    key={section.key}
                    href={`/proxy-route/detail?id=${route.id}&section=${section.key}`}
                    className={cn(
                      'block rounded-2xl border px-4 py-3 transition',
                      active
                        ? 'border-[var(--border-strong)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border-default)] bg-[var(--surface-elevated)] hover:border-[var(--border-strong)]',
                    )}
                  >
                    <p className="text-sm font-medium text-[var(--foreground-primary)]">
                      {section.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--foreground-secondary)]">
                      {section.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </AppCard>
        </aside>

        <div className="min-w-0 space-y-6">
          {currentSection === 'domains' ? (
            <DomainSettingsSection
              route={route}
              saving={saveMutation.isPending}
              suggestionSources={domainSuggestionSources}
              onSave={(payload, context) =>
                saveMutation.mutate({ payload, context })
              }
            />
          ) : null}

          {currentSection === 'limits' ? (
            <RateLimitSection
              route={route}
              saving={saveMutation.isPending}
              onSave={(payload, context) =>
                saveMutation.mutate({ payload, context })
              }
            />
          ) : null}

          {currentSection === 'proxy' ? (
            <ReverseProxySection
              route={route}
              saving={saveMutation.isPending}
              onSave={(payload, context) =>
                saveMutation.mutate({ payload, context })
              }
            />
          ) : null}

          {currentSection === 'https' ? (
            <HTTPSSection
              route={route}
              certificates={certificates}
              saving={saveMutation.isPending}
              onSave={(payload, context) =>
                saveMutation.mutate({ payload, context })
              }
            />
          ) : null}

          {currentSection === 'cache' ? (
            <CacheSection
              route={route}
              saving={saveMutation.isPending}
              onSave={(payload, context) =>
                saveMutation.mutate({ payload, context })
              }
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
