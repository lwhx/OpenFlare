'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { InlineMessage } from '@/components/feedback/inline-message';
import { LoadingState } from '@/components/feedback/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { AppModal } from '@/components/ui/app-modal';
import { AppCard } from '@/components/ui/app-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { getConfigVersions } from '@/features/config-versions/api/config-versions';
import {
  createNode,
  deleteNode,
  getNodes,
  updateNode,
} from '@/features/nodes/api/nodes';
import type { NodeMutationPayload } from '@/features/nodes/types';
import {
  DangerButton,
  PrimaryButton,
  ResourceField,
  ResourceInput,
  SecondaryButton,
  ToggleField,
} from '@/features/shared/components/resource-primitives';
import { formatDateTime, formatRelativeTime } from '@/lib/utils/date';
import {
  getApplyLabel,
  getApplyVariant,
  getNodeStatusLabel,
  getNodeStatusVariant,
  getOpenrestyStatusLabel,
  getOpenrestyStatusVariant,
  isMeaningfulTime,
} from '@/features/nodes/utils';

const nodesQueryKey = ['nodes'];
const supportedRiskFilters = [
  'all',
  'offline',
  'unhealthy',
  'lagging',
] as const;

type NodeRiskFilter = (typeof supportedRiskFilters)[number];

const nodeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '请输入节点名')
    .max(128, '节点名不能超过 128 个字符'),
  auto_update_enabled: z.boolean(),
  geo_name: z.string().trim().max(128, '位置名不能超过 128 个字符'),
  geo_latitude: z.string().trim(),
  geo_longitude: z.string().trim(),
}).superRefine((values, ctx) => {
  const hasLatitude = values.geo_latitude !== '';
  const hasLongitude = values.geo_longitude !== '';

  if (hasLatitude !== hasLongitude) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['geo_latitude'],
      message: '纬度和经度需要同时填写',
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['geo_longitude'],
      message: '纬度和经度需要同时填写',
    });
    return;
  }

  if (hasLatitude) {
    const latitude = Number(values.geo_latitude);
    if (Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['geo_latitude'],
        message: '纬度必须在 -90 到 90 之间',
      });
    }
  }

  if (hasLongitude) {
    const longitude = Number(values.geo_longitude);
    if (Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['geo_longitude'],
        message: '经度必须在 -180 到 180 之间',
      });
    }
  }
});

type NodeFormValues = z.infer<typeof nodeSchema>;

type FeedbackState = {
  tone: 'info' | 'success' | 'danger';
  message: string;
};

const defaultValues: NodeFormValues = {
  name: '',
  auto_update_enabled: false,
  geo_name: '',
  geo_latitude: '',
  geo_longitude: '',
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '请求失败，请稍后重试。';
}

function toPayload(values: NodeFormValues): NodeMutationPayload {
  return {
    name: values.name.trim(),
    auto_update_enabled: values.auto_update_enabled,
    geo_name: values.geo_name.trim(),
    geo_latitude:
      values.geo_latitude.trim() === '' ? null : Number(values.geo_latitude),
    geo_longitude:
      values.geo_longitude.trim() === '' ? null : Number(values.geo_longitude),
  };
}

export function NodesPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<number | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const form = useForm<NodeFormValues>({
    resolver: zodResolver(nodeSchema),
    defaultValues,
  });

  const watchedAutoUpdate = useWatch({
    control: form.control,
    name: 'auto_update_enabled',
  });

  const nodesQuery = useQuery({
    queryKey: nodesQueryKey,
    queryFn: getNodes,
    refetchInterval: 5000,
  });

  const configVersionsQuery = useQuery({
    queryKey: ['config-versions'],
    queryFn: getConfigVersions,
    refetchInterval: 5000,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: NodeFormValues) => {
      const payload = toPayload(values);
      return editingNodeId
        ? updateNode(editingNodeId, payload)
        : createNode(payload);
    },
    onSuccess: async () => {
      setFeedback({
        tone: 'success',
        message: editingNodeId ? '节点已更新。' : '节点已创建。',
      });
      setEditingNodeId(null);
      setIsEditorOpen(false);
      form.reset(defaultValues);
      await queryClient.invalidateQueries({ queryKey: nodesQueryKey });
    },
    onError: (error) => {
      setFeedback({ tone: 'danger', message: getErrorMessage(error) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNode,
    onSuccess: async () => {
      setFeedback({ tone: 'success', message: '节点已删除。' });
      setEditingNodeId(null);
      form.reset(defaultValues);
      await queryClient.invalidateQueries({ queryKey: nodesQueryKey });
    },
    onError: (error) => {
      setFeedback({ tone: 'danger', message: getErrorMessage(error) });
    },
  });

  const nodes = useMemo(() => nodesQuery.data ?? [], [nodesQuery.data]);
  const activeVersion = useMemo(
    () =>
      (configVersionsQuery.data ?? []).find((item) => item.is_active)
        ?.version ?? '',
    [configVersionsQuery.data],
  );
  const riskFilter = useMemo<NodeRiskFilter>(() => {
    const current = searchParams.get('risk')?.trim().toLowerCase() ?? 'all';
    return supportedRiskFilters.includes(current as NodeRiskFilter)
      ? (current as NodeRiskFilter)
      : 'all';
  }, [searchParams]);
  const filteredNodes = useMemo(() => {
    switch (riskFilter) {
      case 'offline':
        return nodes.filter((node) => node.status === 'offline');
      case 'unhealthy':
        return nodes.filter((node) => node.openresty_status === 'unhealthy');
      case 'lagging':
        return nodes.filter((node) => {
          if (!activeVersion) {
            return false;
          }
          return node.current_version !== activeVersion;
        });
      default:
        return nodes;
    }
  }, [activeVersion, nodes, riskFilter]);

  const filterDescription = useMemo(() => {
    switch (riskFilter) {
      case 'offline':
        return '当前仅展示离线节点。';
      case 'unhealthy':
        return '当前仅展示 OpenResty 异常节点。';
      case 'lagging':
        return activeVersion
          ? `当前仅展示未追平激活版本 ${activeVersion} 的节点。`
          : '当前没有激活版本，无法筛选配置落后节点。';
      default:
        return '列表每 5 秒自动刷新一次。';
    }
  }, [activeVersion, riskFilter]);

  const handleReset = () => {
    setFeedback(null);
    setEditingNodeId(null);
    setIsEditorOpen(false);
    form.reset(defaultValues);
  };

  const handleCreate = () => {
    setFeedback(null);
    setEditingNodeId(null);
    form.reset(defaultValues);
    setIsEditorOpen(true);
  };

  const handleEdit = (
    nodeId: number,
    name: string,
    autoUpdateEnabled: boolean,
    geoName: string,
    geoLatitude?: number | null,
    geoLongitude?: number | null,
  ) => {
    setFeedback(null);
    setEditingNodeId(nodeId);
    form.reset({
      name,
      auto_update_enabled: autoUpdateEnabled,
      geo_name: geoName,
      geo_latitude:
        geoLatitude === undefined || geoLatitude === null
          ? ''
          : String(geoLatitude),
      geo_longitude:
        geoLongitude === undefined || geoLongitude === null
          ? ''
          : String(geoLongitude),
    });
    setIsEditorOpen(true);
  };

  const handleDelete = (nodeId: number, nodeName: string) => {
    if (
      !window.confirm(
        `确认删除节点“${nodeName}”吗？删除后该节点需要重新创建并重新接入。`,
      )
    ) {
      return;
    }

    setFeedback(null);
    deleteMutation.mutate(nodeId);
  };

  const handleSubmit = form.handleSubmit((values) => {
    setFeedback(null);
    saveMutation.mutate(values);
  });

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="节点管理"
          description="节点列表只保留状态、版本与最近活动等关键内容。节点部署、Token、更新模式与手动升级入口统一收敛到详情页。"
          action={
            <>
              <SecondaryButton type="button" onClick={handleCreate}>
                新增节点
              </SecondaryButton>
              <Link
                href="/apply-log"
                className="inline-flex items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--control-background)] px-4 py-3 text-sm font-medium text-[var(--foreground-primary)] transition hover:bg-[var(--control-background-hover)]"
              >
                应用记录
              </Link>
            </>
          }
        />

        {feedback ? (
          <InlineMessage tone={feedback.tone} message={feedback.message} />
        ) : null}

        <AppCard
          title="节点列表"
          description={filterDescription}
          action={
            <SecondaryButton
              type="button"
              onClick={() =>
                void queryClient.invalidateQueries({ queryKey: nodesQueryKey })
              }
            >
              立即刷新
            </SecondaryButton>
          }
        >
          {nodesQuery.isLoading ? (
            <LoadingState />
          ) : nodesQuery.isError ? (
            <ErrorState
              title="节点列表加载失败"
              description={getErrorMessage(nodesQuery.error)}
            />
          ) : filteredNodes.length === 0 ? (
            <EmptyState
              title={riskFilter === 'all' ? '暂无节点' : '当前筛选无结果'}
              description={
                riskFilter === 'all'
                  ? '请先创建一个节点，然后进入详情页查看专属部署命令。'
                  : '可以返回总览继续排查，或切换到全部节点查看完整列表。'
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/node"
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs transition ${
                    riskFilter === 'all'
                      ? 'border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--foreground-primary)]'
                      : 'border-[var(--border-default)] text-[var(--foreground-secondary)] hover:bg-[var(--control-background-hover)]'
                  }`}
                >
                  全部节点
                </Link>
                <Link
                  href="/node?risk=offline"
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs transition ${
                    riskFilter === 'offline'
                      ? 'border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--foreground-primary)]'
                      : 'border-[var(--border-default)] text-[var(--foreground-secondary)] hover:bg-[var(--control-background-hover)]'
                  }`}
                >
                  离线节点
                </Link>
                <Link
                  href="/node?risk=unhealthy"
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs transition ${
                    riskFilter === 'unhealthy'
                      ? 'border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--foreground-primary)]'
                      : 'border-[var(--border-default)] text-[var(--foreground-secondary)] hover:bg-[var(--control-background-hover)]'
                  }`}
                >
                  OpenResty 异常
                </Link>
                <Link
                  href="/node?risk=lagging"
                  className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs transition ${
                    riskFilter === 'lagging'
                      ? 'border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--foreground-primary)]'
                      : 'border-[var(--border-default)] text-[var(--foreground-secondary)] hover:bg-[var(--control-background-hover)]'
                  }`}
                >
                  配置落后
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--border-default)] text-left text-sm">
                  <thead>
                    <tr className="text-[var(--foreground-secondary)]">
                      <th className="px-3 py-3 font-medium">节点</th>
                      <th className="px-3 py-3 font-medium">状态</th>
                      <th className="px-3 py-3 font-medium">
                        Agent / OpenResty
                      </th>
                      <th className="px-3 py-3 font-medium">运行健康</th>
                      <th className="px-3 py-3 font-medium">当前版本</th>
                      <th className="px-3 py-3 font-medium">最近应用</th>
                      <th className="px-3 py-3 font-medium">最近心跳</th>
                      <th className="px-3 py-3 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {filteredNodes.map((node) => (
                      <tr key={node.id} className="align-top">
                        <td className="px-3 py-4">
                          <div className="space-y-1">
                            <p className="font-medium text-[var(--foreground-primary)]">
                              {node.name}
                            </p>
                            <p className="text-xs text-[var(--foreground-secondary)]">
                              IP：{node.ip || 'null'}
                            </p>
                            <p className="text-xs text-[var(--foreground-secondary)]">
                              位置：{node.geo_name || '未配置地图点位'}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <StatusBadge
                            label={getNodeStatusLabel(node.status)}
                            variant={getNodeStatusVariant(node.status)}
                          />
                        </td>
                        <td className="px-3 py-4 text-[var(--foreground-secondary)]">
                          {node.agent_version || 'unknown'} /{' '}
                          {node.nginx_version || 'unknown'}
                        </td>
                        <td className="px-3 py-4">
                          <div className="space-y-2">
                            <StatusBadge
                              label={getOpenrestyStatusLabel(
                                node.openresty_status,
                              )}
                              variant={getOpenrestyStatusVariant(
                                node.openresty_status,
                              )}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-4 text-[var(--foreground-secondary)]">
                          {node.current_version || '未应用'}
                        </td>
                        <td className="px-3 py-4">
                          <div className="space-y-2">
                            <StatusBadge
                              label={getApplyLabel(node.latest_apply_result)}
                              variant={getApplyVariant(
                                node.latest_apply_result,
                              )}
                            />
                          </div>
                        </td>
                        <td className="px-3 py-4 text-[var(--foreground-secondary)]">
                          {isMeaningfulTime(node.last_seen_at)
                            ? `${formatRelativeTime(
                                node.last_seen_at,
                              )} · ${formatDateTime(node.last_seen_at)}`
                            : '暂无'}
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/node/detail?id=${node.id}`}
                              className="inline-flex items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--control-background)] px-3 py-2 text-xs font-medium text-[var(--foreground-primary)] transition hover:bg-[var(--control-background-hover)]"
                            >
                              详情
                            </Link>
                            <SecondaryButton
                              type="button"
                              onClick={() =>
                                handleEdit(
                                  node.id,
                                  node.name,
                                  node.auto_update_enabled,
                                  node.geo_name,
                                  node.geo_latitude,
                                  node.geo_longitude,
                                )
                              }
                              className="px-3 py-2 text-xs"
                            >
                              编辑
                            </SecondaryButton>
                            <DangerButton
                              type="button"
                              onClick={() => handleDelete(node.id, node.name)}
                              disabled={deleteMutation.isPending}
                              className="px-3 py-2 text-xs"
                            >
                              删除
                            </DangerButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </AppCard>
      </div>
      <AppModal
        isOpen={isEditorOpen}
        onClose={handleReset}
        title={editingNodeId ? '编辑节点' : '新增节点'}
        description="预创建节点后可在详情页查看专属 Token、部署命令与更新控制。"
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <SecondaryButton
              type="button"
              onClick={handleReset}
              disabled={saveMutation.isPending}
            >
              取消
            </SecondaryButton>
            <PrimaryButton
              type="submit"
              form="node-editor-form"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending
                ? '保存中...'
                : editingNodeId
                  ? '保存修改'
                  : '新增节点'}
            </PrimaryButton>
          </div>
        }
      >
        <form
          id="node-editor-form"
          className="space-y-5"
          onSubmit={handleSubmit}
        >
          <ResourceField
            label="节点名"
            hint="示例：shanghai-edge-1"
            error={form.formState.errors.name?.message}
          >
            <ResourceInput
              placeholder="shanghai-edge-1"
              {...form.register('name')}
            />
          </ResourceField>

          <ToggleField
            label="启用自动更新"
            description="开启后 Agent 心跳返回会提示节点自动执行自更新。"
            checked={watchedAutoUpdate}
            onChange={(checked) =>
              form.setValue('auto_update_enabled', checked, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />

          <ResourceField
            label="地图位置名"
            hint="示例：Shanghai / Tokyo / Frankfurt，可用于总览世界板标注。"
            error={form.formState.errors.geo_name?.message}
          >
            <ResourceInput
              placeholder="Shanghai"
              {...form.register('geo_name')}
            />
          </ResourceField>

          <div className="grid gap-5 md:grid-cols-2">
            <ResourceField
              label="纬度"
              hint="范围 -90 到 90，例如上海约为 31.2304"
              error={form.formState.errors.geo_latitude?.message}
            >
              <ResourceInput
                placeholder="31.2304"
                {...form.register('geo_latitude')}
              />
            </ResourceField>

            <ResourceField
              label="经度"
              hint="范围 -180 到 180，例如上海约为 121.4737"
              error={form.formState.errors.geo_longitude?.message}
            >
              <ResourceInput
                placeholder="121.4737"
                {...form.register('geo_longitude')}
              />
            </ResourceField>
          </div>
        </form>
      </AppModal>
    </>
  );
}
