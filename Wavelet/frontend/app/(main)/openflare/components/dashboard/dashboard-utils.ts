export function formatTrendHour(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return `${date.getHours().toString().padStart(2, '0')}:00`;
}

export function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return `${value.toFixed(1)}%`;
}

export function formatCompactNumber(value: number) {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return value.toLocaleString('zh-CN');
}