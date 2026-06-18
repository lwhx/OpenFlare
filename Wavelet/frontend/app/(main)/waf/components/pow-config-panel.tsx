'use client';

import {Info} from 'lucide-react';

import {Switch} from '@/components/ui/switch';
import {Label} from '@/components/ui/label';
import type {ProxyRoutePoWConfig} from '@/lib/services/openflare';

interface PowConfigPanelProps {
  enabled: boolean;
  config: ProxyRoutePoWConfig;
  onChange: (enabled: boolean, config: ProxyRoutePoWConfig) => void;
}

export function PowConfigPanel({ enabled, config, onChange }: PowConfigPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-lg border border-dashed bg-muted/40 p-4 text-sm">
        <Info className="size-4 shrink-0 text-primary mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium">PoW 配置面板（占位）</p>
          <p className="text-muted-foreground text-xs">
            完整 PoW 黑白名单与难度参数编辑将在后续迭代中实装。当前可先切换启用状态并保存规则组。
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
        <div className="space-y-1">
          <Label htmlFor="pow-enabled">启用 PoW 防护</Label>
          <p className="text-xs text-muted-foreground">
            算法 {config.algorithm} · 难度 {config.difficulty}
          </p>
        </div>
        <Switch
          id="pow-enabled"
          checked={enabled}
          onCheckedChange={(checked) => onChange(checked, config)}
        />
      </div>
    </div>
  );
}
