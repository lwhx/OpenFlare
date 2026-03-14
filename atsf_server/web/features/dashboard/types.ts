export interface DashboardSummary {
  total_nodes: number;
  online_nodes: number;
  offline_nodes: number;
  pending_nodes: number;
  unhealthy_nodes: number;
  active_alerts: number;
  lagging_nodes: number;
}

export interface DashboardTraffic {
  request_count: number;
  unique_visitors: number;
  error_count: number;
  estimated_qps: number;
  reported_nodes: number;
}

export interface DashboardCapacity {
  average_cpu_usage_percent: number;
  average_memory_usage_percent: number;
  high_cpu_nodes: number;
  high_memory_nodes: number;
  high_storage_nodes: number;
}

export interface DashboardConfig {
  active_version: string;
  lagging_nodes: number;
  pending_nodes: number;
}

export interface DashboardRiskSummary {
  critical_alerts: number;
  warning_alerts: number;
  info_alerts: number;
  offline_nodes: number;
  unhealthy_nodes: number;
  lagging_nodes: number;
  high_cpu_nodes: number;
  high_memory_nodes: number;
  high_storage_nodes: number;
}

export interface DashboardPeakHour {
  bucket_started_at: string;
  request_count: number;
  error_count: number;
}

export interface DashboardPeakNode {
  node_id: string;
  node_name: string;
  request_count: number;
  error_count: number;
  cpu_usage_percent: number;
  active_event_count: number;
  openresty_status: 'healthy' | 'unhealthy' | 'unknown';
  storage_usage_percent: number;
}

export interface DashboardPeakSummary {
  peak_request_hour: DashboardPeakHour;
  peak_error_hour: DashboardPeakHour;
  busiest_node: DashboardPeakNode | null;
  riskiest_node: DashboardPeakNode | null;
}

export interface DistributionItem {
  key: string;
  value: number;
}

export interface TrafficTrendPoint {
  bucket_started_at: string;
  request_count: number;
  error_count: number;
  unique_visitor_count: number;
}

export interface CapacityTrendPoint {
  bucket_started_at: string;
  average_cpu_usage_percent: number;
  average_memory_usage_percent: number;
  reported_nodes: number;
}

export interface NetworkTrendPoint {
  bucket_started_at: string;
  network_rx_bytes: number;
  network_tx_bytes: number;
  openresty_rx_bytes: number;
  openresty_tx_bytes: number;
  reported_nodes: number;
}

export interface DiskIOTrendPoint {
  bucket_started_at: string;
  disk_read_bytes: number;
  disk_write_bytes: number;
  reported_nodes: number;
}

export interface TrafficDistributions {
  status_codes: DistributionItem[];
  top_domains: DistributionItem[];
  source_countries: DistributionItem[];
}

export interface DashboardTrends {
  traffic_24h: TrafficTrendPoint[];
  capacity_24h: CapacityTrendPoint[];
  network_24h: NetworkTrendPoint[];
  disk_io_24h: DiskIOTrendPoint[];
}

export interface DashboardNodeHealth {
  id: number;
  node_id: string;
  name: string;
  status: 'online' | 'offline' | 'pending';
  openresty_status: 'healthy' | 'unhealthy' | 'unknown';
  current_version: string;
  last_seen_at: string;
  active_event_count: number;
  cpu_usage_percent: number;
  memory_usage_percent: number;
  storage_usage_percent: number;
  request_count: number;
  error_count: number;
  unique_visitor_count: number;
}

export interface DashboardAlert {
  node_id: string;
  node_name: string;
  event_type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  last_triggered_at: string;
  status: 'active' | 'resolved';
}

export interface DashboardOverview {
  generated_at: string;
  summary: DashboardSummary;
  traffic: DashboardTraffic;
  capacity: DashboardCapacity;
  config: DashboardConfig;
  risk: DashboardRiskSummary;
  peaks: DashboardPeakSummary;
  distributions: TrafficDistributions;
  trends: DashboardTrends;
  nodes: DashboardNodeHealth[];
  active_alerts: DashboardAlert[];
}
