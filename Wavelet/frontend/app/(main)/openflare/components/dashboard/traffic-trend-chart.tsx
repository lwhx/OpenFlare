'use client';

import {Area, AreaChart, CartesianGrid, Line, XAxis, YAxis} from 'recharts';

import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type {TrafficTrendPoint} from '@/lib/services/openflare';

import {formatCompactNumber, formatTrendHour} from './dashboard-utils';

const chartConfig = {
  requests: {
    label: '请求量',
    color: 'hsl(var(--chart-1))',
  },
  errors: {
    label: '错误量',
    color: 'hsl(var(--chart-5))',
  },
} satisfies ChartConfig;

export function TrafficTrendChart({ points }: { points: TrafficTrendPoint[] }) {
  const data = points.map((point) => ({
    hour: formatTrendHour(point.bucket_started_at),
    requests: point.request_count,
    errors: point.error_count,
  }));

  if (data.length === 0) {
    return (
      <Card className="border-dashed shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">24 小时请求趋势</CardTitle>
          <CardDescription className="text-xs">
            观察整体请求量和错误量是否出现异常抬升。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[280px] items-center justify-center text-xs text-muted-foreground">
            暂无趋势数据
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed shadow-none">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">24 小时请求趋势</CardTitle>
        <CardDescription className="text-xs">
          观察整体请求量和错误量是否出现异常抬升。
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2 pr-4">
        <div className="h-[280px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="trafficRequestsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-requests)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--color-requests)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => formatCompactNumber(Number(value))}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <span className="font-mono tabular-nums">
                        {formatCompactNumber(Number(value))}
                        <span className="ml-1 text-muted-foreground">
                          {name === 'requests' ? '请求' : '错误'}
                        </span>
                      </span>
                    )}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="requests"
                stroke="var(--color-requests)"
                fill="url(#trafficRequestsFill)"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="errors"
                stroke="var(--color-errors)"
                strokeWidth={2}
                dot={false}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
