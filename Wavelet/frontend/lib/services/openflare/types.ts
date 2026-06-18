/**
 * OpenFlare 遗留业务 API 响应信封
 * 阶段一 `/api/*` 端点使用此格式，与 Wavelet `/api/v1/*` 的 `{error_msg,data}` 不同
 */
export interface LegacyApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export type ReleaseChannel = 'stable' | 'preview';

export type NodeType = 'edge_node' | 'tunnel_relay' | 'tunnel_client';

export type NodeStatus = 'online' | 'offline' | 'pending';

export type OpenrestyStatus = 'healthy' | 'unhealthy' | 'unknown';

export type ApplyResult = 'success' | 'warning' | 'failed' | '';

export interface NodeItem {
  id: number;
  node_id: string;
  node_type: NodeType;
  name: string;
  ip: string;
  ip_manual_override: boolean;
  relay_bind_port: number;
  relay_vhost_http_port: number;
  relay_client_access_addr: string;
  relay_agent_access_addr: string;
  relay_client_proxy_url: string;
  relay_auth_token: string;
  relay_status: string;
  relay_web_server_enabled: boolean;
  relay_frps_connections: number;
  relay_frps_proxy_count: number;
  geo_name: string;
  geo_latitude?: number | null;
  geo_longitude?: number | null;
  geo_manual_override: boolean;
  access_token: string;
  auto_update_enabled: boolean;
  update_requested: boolean;
  update_channel: ReleaseChannel;
  update_tag: string;
  restart_openresty_requested: boolean;
  version: string;
  ext_version: string;
  openresty_status: OpenrestyStatus;
  openresty_message: string;
  status: NodeStatus;
  current_version: string;
  last_seen_at: string;
  last_error: string;
  latest_apply_result: ApplyResult;
  latest_apply_message: string;
  latest_apply_checksum: string;
  latest_main_config_checksum: string;
  latest_route_config_checksum: string;
  latest_support_file_count: number;
  latest_apply_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NodeBootstrapToken {
  discovery_token: string;
}

export interface NodeMutationPayload {
  node_type: NodeType;
  name: string;
  ip: string;
  ip_manual_override: boolean;
  relay_bind_port?: number;
  relay_vhost_http_port?: number;
  relay_client_access_addr?: string;
  relay_agent_access_addr?: string;
  relay_client_proxy_url?: string;
  relay_web_server_enabled?: boolean;
  auto_update_enabled: boolean;
  geo_name: string;
  geo_latitude?: number | null;
  geo_longitude?: number | null;
  geo_manual_override: boolean;
}

export interface NodeAgentReleaseInfo {
  tag_name: string;
  body: string;
  html_url: string;
  published_at: string;
  current_version: string;
  has_update: boolean;
  channel: ReleaseChannel;
  prerelease: boolean;
  update_requested: boolean;
  requested_channel: ReleaseChannel;
  requested_tag: string;
}

export interface NodeAgentUpdatePayload {
  channel?: ReleaseChannel;
  tag_name?: string;
}

export interface NodeSystemProfile {
  hostname: string;
  os_name: string;
  os_version: string;
  kernel_version: string;
  architecture: string;
  cpu_model: string;
  cpu_cores: number;
  total_memory_bytes: number;
  total_disk_bytes: number;
  uptime_seconds: number;
  reported_at: string;
}

export interface NodeMetricSnapshot {
  captured_at: string;
  cpu_usage_percent: number;
  memory_used_bytes: number;
  memory_total_bytes: number;
  storage_used_bytes: number;
  storage_total_bytes: number;
  disk_read_bytes: number;
  disk_write_bytes: number;
  network_rx_bytes: number;
  network_tx_bytes: number;
  openresty_rx_bytes: number;
  openresty_tx_bytes: number;
  openresty_connections: number;
}

export interface NodeHealthEvent {
  event_type: string;
  severity: string;
  status: string;
  message: string;
  metadata_json?: string;
  first_triggered_at: string;
  last_triggered_at: string;
  reported_at: string;
  resolved_at?: string | null;
}

export interface NodeObservability {
  node_id: string;
  profile: NodeSystemProfile | null;
  metric_snapshots: NodeMetricSnapshot[];
  health_events: NodeHealthEvent[];
}

export type ProxyRouteConfigSection =
  | 'domains'
  | 'limits'
  | 'proxy'
  | 'cache'
  | 'waf'
  | 'auth';

export interface ProxyRouteCustomHeader {
  key: string;
  value: string;
}

export interface ProxyRoutePoWListConfig {
  ips: string[];
  ip_cidrs: string[];
  paths: string[];
  path_regexes: string[];
  user_agents: string[];
}

export interface ProxyRoutePoWConfig {
  difficulty: number;
  algorithm: 'fast' | 'slow';
  session_ttl: number;
  challenge_ttl: number;
  whitelist: ProxyRoutePoWListConfig;
  blacklist: ProxyRoutePoWListConfig;
}

export interface ProxyRouteItem {
  id: number;
  site_name: string;
  domain: string;
  domains: string[];
  primary_domain: string;
  domain_count: number;
  origin_id: number | null;
  origin_url: string;
  origin_host: string;
  upstreams: string;
  upstream_list: string[];
  enabled: boolean;
  enable_https: boolean;
  cert_id: number | null;
  cert_ids: number[];
  domain_cert_ids: number[];
  redirect_http: boolean;
  limit_conn_per_server: number;
  limit_conn_per_ip: number;
  limit_rate: string;
  cache_enabled: boolean;
  cache_policy: string;
  cache_rules: string;
  cache_rule_list: string[];
  custom_headers: string;
  custom_header_list: ProxyRouteCustomHeader[];
  pow_enabled: boolean;
  pow_config: ProxyRoutePoWConfig;
  basic_auth_enabled: boolean;
  basic_auth_username: string;
  basic_auth_password: string;
  remark: string;
  upstream_type: 'direct' | 'tunnel' | 'pages';
  tunnel_node_id?: number | null;
  tunnel_id?: number | null;
  tunnel_target_addr?: string;
  tunnel_target_protocol?: string;
  pages_project_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProxyRouteMutationPayload {
  site_name?: string;
  domain: string;
  domains?: string[];
  origin_id: number | null;
  origin_url: string;
  origin_scheme: 'http' | 'https';
  origin_address: string;
  origin_port: string;
  origin_uri: string;
  origin_host: string;
  upstreams: string[];
  enabled: boolean;
  enable_https: boolean;
  cert_id: number | null;
  cert_ids?: number[];
  domain_cert_ids?: number[];
  redirect_http: boolean;
  limit_conn_per_server?: number;
  limit_conn_per_ip?: number;
  limit_rate?: string;
  cache_enabled: boolean;
  cache_policy: string;
  cache_rules: string[];
  custom_headers: ProxyRouteCustomHeader[];
  pow_enabled: boolean;
  pow_config: string;
  basic_auth_enabled: boolean;
  basic_auth_username?: string;
  basic_auth_password?: string;
  remark: string;
  upstream_type?: 'direct' | 'tunnel' | 'pages';
  tunnel_node_id?: number | null;
  tunnel_id?: number | null;
  tunnel_target_addr?: string;
  tunnel_target_protocol?: string;
  pages_project_id?: number | null;
}

export interface ConfigVersionSummary {
  id: number;
  version: string;
  checksum: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface ConfigVersionDetail extends ConfigVersionSummary {
  snapshot_json: string;
  main_config: string;
  rendered_config: string;
  support_files_json: string;
}

export interface SupportFile {
  path: string;
  content: string;
}

export interface ConfigPreviewResult {
  snapshot_json: string;
  main_config: string;
  route_config: string;
  rendered_config: string;
  support_files: SupportFile[];
  checksum: string;
  route_count: number;
  website_count: number;
}

export interface ConfigOptionDiffItem {
  key: string;
  previous_value: string;
  current_value: string;
}

export interface ConfigDiffResult {
  active_version?: string;
  added_sites: string[];
  removed_sites: string[];
  modified_sites: string[];
  added_domains: string[];
  removed_domains: string[];
  modified_domains: string[];
  main_config_changed: boolean;
  waf_config_changed: boolean;
  changed_option_keys: string[];
  changed_option_details: ConfigOptionDiffItem[];
  current_website_count: number;
  active_website_count: number;
}

export interface ConfigVersionCleanupPayload {
  keep_count: number;
}

export interface ConfigVersionCleanupResult {
  deleted_count: number;
}

export interface ApplyLogItem {
  id: number;
  node_id: string;
  version: string;
  result: 'success' | 'failed' | string;
  message: string;
  checksum: string;
  main_config_checksum: string;
  route_config_checksum: string;
  support_file_count: number;
  created_at: string;
}

export interface ApplyLogList {
  rows: ApplyLogItem[];
  current: number;
  total: number;
  totalPage: number;
}

export interface ApplyLogListQuery {
  node_id?: string;
  pageNo?: number;
  pageSize?: number;
}

export interface ApplyLogCleanupPayload {
  delete_all?: boolean;
  retention_days?: number;
}

export interface ApplyLogCleanupResult {
  delete_all: boolean;
  retention_days: number;
  deleted_count: number;
  cutoff?: string;
}