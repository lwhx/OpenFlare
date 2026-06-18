import type {ProxyRouteConfigSection, ProxyRouteItem} from '@/lib/services/openflare';

export const proxyRouteConfigSections = [
  {
    key: 'domains' as const,
    label: '域名设置',
    description: '维护站点标识、域名列表和证书绑定。',
  },
  {
    key: 'limits' as const,
    label: '流量限制',
    description: '设置连接数和限速。',
  },
  {
    key: 'proxy' as const,
    label: '反向代理',
    description: '配置主回源和上游地址。',
  },
  {
    key: 'cache' as const,
    label: '缓存',
    description: '配置站点缓存策略。',
  },
  {
    key: 'waf' as const,
    label: 'WAF',
    description: '绑定 WAF 规则组，并查看当前站点生效策略。',
  },
  {
    key: 'auth' as const,
    label: '认证配置',
    description: '配置基础鉴权访问，需要输入账号密码才能访问网站。',
  },
] satisfies ReadonlyArray<{
  key: ProxyRouteConfigSection;
  label: string;
  description: string;
}>;

const domainPattern =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export function getProxyRouteConfigSection(
  value: string | null | undefined,
): ProxyRouteConfigSection {
  return proxyRouteConfigSections.some((section) => section.key === value)
    ? (value as ProxyRouteConfigSection)
    : 'domains';
}

export function validateDomain(domain: string): string | null {
  const normalized = domain.trim().toLowerCase();
  if (!normalized) {
    return '请输入域名';
  }
  if (!domainPattern.test(normalized)) {
    return '域名格式不合法';
  }
  return null;
}

export function parseOriginUrl(originUrl: string) {
  const parsed = new URL(originUrl);
  const port = parsed.port || (parsed.protocol === 'http:' ? '80' : '443');
  const path = parsed.pathname === '/' ? '' : parsed.pathname;

  return {
    scheme: parsed.protocol.replace(':', '') as 'http' | 'https',
    address: parsed.hostname,
    port,
    uri: parsed.search ? `${path}${parsed.search}` || parsed.search : path,
  };
}

export function getUpstreamSummary(route: ProxyRouteItem): string {
  if (route.upstream_type === 'pages') {
    return route.pages_project_id
      ? `Pages 项目 #${route.pages_project_id}`
      : 'Pages 项目未绑定';
  }
  if (route.upstream_type === 'tunnel') {
    const protocol = route.tunnel_target_protocol || 'http';
    const target = route.tunnel_target_addr || '未配置目标';
    return `Tunnel → ${protocol}://${target}`;
  }
  if (route.upstream_list.length <= 1) {
    return route.origin_url;
  }
  return `${route.upstream_list.length} 个上游，主上游 ${route.origin_url}`;
}
