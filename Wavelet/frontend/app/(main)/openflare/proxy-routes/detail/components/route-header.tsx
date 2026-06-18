'use client';

import Link from 'next/link';
import {ArrowLeft, Route, Save, Upload} from 'lucide-react';

import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import type {ProxyRouteItem} from '@/lib/services/openflare';

interface RouteHeaderProps {
  route: ProxyRouteItem;
}

export function RouteHeader({ route }: RouteHeaderProps) {
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-0 text-xs" asChild>
        <Link href="/openflare/proxy-routes">
          <ArrowLeft className="size-3.5" />
          返回规则列表
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Route className="size-5 text-primary" />
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{route.site_name}</h1>
            <Badge variant={route.enabled ? 'default' : 'secondary'}>
              {route.enabled ? '已启用' : '已停用'}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" className="h-8 gap-1.5 text-xs" disabled>
            <Save className="size-3.5" />
            保存（待实现）
          </Button>
          <Button size="sm" className="h-8 gap-1.5 text-xs" disabled>
            <Upload className="size-3.5" />
            发布配置（待实现）
          </Button>
        </div>
      </div>
    </div>
  );
}
