'use client';

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import type {ProxyRouteItem} from '@/lib/services/openflare';

interface CacheSectionProps {
  route: ProxyRouteItem;
}

export function CacheSection({ route }: CacheSectionProps) {
  return (
    <Card className="border-dashed shadow-none">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">缓存</CardTitle>
        <CardDescription>配置站点缓存策略。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>待实现</p>
        <p className="text-xs">
          缓存状态：{route.cache_enabled ? '已启用' : '未启用'}；策略：{route.cache_policy || 'url'}
        </p>
      </CardContent>
    </Card>
  );
}
