'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { RankChart } from '@/components/data/rank-chart';
import { TrendChart } from '@/components/data/trend-chart';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { AppCard } from '@/components/ui/app-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { getDashboardOverview } from '@/features/dashboard/api/overview';
import type {
  DashboardAlert,
  DashboardNodeHealth,
  DashboardPeakNode,
} from '@/features/dashboard/types';
import { WorldStage } from '@/features/dashboard/components/world-stage';
import {
  getNodeStatusLabel,
  getNodeStatusVariant,
  getOpenrestyStatusLabel,
  getOpenrestyStatusVariant,
} from '@/features/nodes/utils';
import { formatDateTime, formatRelativeTime } from '@/lib/utils/date';

function formatPercent(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '—';
  }
  return `${value.toFixed(1)}%`;
}

function formatBytes(value?: number | null) {
  if (!value || value <= 0) {
    return '—';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let current = value;
  let index = 0;
  while (current >= 1024 && index < units.length - 1) {
    current /= 1024;
    index += 1;
  }
  return `${current.toFixed(current >= 100 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '请求失败，请稍后重试。';
}

function formatTrendHour(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return `${date.getHours().toString().padStart(2, '0')}:00`;
}

function formatPeakHour(value: string) {
  if (!value) {
    return '暂无';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '暂无';
  }
  return `${formatTrendHour(value)} - ${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

function getAlertVariant(
  alert: DashboardAlert,
): 'success' | 'warning' | 'danger' | 'info' {
  if (alert.status === 'resolved') {
    return 'success';
  }
  if (alert.severity === 'critical') {
    return 'danger';
  }
  if (alert.severity === 'warning') {
    return 'warning';
  }
  return 'info';
}

function formatPeakNode(node: DashboardPeakNode | null) {
  if (!node) {
    return {
      title: '暂无',
      hint: '当前没有可用节点数据',
    };
  }
  return {
    title: node.node_name,
    hint: `请求 ${node.request_count} · 错误 ${node.error_count} · CPU ${formatPercent(node.cpu_usage_percent)}`,
  };
}

function buildNodeDetailHref(id?: number | null) {
  if (!id) {
    return '/node';
  }
  return `/node/detail?id=${id}`;
}

function buildNodeRankItems(
  nodes: DashboardNodeHealth[],
  selector: (node: DashboardNodeHealth) => number,
  limit = 5,
) {
  return [...nodes]
    .sort((left, right) => {
      const leftValue = selector(left);
      const rightValue = selector(right);
      if (leftValue === rightValue) {
        return left.name.localeCompare(right.name, 'zh-CN');
      }
      return rightValue - leftValue;
    })
    .slice(0, limit)
    .filter((node) => selector(node) > 0)
    .map((node) => ({
      label: node.name,
      value: selector(node),
    }));
}

function OverviewMetric({
  label,
  value,
  hint,
  accent = 'sky',
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'sky' | 'amber' | 'emerald' | 'rose';
}) {
  const accentClass =
    accent === 'amber'
      ? 'from-amber-400/14 to-transparent'
      : accent === 'emerald'
        ? 'from-emerald-400/14 to-transparent'
        : accent === 'rose'
          ? 'from-rose-400/14 to-transparent'
          : 'from-sky-400/14 to-transparent';

  return (
    <div
      className={`rounded-3xl border border-[var(--border-default)] bg-[linear-gradient(180deg,var(--surface-elevated),var(--surface-card))] px-5 py-5 shadow-[var(--shadow-soft)]`}
    >
      <div className={`rounded-2xl bg-gradient-to-r ${accentClass} p-0.5`}>
        <div className="rounded-[15px] bg-transparent">
          <p className="text-xs tracking-[0.24em] text-[var(--foreground-muted)] uppercase">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold text-[var(--foreground-primary)]">
            {value}
          </p>
          {hint ? (
            <p className="mt-2 text-sm text-[var(--foreground-secondary)]">
              {hint}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RiskSignal({
  label,
  value,
  tone,
  hint,
  href,
}: {
  label: string;
  value: number;
  tone: 'danger' | 'warning' | 'info' | 'success';
  hint: string;
  href?: string;
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-rose-400/28 bg-rose-500/10 text-rose-100'
      : tone === 'warning'
        ? 'border-amber-400/28 bg-amber-500/10 text-amber-100'
        : tone === 'success'
          ? 'border-emerald-400/28 bg-emerald-500/10 text-emerald-100'
          : 'border-sky-400/28 bg-sky-500/10 text-sky-100';

  const content = (
    <div className={`rounded-3xl border px-4 py-4 ${toneClass}`}>
      <p className="text-xs tracking-[0.22em] opacity-75 uppercase">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm opacity-80">{hint}</p>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block transition hover:opacity-90">
      {content}
    </Link>
  );
}

function PeakCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 py-4">
      <p className="text-xs tracking-[0.22em] text-[var(--foreground-muted)] uppercase">
        {label}
      </p>
      <p className="mt-3 text-xl font-semibold text-[var(--foreground-primary)]">
        {value}
      </p>
      <p className="mt-2 text-sm text-[var(--foreground-secondary)]">{hint}</p>
    </div>
  );
  if (!href) {
    return content;
  }
  return (
    <Link
      href={href}
      className="block transition hover:[&_div]:border-[var(--border-strong)] hover:[&_div]:bg-[var(--surface-muted)]"
    >
      {content}
    </Link>
  );
}

function NodeHealthRow({ node }: { node: DashboardNodeHealth }) {
  return (
    <Link
      href={buildNodeDetailHref(node.id)}
      className="block rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 py-4 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground-primary)]">
            {node.name}
          </p>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">
            {node.node_id}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge
            label={getNodeStatusLabel(node.status)}
            variant={getNodeStatusVariant(node.status)}
          />
          <StatusBadge
            label={getOpenrestyStatusLabel(node.openresty_status)}
            variant={getOpenrestyStatusVariant(node.openresty_status)}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div>
          <p className="text-xs tracking-[0.2em] text-[var(--foreground-muted)] uppercase">
            CPU
          </p>
          <p className="mt-2 text-sm text-[var(--foreground-primary)]">
            {formatPercent(node.cpu_usage_percent)}
          </p>
        </div>
        <div>
          <p className="text-xs tracking-[0.2em] text-[var(--foreground-muted)] uppercase">
            内存
          </p>
          <p className="mt-2 text-sm text-[var(--foreground-primary)]">
            {formatPercent(node.memory_usage_percent)}
          </p>
        </div>
        <div>
          <p className="text-xs tracking-[0.2em] text-[var(--foreground-muted)] uppercase">
            最近窗口请求
          </p>
          <p className="mt-2 text-sm text-[var(--foreground-primary)]">
            {node.request_count.toLocaleString('zh-CN')}
          </p>
        </div>
        <div>
          <p className="text-xs tracking-[0.2em] text-[var(--foreground-muted)] uppercase">
            活动异常
          </p>
          <p className="mt-2 text-sm text-[var(--foreground-primary)]">
            {node.active_event_count}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--foreground-secondary)]">
        <p>当前版本：{node.current_version || '未应用'}</p>
        <p>
          最近心跳：
          {node.last_seen_at
            ? ` ${formatRelativeTime(node.last_seen_at)} · ${formatDateTime(node.last_seen_at)}`
            : ' 暂无'}
        </p>
      </div>
    </Link>
  );
}

export function DashboardOverview() {
  const overviewQuery = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: getDashboardOverview,
    refetchInterval: 10000,
  });

  if (overviewQuery.isLoading) {
    return <LoadingState />;
  }

  if (overviewQuery.isError) {
    return (
      <ErrorState
        title="总览看板加载失败"
        description={getErrorMessage(overviewQuery.error)}
      />
    );
  }

  const overview = overviewQuery.data;
  if (!overview) {
    return (
      <EmptyState
        title="暂无总览数据"
        description="系统已经启动，但还没有可展示的总览聚合结果。"
      />
    );
  }

  const nodeIdMap = new Map(
    overview.nodes.map((node) => [node.node_id, node.id] as const),
  );

  return (
    <div className="space-y-6">
      <WorldStage
        generatedAt={overview.generated_at}
        summary={overview.summary}
        risk={overview.risk}
        config={overview.config}
        nodes={overview.nodes}
        sourceCountries={overview.distributions.source_countries}
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <AppCard
          title="系统健康摘要"
          description="先回答系统是否健康、容量是否紧张、是否存在追平偏差和异常流量。"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <OverviewMetric
              label="在线节点"
              value={`${overview.summary.online_nodes}/${overview.summary.total_nodes}`}
              hint={`${overview.summary.offline_nodes} 离线 · ${overview.summary.pending_nodes} 待接入`}
              accent="sky"
            />
            <OverviewMetric
              label="活动异常"
              value={overview.summary.active_alerts}
              hint={`${overview.summary.unhealthy_nodes} 个 OpenResty 不健康`}
              accent="rose"
            />
            <OverviewMetric
              label="配置落后"
              value={overview.summary.lagging_nodes}
              hint={overview.config.active_version || '当前无激活版本'}
              accent="amber"
            />
            <OverviewMetric
              label="最近窗口请求"
              value={overview.traffic.request_count.toLocaleString('zh-CN')}
              hint={`QPS ${overview.traffic.estimated_qps.toFixed(1)} · UV ${overview.traffic.unique_visitors.toLocaleString('zh-CN')}`}
              accent="emerald"
            />
            <OverviewMetric
              label="平均 CPU"
              value={formatPercent(overview.capacity.average_cpu_usage_percent)}
              hint={`${overview.capacity.high_cpu_nodes} 个高 CPU 节点`}
              accent="amber"
            />
            <OverviewMetric
              label="平均内存"
              value={formatPercent(overview.capacity.average_memory_usage_percent)}
              hint={`${overview.capacity.high_memory_nodes} 个高内存节点`}
              accent="sky"
            />
          </div>
        </AppCard>

        <AppCard
          title="峰值与风险摘要"
          description="快速回答什么时候最忙、哪里最危险，以及首页能直接行动的入口。"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <PeakCard
              label="请求峰值时段"
              value={formatPeakHour(
                overview.peaks.peak_request_hour.bucket_started_at,
              )}
              hint={`峰值请求 ${overview.peaks.peak_request_hour.request_count.toLocaleString('zh-CN')}`}
            />
            <PeakCard
              label="错误峰值时段"
              value={formatPeakHour(
                overview.peaks.peak_error_hour.bucket_started_at,
              )}
              hint={`峰值错误 ${overview.peaks.peak_error_hour.error_count.toLocaleString('zh-CN')}`}
            />
            <PeakCard
              label="最忙节点"
              value={formatPeakNode(overview.peaks.busiest_node).title}
              hint={formatPeakNode(overview.peaks.busiest_node).hint}
              href={buildNodeDetailHref(
                nodeIdMap.get(overview.peaks.busiest_node?.node_id ?? ''),
              )}
            />
            <PeakCard
              label="优先排查节点"
              value={formatPeakNode(overview.peaks.riskiest_node).title}
              hint={formatPeakNode(overview.peaks.riskiest_node).hint}
              href={buildNodeDetailHref(
                nodeIdMap.get(overview.peaks.riskiest_node?.node_id ?? ''),
              )}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <RiskSignal
              label="Critical"
              value={overview.risk.critical_alerts}
              tone="danger"
              hint="当前仍在触发中的严重异常"
            />
            <RiskSignal
              label="Warning"
              value={overview.risk.warning_alerts}
              tone="warning"
              hint="需要尽快介入但尚未到故障级"
            />
            <RiskSignal
              label="配置落后"
              value={overview.risk.lagging_nodes}
              tone="info"
              hint="当前版本未追平全局激活配置"
              href="/node?risk=lagging"
            />
            <RiskSignal
              label="OpenResty 异常"
              value={overview.risk.unhealthy_nodes}
              tone="danger"
              hint="运行态已出现不健康节点"
              href="/node?risk=unhealthy"
            />
            <RiskSignal
              label="高 CPU / 内存"
              value={
                overview.risk.high_cpu_nodes + overview.risk.high_memory_nodes
              }
              tone="warning"
              hint={`${overview.risk.high_cpu_nodes} 个高 CPU · ${overview.risk.high_memory_nodes} 个高内存`}
            />
            <RiskSignal
              label="离线节点"
              value={overview.risk.offline_nodes}
              tone="warning"
              hint="节点长时间未心跳或已失联"
              href="/node?risk=offline"
            />
          </div>
        </AppCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AppCard
          title="24 小时请求趋势"
          description="观察整体请求量和错误量是否出现异常抬升。"
        >
          <TrendChart
            labels={overview.trends.traffic_24h.map((point) =>
              formatTrendHour(point.bucket_started_at),
            )}
            series={[
              {
                label: '请求量',
                color: '#f59e0b',
                fillColor: 'rgba(245, 158, 11, 0.18)',
                variant: 'area',
                values: overview.trends.traffic_24h.map(
                  (point) => point.request_count,
                ),
              },
              {
                label: '错误量',
                color: '#ef4444',
                values: overview.trends.traffic_24h.map(
                  (point) => point.error_count,
                ),
              },
            ]}
          />
        </AppCard>

        <AppCard
          title="24 小时容量趋势"
          description="按小时聚合 CPU 与内存使用率，判断整体容量是否持续紧张。"
        >
          <TrendChart
            labels={overview.trends.capacity_24h.map((point) =>
              formatTrendHour(point.bucket_started_at),
            )}
            series={[
              {
                label: '平均 CPU',
                color: '#0f766e',
                fillColor: 'rgba(15, 118, 110, 0.15)',
                variant: 'area',
                values: overview.trends.capacity_24h.map(
                  (point) => point.average_cpu_usage_percent,
                ),
                valueFormatter: formatPercent,
              },
              {
                label: '平均内存',
                color: '#2563eb',
                values: overview.trends.capacity_24h.map(
                  (point) => point.average_memory_usage_percent,
                ),
                valueFormatter: formatPercent,
              },
            ]}
          />
        </AppCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <AppCard
          title="24 小时网络与磁盘趋势"
          description="把 OpenResty 吞吐和磁盘读写放到同一屏，方便判断是流量拉升还是资源抖动。"
        >
          <div className="space-y-6">
            <TrendChart
              labels={overview.trends.network_24h.map((point) =>
                formatTrendHour(point.bucket_started_at),
              )}
              height={180}
              series={[
                {
                  label: 'OpenResty 入站',
                  color: '#22c55e',
                  fillColor: 'rgba(34, 197, 94, 0.14)',
                  variant: 'area',
                  values: overview.trends.network_24h.map(
                    (point) => point.openresty_rx_bytes,
                  ),
                  valueFormatter: formatBytes,
                },
                {
                  label: 'OpenResty 出站',
                  color: '#38bdf8',
                  values: overview.trends.network_24h.map(
                    (point) => point.openresty_tx_bytes,
                  ),
                  valueFormatter: formatBytes,
                },
              ]}
            />

            <TrendChart
              labels={overview.trends.disk_io_24h.map((point) =>
                formatTrendHour(point.bucket_started_at),
              )}
              height={180}
              series={[
                {
                  label: '磁盘读',
                  color: '#a78bfa',
                  fillColor: 'rgba(167, 139, 250, 0.14)',
                  variant: 'area',
                  values: overview.trends.disk_io_24h.map(
                    (point) => point.disk_read_bytes,
                  ),
                  valueFormatter: formatBytes,
                },
                {
                  label: '磁盘写',
                  color: '#fb7185',
                  values: overview.trends.disk_io_24h.map(
                    (point) => point.disk_write_bytes,
                  ),
                  valueFormatter: formatBytes,
                },
              ]}
            />
          </div>
        </AppCard>

        <AppCard
          title="活动异常"
          description="优先展示当前仍在触发中的问题。"
        >
          {overview.active_alerts.length === 0 ? (
            <EmptyState
              title="暂无活动异常"
              description="当前系统没有正在触发的节点健康事件。"
            />
          ) : (
            <div className="space-y-3">
              {overview.active_alerts.map((alert) => (
                <Link
                  key={`${alert.node_id}-${alert.event_type}-${alert.last_triggered_at}`}
                  href={buildNodeDetailHref(nodeIdMap.get(alert.node_id))}
                  className="block rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 py-4 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      label={alert.event_type.replaceAll('_', ' ')}
                      variant={getAlertVariant(alert)}
                    />
                    <p className="text-sm font-medium text-[var(--foreground-primary)]">
                      {alert.node_name}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-[var(--foreground-secondary)]">
                    {alert.message || '暂无详细消息'}
                  </p>
                  <p className="mt-2 text-xs text-[var(--foreground-muted)]">
                    {formatRelativeTime(alert.last_triggered_at)} ·{' '}
                    {formatDateTime(alert.last_triggered_at)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </AppCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <AppCard
          title="来源分布"
          description="聚合最近 24 小时主要来源国家，优先识别流量重心变化。"
        >
          <RankChart
            items={overview.distributions.source_countries.map((item) => ({
              label: item.key,
              value: item.value,
            }))}
            color="#38bdf8"
            emptyMessage="暂无来源分布数据"
          />
        </AppCard>

        <AppCard
          title="状态码分布"
          description="快速判断成功响应是否仍是主流，以及错误码是否有抬升。"
        >
          <RankChart
            items={overview.distributions.status_codes.map((item) => ({
              label: `HTTP ${item.key}`,
              value: item.value,
            }))}
            color="#f59e0b"
            emptyMessage="暂无状态码分布"
          />
        </AppCard>

        <AppCard
          title="Top Domain"
          description="观察主要流量集中在哪些域名，方便判断业务热度与异常集中点。"
        >
          <RankChart
            items={overview.distributions.top_domains.map((item) => ({
              label: item.key,
              value: item.value,
            }))}
            color="#34d399"
            emptyMessage="暂无域名分布"
          />
        </AppCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AppCard
          title="Top 节点榜单"
          description="把流量峰值、错误热点和容量压力节点并排展示，方便值守时快速判断先处理谁。"
        >
          <div className="grid gap-6 xl:grid-cols-3">
            <div>
              <p className="mb-3 text-xs tracking-[0.22em] text-[var(--foreground-muted)] uppercase">
                流量最高节点
              </p>
              <RankChart
                items={buildNodeRankItems(
                  overview.nodes,
                  (node) => node.request_count,
                )}
                color="#38bdf8"
                emptyMessage="暂无流量榜单"
              />
            </div>
            <div>
              <p className="mb-3 text-xs tracking-[0.22em] text-[var(--foreground-muted)] uppercase">
                错误热点节点
              </p>
              <RankChart
                items={buildNodeRankItems(
                  overview.nodes,
                  (node) => node.error_count,
                )}
                color="#f97316"
                emptyMessage="暂无错误热点"
              />
            </div>
            <div>
              <p className="mb-3 text-xs tracking-[0.22em] text-[var(--foreground-muted)] uppercase">
                容量压力节点
              </p>
              <RankChart
                items={buildNodeRankItems(
                  overview.nodes,
                  (node) =>
                    Math.round(
                      Math.max(
                        node.cpu_usage_percent,
                        node.memory_usage_percent,
                        node.storage_usage_percent,
                      ),
                    ),
                )}
                color="#ef4444"
                valueFormatter={(value) => `${value}%`}
                emptyMessage="暂无容量压力数据"
              />
            </div>
          </div>
        </AppCard>

        <AppCard
          title="处置建议"
          description="把首页信号翻译成可行动的下一步，降低值守判断成本。"
        >
          <div className="space-y-4">
            <div className="rounded-3xl border border-rose-400/18 bg-rose-500/8 px-4 py-4">
              <p className="text-xs tracking-[0.22em] text-rose-200 uppercase">
                第一优先级
              </p>
              <p className="mt-3 text-lg font-semibold text-[var(--foreground-primary)]">
                先处理活动异常与 OpenResty 不健康节点
              </p>
              <p className="mt-2 text-sm text-[var(--foreground-secondary)]">
                当前有 {overview.summary.active_alerts} 个活动异常，{` `}
                {overview.summary.unhealthy_nodes} 个 OpenResty 不健康节点。
              </p>
            </div>

            <div className="rounded-3xl border border-amber-400/18 bg-amber-500/8 px-4 py-4">
              <p className="text-xs tracking-[0.22em] text-amber-200 uppercase">
                第二优先级
              </p>
              <p className="mt-3 text-lg font-semibold text-[var(--foreground-primary)]">
                检查配置落后与容量逼近节点
              </p>
              <p className="mt-2 text-sm text-[var(--foreground-secondary)]">
                当前有 {overview.summary.lagging_nodes} 个配置落后节点，{` `}
                {overview.capacity.high_cpu_nodes +
                  overview.capacity.high_memory_nodes +
                  overview.capacity.high_storage_nodes}{' '}
                个节点出现明显容量压力。
              </p>
            </div>

            <div className="rounded-3xl border border-sky-400/18 bg-sky-500/8 px-4 py-4">
              <p className="text-xs tracking-[0.22em] text-sky-200 uppercase">
                观察项
              </p>
              <p className="mt-3 text-lg font-semibold text-[var(--foreground-primary)]">
                关注峰值时段与来源分布变化
              </p>
              <p className="mt-2 text-sm text-[var(--foreground-secondary)]">
                请求峰值出现在 {formatPeakHour(
                  overview.peaks.peak_request_hour.bucket_started_at,
                )}
                ，当前主要来源集中在
                {overview.distributions.source_countries
                  .slice(0, 2)
                  .map((item) => item.key)
                  .join(' / ') || ' 暂无来源数据'}
                。
              </p>
            </div>
          </div>
        </AppCard>
      </div>

      <AppCard
        title="节点健康列表"
        description="按异常数量和资源压力排序，优先显示最需要关注的节点。"
        action={
          <Link
            href="/node"
            className="inline-flex items-center rounded-full border border-[var(--border-default)] px-3 py-1.5 text-xs text-[var(--foreground-primary)] transition hover:bg-[var(--control-background-hover)]"
          >
            进入节点页
          </Link>
        }
      >
        {overview.nodes.length === 0 ? (
          <EmptyState
            title="暂无节点"
            description="节点接入后，这里会展示系统健康与容量摘要。"
          />
        ) : (
          <div className="space-y-4">
            {overview.nodes.slice(0, 8).map((node) => (
              <NodeHealthRow key={node.node_id} node={node} />
            ))}
          </div>
        )}
      </AppCard>
    </div>
  );
}
