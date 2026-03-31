'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Drawer } from '@/components/ui/drawer';
import { getManagedDomains } from '@/features/managed-domains/api/managed-domains';
import { createProxyRoute } from '@/features/proxy-routes/api/proxy-routes';
import { DomainListInput } from '@/features/proxy-routes/components/domain-list-input';
import {
  buildOriginUrl,
  getErrorMessage,
  linesFromTextarea,
  parseOriginUrl,
  parseOriginUrls,
  validateDomains,
} from '@/features/proxy-routes/helpers';
import type { ProxyRouteItem } from '@/features/proxy-routes/types';
import {
  PrimaryButton,
  ResourceField,
  ResourceInput,
  ResourceTextarea,
  ToggleField,
} from '@/features/shared/components/resource-primitives';

const createWebsiteSchema = z
  .object({
    site_name: z.string().trim().max(255, '站点标识不能超过 255 个字符'),
    domains_text: z.string().trim().min(1, '请至少填写一个域名'),
    origin_urls_text: z.string().trim().min(1, '请至少填写一个上游地址'),
    enabled: z.boolean(),
    remark: z.string().max(255, '备注不能超过 255 个字符'),
  })
  .superRefine((value, context) => {
    const domains = linesFromTextarea(value.domains_text).map((item) =>
      item.toLowerCase(),
    );
    const domainError = validateDomains(domains);
    if (domainError) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['domains_text'],
        message: domainError,
      });
    }

    const { error } = parseOriginUrls(value.origin_urls_text);
    if (error) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['origin_urls_text'],
        message: error,
      });
    }
  });

type CreateWebsiteFormValues = z.infer<typeof createWebsiteSchema>;

const defaultValues: CreateWebsiteFormValues = {
  site_name: '',
  domains_text: '',
  origin_urls_text: '',
  enabled: true,
  remark: '',
};

export function ProxyRouteCreateDrawer({
  open,
  onOpenChange,
  onCreated,
  domainSuggestionSources = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (route: ProxyRouteItem) => void;
  domainSuggestionSources?: string[];
}) {
  const form = useForm<CreateWebsiteFormValues>({
    resolver: zodResolver(createWebsiteSchema),
    defaultValues,
  });
  const managedDomainsQuery = useQuery({
    queryKey: ['managed-domains'],
    queryFn: getManagedDomains,
    enabled: open,
  });
  const combinedDomainSuggestions = [
    ...domainSuggestionSources,
    ...(managedDomainsQuery.data?.map((item) => item.domain) ?? []),
  ];

  const createMutation = useMutation({
    mutationFn: async (values: CreateWebsiteFormValues) => {
      const domains = linesFromTextarea(values.domains_text).map((item) =>
        item.toLowerCase(),
      );
      const { urls } = parseOriginUrls(values.origin_urls_text);
      const primaryOrigin = parseOriginUrl(urls[0]);

      return createProxyRoute({
        site_name: values.site_name.trim() || domains[0],
        domain: domains[0],
        domains,
        origin_id: null,
        origin_url: buildOriginUrl(
          primaryOrigin.scheme,
          primaryOrigin.address,
          primaryOrigin.port,
          primaryOrigin.uri,
        ),
        origin_scheme: primaryOrigin.scheme,
        origin_address: primaryOrigin.address,
        origin_port: primaryOrigin.port,
        origin_uri: primaryOrigin.uri,
        origin_host: '',
        upstreams: urls.slice(1),
        enabled: values.enabled,
        enable_https: false,
        cert_id: null,
        redirect_http: false,
        limit_conn_per_server: 0,
        limit_conn_per_ip: 0,
        limit_rate: '',
        cache_enabled: false,
        cache_policy: 'url',
        cache_rules: [],
        custom_headers: [],
        remark: values.remark.trim(),
      });
    },
    onSuccess: (route) => {
      form.reset(defaultValues);
      onOpenChange(false);
      onCreated(route);
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset(defaultValues);
    }
  }, [form, open]);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction="right"
      title="新建规则"
      footer={
        <div className="flex items-center justify-end gap-3">
          <PrimaryButton
            type="submit"
            form="create-website-form"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? '创建中...' : '创建'}
          </PrimaryButton>
        </div>
      }
    >
      <form
        id="create-website-form"
        className="space-y-5"
        onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
      >
        <ResourceField
          label="站点标识"
          hint="可选。留空时会自动使用第一个域名。"
          error={form.formState.errors.site_name?.message}
        >
          <ResourceInput
            {...form.register('site_name')}
            placeholder="marketing-site"
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
                suggestionSources={combinedDomainSuggestions}
              />
            )}
          />
        </ResourceField>

        <ResourceField
          label="上游地址"
          hint="每行一个完整 URL。第一行作为主回源，多上游模式下请保持相同协议且不要带 path/query。"
          error={form.formState.errors.origin_urls_text?.message}
        >
          <ResourceTextarea
            aria-label="上游地址"
            placeholder={'https://origin-a.internal:443\nhttps://origin-b.internal:443'}
            {...form.register('origin_urls_text')}
          />
        </ResourceField>

        <ToggleField
          label="创建后立即启用"
          description="关闭后网站会先以草稿形式保存，发布配置前仍可继续编辑。"
          checked={form.watch('enabled')}
          onChange={(checked) =>
            form.setValue('enabled', checked, { shouldDirty: true })
          }
        />

        <ResourceField
          label="备注"
          error={form.formState.errors.remark?.message}
        >
          <ResourceTextarea placeholder="" {...form.register('remark')} />
        </ResourceField>

        {createMutation.isError ? (
          <p className="text-sm text-[var(--status-danger-foreground)]">
            {getErrorMessage(createMutation.error)}
          </p>
        ) : null}
      </form>
    </Drawer>
  );
}
