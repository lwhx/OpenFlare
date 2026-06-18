import type {ApplyResult, NodeItem, NodeStatus, OpenrestyStatus} from '@/lib/services/openflare';

export const WS_CONNECTED_LAST_SEEN = '__OPENFLARE_WS_CONNECTED__';
export const FLARED_WS_CONNECTED_LAST_SEEN = '__OPENFLARE_FLARED_WS_CONNECTED__';

export type StatusTone = 'success' | 'warning' | 'danger' | 'info';

export function isWSConnectedLastSeen(value: string | null | undefined) {
  return value === WS_CONNECTED_LAST_SEEN || value === FLARED_WS_CONNECTED_LAST_SEEN;
}

export function isMeaningfulTime(value: string | null | undefined) {
  return (
    Boolean(value) &&
    !isWSConnectedLastSeen(value) &&
    !String(value).startsWith('0001-01-01')
  );
}

export function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} 天前`;

  return `${Math.floor(diffDays / 30)} 个月前`;
}

export function getNodeStatusTone(status: NodeStatus): StatusTone {
  if (status === 'online') return 'success';
  if (status === 'pending') return 'warning';
  return 'danger';
}

export function getNodeStatusLabel(status: NodeStatus) {
  if (status === 'online') return '在线';
  if (status === 'pending') return '待接入';
  return '离线';
}

export function getApplyTone(result: ApplyResult): StatusTone {
  if (result === 'success') return 'success';
  if (result === 'warning') return 'warning';
  if (result === 'failed') return 'danger';
  return 'warning';
}

export function getApplyLabel(result: ApplyResult) {
  if (result === 'success') return '成功';
  if (result === 'warning') return '警告';
  if (result === 'failed') return '失败';
  return '暂无';
}

export function getOpenrestyStatusTone(status: OpenrestyStatus): StatusTone {
  if (status === 'healthy') return 'success';
  if (status === 'unhealthy') return 'danger';
  return 'warning';
}

export function getOpenrestyStatusLabel(status: OpenrestyStatus) {
  if (status === 'healthy') return '健康';
  if (status === 'unhealthy') return '异常';
  return '未知';
}

export function getRelayStatusTone(status: string | null | undefined): StatusTone {
  if (status === 'healthy') return 'success';
  if (status === 'unhealthy') return 'danger';
  return 'warning';
}

export function getRelayStatusLabel(status: string | null | undefined) {
  if (status === 'healthy') return '健康';
  if (status === 'unhealthy') return '异常';
  return '未知';
}

export function getNodeTypeLabel(nodeType: NodeItem['node_type']) {
  if (nodeType === 'tunnel_relay') return 'Relay';
  if (nodeType === 'tunnel_client') return 'Tunnel';
  return 'Edge';
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '请求失败，请稍后重试。';
}
