'use client';

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import type {ProxyRouteItem} from '@/lib/services/openflare';

interface WafSectionProps {
  route: ProxyRouteItem;
}

export function WafSection({ route }: WafSectionProps) {
  return (
    <Card className="border-dashed shadow-none">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">WAF</CardTitle>
        <CardDescription>绑定 WAF 规则组，并查看当前站点生效策略。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>待实现</p>
        <p className="text-xs">站点 ID：{route.id}</p>
      </CardContent>
    </Card>
  );
}
