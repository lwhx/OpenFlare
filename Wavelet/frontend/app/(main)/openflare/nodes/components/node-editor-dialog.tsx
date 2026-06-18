'use client';

import {useEffect, useState} from 'react';
import {Button} from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '@/components/ui/select';
import {Switch} from '@/components/ui/switch';
import type {NodeItem, NodeMutationPayload, NodeType} from '@/lib/services/openflare';

type FormState = {
  node_type: NodeType;
  name: string;
  ip: string;
  ip_manual_override: boolean;
  auto_update_enabled: boolean;
  geo_manual_override: boolean;
  geo_name: string;
  geo_latitude: string;
  geo_longitude: string;
  relay_bind_port: string;
  relay_vhost_http_port: string;
};

const defaultForm: FormState = {
  node_type: 'edge_node',
  name: '',
  ip: '',
  ip_manual_override: false,
  auto_update_enabled: false,
  geo_manual_override: false,
  geo_name: '',
  geo_latitude: '',
  geo_longitude: '',
  relay_bind_port: '7000',
  relay_vhost_http_port: '8080',
};

function buildFormState(node?: NodeItem | null): FormState {
  if (!node) return defaultForm;

  return {
    node_type: node.node_type,
    name: node.name,
    ip: node.ip,
    ip_manual_override: node.ip_manual_override,
    auto_update_enabled: node.auto_update_enabled,
    geo_manual_override: node.geo_manual_override,
    geo_name: node.geo_name,
    geo_latitude:
      node.geo_latitude === undefined || node.geo_latitude === null
        ? ''
        : String(node.geo_latitude),
    geo_longitude:
      node.geo_longitude === undefined || node.geo_longitude === null
        ? ''
        : String(node.geo_longitude),
    relay_bind_port: String(node.relay_bind_port || 7000),
    relay_vhost_http_port: String(node.relay_vhost_http_port || 8080),
  };
}

function toPayload(form: FormState): NodeMutationPayload {
  const base: NodeMutationPayload = {
    node_type: form.node_type,
    name: form.name.trim(),
    ip: form.ip.trim(),
    ip_manual_override: form.ip_manual_override,
    auto_update_enabled: form.auto_update_enabled,
    geo_manual_override: form.geo_manual_override,
    geo_name: form.geo_manual_override ? form.geo_name.trim() : '',
    geo_latitude: form.geo_manual_override && form.geo_latitude
      ? Number(form.geo_latitude)
      : null,
    geo_longitude: form.geo_manual_override && form.geo_longitude
      ? Number(form.geo_longitude)
      : null,
  };

  if (form.node_type === 'tunnel_relay') {
    return {
      ...base,
      relay_bind_port: Number(form.relay_bind_port),
      relay_vhost_http_port: Number(form.relay_vhost_http_port),
      relay_web_server_enabled: true,
    };
  }

  return base;
}

export function NodeEditorDialog({
  open,
  node,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  node: NodeItem | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: NodeMutationPayload) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(buildFormState(node));
      setError('');
    }
  }, [open, node]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('请输入节点名称');
      return;
    }
    if (form.ip_manual_override && !form.ip.trim()) {
      setError('锁定 IP 时必须填写节点 IP');
      return;
    }

    setError('');
    await onSubmit(toPayload(form));
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{node ? '编辑节点' : '新增节点'}</DialogTitle>
          <DialogDescription>
            预创建节点后可在详情页查看专属 Token 与部署命令。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="space-y-2">
            <Label>节点类型</Label>
            <Select
              value={form.node_type}
              disabled={Boolean(node)}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, node_type: value as NodeType }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="edge_node">Edge 节点</SelectItem>
                <SelectItem value="tunnel_relay">Relay 节点</SelectItem>
                <SelectItem value="tunnel_client">Tunnel 节点</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="node-name">节点名称</Label>
            <Input
              id="node-name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="例如 edge-hk-01"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="node-ip">节点 IP</Label>
            <Input
              id="node-ip"
              value={form.ip}
              onChange={(event) => setForm((prev) => ({ ...prev, ip: event.target.value }))}
              placeholder="可选，接入后自动上报"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium">锁定 IP</p>
              <p className="text-xs text-muted-foreground">启用后管理端不再自动覆盖 IP</p>
            </div>
            <Switch
              checked={form.ip_manual_override}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, ip_manual_override: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium">自动更新 Agent</p>
              <p className="text-xs text-muted-foreground">启用后节点将自动拉取正式版更新</p>
            </div>
            <Switch
              checked={form.auto_update_enabled}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, auto_update_enabled: checked }))
              }
            />
          </div>

          {form.node_type === 'tunnel_relay' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="relay-bind-port">绑定端口</Label>
                <Input
                  id="relay-bind-port"
                  value={form.relay_bind_port}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, relay_bind_port: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relay-vhost-port">VHost 端口</Label>
                <Input
                  id="relay-vhost-port"
                  value={form.relay_vhost_http_port}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, relay_vhost_http_port: event.target.value }))
                  }
                />
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium">手动地图点位</p>
              <p className="text-xs text-muted-foreground">用于总览地图展示</p>
            </div>
            <Switch
              checked={form.geo_manual_override}
              onCheckedChange={(checked) =>
                setForm((prev) => ({ ...prev, geo_manual_override: checked }))
              }
            />
          </div>

          {form.geo_manual_override ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="geo-name">位置名称</Label>
                <Input
                  id="geo-name"
                  value={form.geo_name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, geo_name: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="geo-lat">纬度</Label>
                <Input
                  id="geo-lat"
                  value={form.geo_latitude}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, geo_latitude: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="geo-lng">经度</Label>
                <Input
                  id="geo-lng"
                  value={form.geo_longitude}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, geo_longitude: event.target.value }))
                  }
                />
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '保存中...' : node ? '保存修改' : '新增节点'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
