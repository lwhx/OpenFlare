import type {LucideIcon} from 'lucide-react';
import {
  FileText,
  Gauge,
  GitBranch,
  Globe,
  LayoutDashboard,
  Route,
  ScrollText,
  Server,
  Shield,
} from 'lucide-react';

export interface OpenFlareNavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  /** 子页面在侧栏中仍高亮父级菜单项 */
  childUrls?: string[];
}

export interface OpenFlareNavSubItem {
  title: string;
  url: string;
  childUrls?: string[];
}

export interface OpenFlareNavGroup {
  title: string;
  icon: LucideIcon;
  items: OpenFlareNavSubItem[];
}

/** OpenFlare 业务控制台侧栏导航（子页面通过父级入口或页内链接访问） */
export const openflareNavItems: OpenFlareNavItem[] = [
  {title: '数据看板', url: '/', icon: LayoutDashboard},
  {title: '节点管理', url: '/nodes', icon: Server, childUrls: ['/nodes/detail']},
  {title: '规则管理', url: '/proxy-routes', icon: Route, childUrls: ['/proxy-routes/detail']},
  {title: 'Pages', url: '/pages', icon: FileText, childUrls: ['/pages/detail']},
  {title: 'WAF', url: '/waf', icon: Shield, childUrls: ['/waf/ip-groups']},
  {title: '版本发布', url: '/config-versions', icon: GitBranch},
  {title: '访问日志', url: '/access-logs', icon: ScrollText},
  {title: '性能调优', url: '/performance', icon: Gauge},
];

/** 网站管理折叠组 */
export const openflareWebsiteNavGroup: OpenFlareNavGroup = {
  title: '网站管理',
  icon: Globe,
  items: [
    {title: '网站', url: '/websites', childUrls: ['/websites/detail']},
    {title: '证书', url: '/websites/certificates'},
    {title: 'DNS', url: '/websites/dns-accounts'},
    {title: '源站', url: '/origins', childUrls: ['/origins/detail']},
  ],
};

/** 网站模块页内二级导航 */
export const openflareWebsiteSubNav = [
  {title: '网站列表', url: '/websites'},
  {title: '证书', url: '/websites/certificates'},
  {title: 'DNS 账号', url: '/websites/dns-accounts'},
] as const;

const nonConsoleRoutePrefixes = ['/admin', '/settings', '/files', '/home', '/login', '/register', '/docs'];

export function matchesNavPath(
  pathname: string,
  url: string,
  childUrls?: string[],
): boolean {
  if (url === '/') {
    return pathname === '/';
  }

  if (pathname === url || pathname.startsWith(`${url}/`)) {
    return true;
  }

  return (childUrls ?? []).some(
    (childUrl) => pathname === childUrl || pathname.startsWith(`${childUrl}/`),
  );
}

export function isNavGroupActive(pathname: string, group: OpenFlareNavGroup): boolean {
  return group.items.some((item) => matchesNavPath(pathname, item.url, item.childUrls));
}

/** 判断当前路径是否属于 OpenFlare 业务控制台（用于顶栏版本入口等） */
export function isOpenFlareConsoleRoute(pathname: string): boolean {
  if (nonConsoleRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return false;
  }

  if (isNavGroupActive(pathname, openflareWebsiteNavGroup)) {
    return true;
  }

  return openflareNavItems.some((item) => matchesNavPath(pathname, item.url, item.childUrls));
}
