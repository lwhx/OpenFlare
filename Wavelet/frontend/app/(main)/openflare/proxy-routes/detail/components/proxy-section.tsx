'use client';

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import type {ProxyRouteItem} from '@/lib/services/openflare';

import {getUpstreamSummary} from '../../components/helpers';

interface ProxySectionProps {
  route: ProxyRouteItem;
}

export function ProxySection({ route }: ProxySectionProps) {
  return (
    <Card className="border-dashed shadow-none">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">反向代理</CardTitle>
        <CardDescription>配置主回源和上游地址。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>待实现</p>
        <p className="text-xs">当前上游：{getUpstreamSummary(route)}</p>
      </CardContent>
    </Card>
  );
}
