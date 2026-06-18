import type {LucideIcon} from 'lucide-react';
import {
  ClipboardList,
  FileText,
  Gauge,
  GitBranch,
  Globe,
  LayoutDashboard,
  MapPin,
  Route,
  ScrollText,
  Server,
  Shield,
} from 'lucide-react';

export interface OpenFlareNavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

/** OpenFlare 业务控制台侧栏导航 */
export const openflareNavItems: OpenFlareNavItem[] = [
  {title: '总览', url: '/openflare', icon: LayoutDashboard},
  {title: '节点', url: '/openflare/nodes', icon: Server},
  {title: '规则', url: '/openflare/proxy-routes', icon: Route},
  {title: 'Pages', url: '/openflare/pages', icon: FileText},
  {title: '网站', url: '/openflare/websites', icon: Globe},
  {title: 'WAF', url: '/openflare/waf', icon: Shield},
  {title: '源站', url: '/openflare/origins', icon: MapPin},
  {title: '发布', url: '/openflare/config-versions', icon: GitBranch},
  {title: '访问日志', url: '/openflare/access-logs', icon: ScrollText},
  {title: '应用日志', url: '/openflare/apply-logs', icon: ClipboardList},
  {title: '性能', url: '/openflare/performance', icon: Gauge},
];