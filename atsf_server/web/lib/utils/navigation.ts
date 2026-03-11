import { dashboardNavigation } from '@/lib/constants/navigation';
import type { NavigationItem } from '@/types/navigation';

export function isPathActive(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getCurrentNavigationItem(pathname: string): NavigationItem | undefined {
  return dashboardNavigation.find((item) => isPathActive(pathname, item.href));
}
