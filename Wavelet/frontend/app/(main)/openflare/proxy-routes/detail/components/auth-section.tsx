'use client';

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import type {ProxyRouteItem} from '@/lib/services/openflare';

interface AuthSectionProps {
  route: ProxyRouteItem;
}

export function AuthSection({ route }: AuthSectionProps) {
  return (
    <Card className="border-dashed shadow-none">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">认证配置</CardTitle>
        <CardDescription>配置基础鉴权访问，需要输入账号密码才能访问网站。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>待实现</p>
        <p className="text-xs">
          基础认证：{route.basic_auth_enabled ? '已启用' : '未启用'}；PoW：{route.pow_enabled ? '已启用' : '未启用'}
        </p>
      </CardContent>
    </Card>
  );
}
