'use client';

import {useMemo, useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {Loader2, Trash2} from 'lucide-react';
import {toast} from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {formatDateTime} from '@/lib/utils';
import {NodeService} from '@/lib/services/openflare';

import {NodeStatusBadge} from './node-status-badge';
import {
  formatBytes,
  formatRelativeTime,
  formatUptime,
  formatUsageRatio,
  getErrorMessage,
  getHealthEventLabel,
  getHealthEventTone,
  isMeaningfulTime,
} from './node-utils';

type HealthEventFilter = 'all' | 'active' | 'resolved';

function MetricBar({
  label,
  value,
  progress,
  hint,
}: {
  label: string;
  value: string;
  progress?: number | null;
  hint?: string;
}) {
  return (
    <div className="space-y-2 rounded-lg border px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <p className="text-sm font-medium">{value}</p>
      </div>
      {progress !== null && progress !== undefined ? (
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function NodeObservability({
  nodeId,
  connectionHint = '活动连接数',
}: {
  nodeId: number;
  connectionHint?: string;
}) {
  const queryClient = useQueryClient();
  const [healthEventFilter, setHealthEventFilter] = useState<HealthEventFilter>('all');
  const [cleanupOpen, setCleanupOpen] = useState(false);

  const observabilityQuery = useQuery({
    queryKey: ['openflare', 'node-observability', nodeId],
    queryFn: () => NodeService.getObservability(nodeId, { hours: 24, limit: 48 }),
    refetchInterval: 10000,
  });

  const cleanupMutation = useMutation({
    mutationFn: () => NodeService.cleanupHealthEvents(nodeId),
    onSuccess: async (result) => {
      toast.success(
        result.deleted_count > 0
          ? `已清理 ${result.deleted_count} 条健康事件日志`
          : '当前没有可清理的健康事件日志',
      );
      setCleanupOpen(false);
      await queryClient.invalidateQueries({
        queryKey: ['openflare', 'node-observability', nodeId],
      });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const observability = observabilityQuery.data ?? null;
  const profile = observability?.profile ?? null;
  const latestMetric = observability?.metric_snapshots?.[0] ?? null;
  const activeHealthEvents = useMemo(
    () => observability?.health_events.filter((event) => event.status === 'active') ?? [],
    [observability?.health_events],
  );
  const resolvedHealthEvents = useMemo(
    () => observability?.health_events.filter((event) => event.status === 'resolved') ?? [],
    [observability?.health_events],
  );
  const filteredHealthEvents = useMemo(() => {
    switch (healthEventFilter) {
      case 'active':
        return activeHealthEvents;
      case 'resolved':
        return resolvedHealthEvents;
      default:
        return observability?.health_events ?? [];
    }
  }, [activeHealthEvents, healthEventFilter, observability?.health_events, resolvedHealthEvents]);

  const memoryUsageRatio = formatUsageRatio(
    latestMetric?.memory_used_bytes,
    latestMetric?.memory_total_bytes,
  );
  const storageUsageRatio = formatUsageRatio(
    latestMetric?.storage_used_bytes,
    latestMetric?.storage_total_bytes,
  );

  if (observabilityQuery.isLoading) {
    return (
      <Card className="border-dashed shadow-none">
        <CardContent className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 mr-2 animate-spin" />
          加载运行观测数据中...
        </CardContent>
      </Card>
    );
  }

  if (observabilityQuery.isError) {
    return (
      <Card className="border-dashed shadow-none">
        <CardContent className="py-6">
          <p className="text-sm text-destructive">{getErrorMessage(observabilityQuery.error)}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-dashed shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>运行诊断</CardDescription>
            <CardTitle className="text-base font-semibold">
              {activeHealthEvents.length ? `${activeHealthEvents.length} 个活动异常` : '运行稳定'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-dashed shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>系统核心</CardDescription>
            <CardTitle className="text-base font-semibold">
              {profile?.hostname || '—'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-dashed shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>在线时长</CardDescription>
            <CardTitle className="text-base font-semibold">
              {formatUptime(profile?.uptime_seconds)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-dashed shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-semibold">系统画像</CardTitle>
            <CardDescription>节点上报的主机与硬件信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {profile ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">操作系统</span>
                  <span>
                    {profile.os_name || 'unknown'}
                    {profile.os_version ? ` ${profile.os_version}` : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">内核 / 架构</span>
                  <span>
                    {profile.kernel_version || 'unknown'} · {profile.architecture || 'unknown'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">CPU</span>
                  <span>
                    {profile.cpu_model || 'unknown'}（{profile.cpu_cores || 0} 核）
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">总内存</span>
                  <span>{formatBytes(profile.total_memory_bytes)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">总存储</span>
                  <span>{formatBytes(profile.total_disk_bytes)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">上报时间</span>
                  <span>
                    {isMeaningfulTime(profile.reported_at)
                      ? formatDateTime(profile.reported_at)
                      : '—'}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">节点已接入，但尚未上报完整系统画像。</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-dashed shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-semibold">实时资源快照</CardTitle>
            <CardDescription>最近一次 metrics 上报</CardDescription>
          </CardHeader>
          <CardContent>
            {latestMetric ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <MetricBar
                  label="CPU"
                  value={`${latestMetric.cpu_usage_percent.toFixed(1)}%`}
                  progress={latestMetric.cpu_usage_percent}
                  hint={
                    isMeaningfulTime(latestMetric.captured_at)
                      ? `快照 ${formatRelativeTime(latestMetric.captured_at)}`
                      : undefined
                  }
                />
                <MetricBar
                  label="内存"
                  value={`${formatBytes(latestMetric.memory_used_bytes)} / ${formatBytes(latestMetric.memory_total_bytes)}`}
                  progress={memoryUsageRatio}
                />
                <MetricBar
                  label="存储"
                  value={`${formatBytes(latestMetric.storage_used_bytes)} / ${formatBytes(latestMetric.storage_total_bytes)}`}
                  progress={storageUsageRatio}
                />
                <MetricBar
                  label="活动连接"
                  value={
                    latestMetric.openresty_connections
                      ? String(latestMetric.openresty_connections)
                      : '—'
                  }
                  progress={null}
                  hint={connectionHint}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">节点已接入，但尚未上报资源快照。</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base font-semibold">健康事件时间线</CardTitle>
            <CardDescription>保留活动与已恢复事件，用于运行异常诊断</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive"
            disabled={cleanupMutation.isPending || !observability?.health_events.length}
            onClick={() => setCleanupOpen(true)}
          >
            <Trash2 className="size-3.5 mr-1" />
            清理日志
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {observability?.health_events.length ? (
            <>
              <div className="flex flex-wrap gap-2">
                {(['all', 'active', 'resolved'] as const).map((filter) => (
                  <Button
                    key={filter}
                    type="button"
                    variant={healthEventFilter === filter ? 'secondary' : 'outline'}
                    size="sm"
                    className="h-7 text-xs rounded-full"
                    onClick={() => setHealthEventFilter(filter)}
                  >
                    {filter === 'all' ? '全部' : filter === 'active' ? '活动中' : '已恢复'}
                  </Button>
                ))}
              </div>

              {filteredHealthEvents.slice(0, 8).map((event) => (
                <div key={`${event.event_type}-${event.last_triggered_at}-${event.status}`} className="rounded-lg border px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <NodeStatusBadge
                      label={getHealthEventLabel(event)}
                      tone={getHealthEventTone(event)}
                    />
                    <NodeStatusBadge
                      label={event.status === 'active' ? '活动中' : '已恢复'}
                      tone={event.status === 'active' ? 'warning' : 'success'}
                    />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {event.message || '暂无详细消息'}
                  </p>
                  <div className="mt-2 grid gap-1 text-xs text-muted-foreground md:grid-cols-3">
                    <p>
                      首次触发：
                      {isMeaningfulTime(event.first_triggered_at)
                        ? ` ${formatDateTime(event.first_triggered_at)}`
                        : ' —'}
                    </p>
                    <p>
                      最近触发：
                      {isMeaningfulTime(event.last_triggered_at)
                        ? ` ${formatDateTime(event.last_triggered_at)}`
                        : ' —'}
                    </p>
                    <p>
                      恢复时间：
                      {isMeaningfulTime(event.resolved_at) && event.resolved_at
                        ? ` ${formatDateTime(event.resolved_at)}`
                        : ' —'}
                    </p>
                  </div>
                </div>
              ))}

              {filteredHealthEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">当前筛选下没有健康事件。</p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">节点当前还没有上报健康事件记录。</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={cleanupOpen} onOpenChange={setCleanupOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>清理健康事件日志</AlertDialogTitle>
            <AlertDialogDescription>
              该操作会删除此节点在控制端记录的所有健康诊断事件历史，不会影响后续新事件上报。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cleanupMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={cleanupMutation.isPending}
              onClick={() => cleanupMutation.mutate()}
            >
              {cleanupMutation.isPending ? '清理中...' : '确认清理'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}