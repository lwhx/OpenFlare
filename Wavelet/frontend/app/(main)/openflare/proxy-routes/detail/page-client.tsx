'use client';

import {useCallback, useEffect, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {toast} from 'sonner';

import {Skeleton} from '@/components/ui/skeleton';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import type {ProxyRouteConfigSection, ProxyRouteItem} from '@/lib/services/openflare';
import {ProxyRouteService} from '@/lib/services/openflare';

import {getProxyRouteConfigSection, proxyRouteConfigSections} from '../components/helpers';
import {AuthSection} from './components/auth-section';
import {CacheSection} from './components/cache-section';
import {DomainSection} from './components/domain-section';
import {LimitsSection} from './components/limits-section';
import {ProxySection} from './components/proxy-section';
import {RouteHeader} from './components/route-header';
import {WafSection} from './components/waf-section';

export function ProxyRouteDetailPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeId = Number(searchParams.get('id'));
  const activeSection = getProxyRouteConfigSection(searchParams.get('section'));

  const [route, setRoute] = useState<ProxyRouteItem | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSectionChange = useCallback(
    (section: ProxyRouteConfigSection) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('section', section);
      router.replace(`/openflare/proxy-routes/detail?${params.toString()}`);
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (!Number.isFinite(routeId) || routeId <= 0) {
      setLoading(false);
      setRoute(null);
      return;
    }

    let cancelled = false;

    const fetchRoute = async () => {
      setLoading(true);
      try {
        const data = await ProxyRouteService.getById(routeId);
        if (!cancelled) {
          setRoute(data);
        }
      } catch (error) {
        if (!cancelled) {
          setRoute(null);
          toast.error('规则详情加载失败', {
            description: error instanceof Error ? error.message : '未知错误',
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchRoute();

    return () => {
      cancelled = true;
    };
  }, [routeId]);

  if (!Number.isFinite(routeId) || routeId <= 0) {
    return (
      <div className="py-6 px-1">
        <p className="text-sm text-muted-foreground">缺少有效的规则 ID。</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-6 px-1 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-xl" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!route) {
    return (
      <div className="py-6 px-1">
        <p className="text-sm text-muted-foreground">未找到对应规则，请返回列表重试。</p>
      </div>
    );
  }

  return (
    <div className="py-6 px-1 space-y-6">
      <RouteHeader route={route} />

      <Tabs
        value={activeSection}
        onValueChange={(value) => handleSectionChange(value as ProxyRouteConfigSection)}
        className="w-full"
      >
        <TabsList variant="line" className="w-fit inline-flex gap-8 mb-6">
          {proxyRouteConfigSections.map((section) => (
            <TabsTrigger
              key={section.key}
              value={section.key}
              className="px-0 pb-2 text-xs font-semibold"
            >
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="domains" className="focus-visible:outline-none">
          <DomainSection route={route} />
        </TabsContent>
        <TabsContent value="limits" className="focus-visible:outline-none">
          <LimitsSection route={route} />
        </TabsContent>
        <TabsContent value="proxy" className="focus-visible:outline-none">
          <ProxySection route={route} />
        </TabsContent>
        <TabsContent value="cache" className="focus-visible:outline-none">
          <CacheSection route={route} />
        </TabsContent>
        <TabsContent value="waf" className="focus-visible:outline-none">
          <WafSection route={route} />
        </TabsContent>
        <TabsContent value="auth" className="focus-visible:outline-none">
          <AuthSection route={route} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
