'use client';

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import type {ProxyRouteItem} from '@/lib/services/openflare';

interface DomainSectionProps {
  route: ProxyRouteItem;
}

export function DomainSection({ route }: DomainSectionProps) {
  return (
    <Card className="border-dashed shadow-none">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">域名设置</CardTitle>
        <CardDescription>维护站点标识、域名列表和证书绑定。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>待实现</p>
        <p className="text-xs">
          当前主域名：{route.primary_domain || route.domain}
          {route.domains.length > 1 ? `（共 ${route.domains.length} 个域名）` : ''}
        </p>
      </CardContent>
    </Card>
  );
}
