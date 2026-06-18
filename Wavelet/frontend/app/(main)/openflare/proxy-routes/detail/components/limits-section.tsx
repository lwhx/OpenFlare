'use client';

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import type {ProxyRouteItem} from '@/lib/services/openflare';

interface LimitsSectionProps {
  route: ProxyRouteItem;
}

export function LimitsSection({ route }: LimitsSectionProps) {
  return (
    <Card className="border-dashed shadow-none">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">流量限制</CardTitle>
        <CardDescription>设置连接数和限速。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>待实现</p>
        <p className="text-xs">
          当前限速：{route.limit_rate || '未配置'}；单 IP 连接数：{route.limit_conn_per_ip}；单 Server
          连接数：{route.limit_conn_per_server}
        </p>
      </CardContent>
    </Card>
  );
}
