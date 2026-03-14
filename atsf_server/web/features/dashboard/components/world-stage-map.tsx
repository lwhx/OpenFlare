'use client';

import ReactEChartsCore from 'echarts-for-react/lib/core';
import type { EChartsCoreOption } from 'echarts/core';
import * as echarts from 'echarts/core';
import { ScatterChart } from 'echarts/charts';
import { GeoComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { EmptyState } from '@/components/feedback/empty-state';
import worldGeoJson from '@/features/dashboard/data/world-geo.json';
import type { DashboardNodeHealth } from '@/features/dashboard/types';
import {
  getNodeStatusLabel,
  getOpenrestyStatusLabel,
} from '@/features/nodes/utils';

echarts.use([GeoComponent, TooltipComponent, ScatterChart, CanvasRenderer]);

const fallbackCoordinates = [
  [-122.4194, 37.7749],
  [-46.6333, -23.5505],
  [-0.1276, 51.5072],
  [2.3522, 48.8566],
  [77.209, 28.6139],
  [121.4737, 31.2304],
  [103.8198, 1.3521],
  [151.2093, -33.8688],
  [28.0473, -26.2041],
  [139.6917, 35.6895],
] as const;

type Tone = 'healthy' | 'warning' | 'danger';

type WorldGeoJson = {
  type: string;
  features?: unknown[];
};

type MapNodeDatum = {
  id: number;
  name: string;
  geoName: string;
  route: string;
  derivedFromGeo: boolean;
  requestCount: number;
  errorCount: number;
  activeEventCount: number;
  status: DashboardNodeHealth['status'];
  openrestyStatus: DashboardNodeHealth['openresty_status'];
  value: [number, number, number];
  itemStyle: {
    color: string;
    borderColor: string;
    borderWidth: number;
  };
  emphasis: {
    itemStyle: {
      borderColor: string;
      borderWidth: number;
    };
  };
};

let worldMapRegistrationAttempted = false;
let worldMapRegistrationSucceeded = false;

function buildNodeDetailHref(id?: number | null) {
  if (!id) {
    return '/node';
  }
  return `/node/detail?id=${id}`;
}

function getNodeTone(node: DashboardNodeHealth): Tone {
  if (
    node.status === 'offline' ||
    node.openresty_status === 'unhealthy' ||
    node.active_event_count > 0
  ) {
    return 'danger';
  }

  if (
    node.cpu_usage_percent >= 80 ||
    node.memory_usage_percent >= 85 ||
    node.storage_usage_percent >= 85
  ) {
    return 'warning';
  }

  return 'healthy';
}

function getNodeCoordinates(node: DashboardNodeHealth, index: number) {
  if (
    typeof node.geo_latitude === 'number' &&
    typeof node.geo_longitude === 'number'
  ) {
    return {
      coordinates: [node.geo_longitude, node.geo_latitude] as [number, number],
      derivedFromGeo: true,
    };
  }

  return {
    coordinates: [...fallbackCoordinates[index % fallbackCoordinates.length]] as [
      number,
      number,
    ],
    derivedFromGeo: false,
  };
}

function ensureWorldMapRegistered() {
  if (worldMapRegistrationSucceeded || echarts.getMap('world')) {
    worldMapRegistrationSucceeded = true;
    return true;
  }

  if (worldMapRegistrationAttempted) {
    return false;
  }

  worldMapRegistrationAttempted = true;

  try {
    const geoJson = worldGeoJson as WorldGeoJson;

    if (geoJson.type !== 'FeatureCollection' || !Array.isArray(geoJson.features)) {
      throw new Error('invalid world geojson payload');
    }

    echarts.registerMap(
      'world',
      geoJson as unknown as Parameters<typeof echarts.registerMap>[1],
    );

    if (!echarts.getMap('world')) {
      throw new Error('world map registration failed');
    }

    worldMapRegistrationSucceeded = true;
    return true;
  } catch (error) {
    const registrationError =
      error instanceof Error ? error : new Error('unknown world map registration error');
    console.error('Failed to register ECharts world map', registrationError);
    return false;
  }
}

export function WorldStageMap({
  isDark,
  nodes,
}: {
  isDark: boolean;
  nodes: DashboardNodeHealth[];
}) {
  const router = useRouter();
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    const ready = ensureWorldMapRegistered();
    setMapReady(ready);
    setMapFailed(!ready);
  }, []);

  const mapPalette = useMemo(
    () =>
      isDark
        ? {
            areaColor: '#13233b',
            borderColor: 'rgba(125,211,252,0.14)',
            labelColor: '#e2e8f0',
            healthyColor: '#34d399',
            warningColor: '#fbbf24',
            dangerColor: '#fb7185',
            healthyBorder: '#bbf7d0',
            warningBorder: '#fde68a',
            dangerBorder: '#fecdd3',
          }
        : {
            areaColor: '#eaf2ff',
            borderColor: 'rgba(71,85,105,0.12)',
            labelColor: '#0f172a',
            healthyColor: '#10b981',
            warningColor: '#f59e0b',
            dangerColor: '#f43f5e',
            healthyBorder: '#d1fae5',
            warningBorder: '#fde68a',
            dangerBorder: '#fecdd3',
          },
    [isDark],
  );

  const mapNodes = useMemo<MapNodeDatum[]>(
    () =>
      nodes.map((node, index) => {
        const { coordinates, derivedFromGeo } = getNodeCoordinates(node, index);
        const tone = getNodeTone(node);
        const toneColor =
          tone === 'healthy'
            ? mapPalette.healthyColor
            : tone === 'warning'
              ? mapPalette.warningColor
              : mapPalette.dangerColor;
        const toneBorder =
          tone === 'healthy'
            ? mapPalette.healthyBorder
            : tone === 'warning'
              ? mapPalette.warningBorder
              : mapPalette.dangerBorder;

        return {
          id: node.id,
          name: node.name,
          geoName: node.geo_name || node.name,
          route: buildNodeDetailHref(node.id),
          derivedFromGeo,
          requestCount: node.request_count,
          errorCount: node.error_count,
          activeEventCount: node.active_event_count,
          status: node.status,
          openrestyStatus: node.openresty_status,
          value: [coordinates[0], coordinates[1], Math.max(node.request_count, 1)],
          itemStyle: {
            color: toneColor,
            borderColor: toneBorder,
            borderWidth: 1.5,
          },
          emphasis: {
            itemStyle: {
              borderColor: toneBorder,
              borderWidth: 2,
            },
          },
        };
      }),
    [mapPalette, nodes],
  );

  const mapOption = useMemo<EChartsCoreOption>(
    () => ({
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        transitionDuration: 0,
        backgroundColor: isDark
          ? 'rgba(15,23,42,0.96)'
          : 'rgba(255,255,255,0.96)',
        borderColor: isDark
          ? 'rgba(148,163,184,0.2)'
          : 'rgba(148,163,184,0.24)',
        borderWidth: 1,
        textStyle: {
          color: isDark ? '#e2e8f0' : '#0f172a',
          fontSize: 12,
        },
        formatter: (params: unknown) => {
          const data = (params as { data?: MapNodeDatum }).data;
          if (!data) {
            return '';
          }

          const locationLine = data.derivedFromGeo
            ? data.geoName
            : `${data.geoName} · 预设落点`;

          return [
            `<div style="font-weight:600;margin-bottom:6px;">${data.name}</div>`,
            `<div>${locationLine}</div>`,
            `<div>请求量 ${data.requestCount.toLocaleString('zh-CN')} · 错误数 ${data.errorCount.toLocaleString('zh-CN')}</div>`,
            `<div>活动事件 ${data.activeEventCount} · 节点状态 ${getNodeStatusLabel(data.status)}</div>`,
            `<div>OpenResty 状态 ${getOpenrestyStatusLabel(data.openrestyStatus)}</div>`,
          ].join('');
        },
      },
      geo: {
        map: 'world',
        roam: false,
        silent: true,
        layoutCenter: ['50%', '50%'],
        layoutSize: '220%',
        zoom: 1.2,
        itemStyle: {
          areaColor: mapPalette.areaColor,
          borderColor: mapPalette.borderColor,
          borderWidth: 0.7,
        },
        emphasis: {
          disabled: true,
        },
      },
      series: [
        {
          type: 'scatter',
          coordinateSystem: 'geo',
          data: mapNodes,
          progressive: 64,
          large: true,
          largeThreshold: 24,
          symbolSize: (value: unknown) => {
            const size = Array.isArray(value) && typeof value[2] === 'number' ? value[2] : 1;
            return Math.max(8, Math.min(18, 8 + Math.log10(size + 1) * 3.6));
          },
          label: {
            show: false,
            color: mapPalette.labelColor,
            fontSize: 11,
          },
          emphasis: {
            scale: 1.12,
            label: {
              show: mapNodes.length > 0 && mapNodes.length <= 5,
              position: 'right',
              distance: 8,
              formatter: '{b}',
              backgroundColor: isDark
                ? 'rgba(8,15,31,0.7)'
                : 'rgba(255,255,255,0.88)',
              borderColor: isDark
                ? 'rgba(148,163,184,0.16)'
                : 'rgba(148,163,184,0.2)',
              borderWidth: 1,
              borderRadius: 999,
              padding: [4, 8],
            },
          },
        },
      ],
    }),
    [isDark, mapNodes, mapPalette],
  );

  if (!mapReady) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          title={mapFailed ? '全球地图加载失败' : '全球地图加载中'}
          description={
            mapFailed
              ? 'ECharts 世界地图资源未能成功注册，请稍后刷新重试。'
              : '正在按需初始化全球地图，这一步会延后到首屏内容稳定后执行。'
          }
        />
      </div>
    );
  }

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={mapOption}
      notMerge
      lazyUpdate
      opts={{ renderer: 'canvas' }}
      onEvents={{
        click: (params: { data?: MapNodeDatum }) => {
          if (params.data?.route) {
            router.push(params.data.route);
          }
        },
      }}
      style={{ height: '100%', width: '100%' }}
    />
  );
}
