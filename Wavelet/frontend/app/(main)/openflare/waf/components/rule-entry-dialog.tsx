'use client';

import {useEffect, useMemo, useState} from 'react';
import {Search} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
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
import {Textarea} from '@/components/ui/textarea';
import {cn} from '@/lib/utils';
import type {WAFIPGroup} from '@/lib/services/openflare';

import {
  type CountryOption,
  normalizeItems,
  type RuleDimension,
  type RuleListType,
  type RuleModalState,
} from './helpers';

interface RuleEntryDialogProps {
  state: RuleModalState;
  countryOptions: CountryOption[];
  ipGroups: WAFIPGroup[];
  onClose: () => void;
  onChange: (patch: Partial<RuleModalState>) => void;
  onSubmit: () => void;
}

export function RuleEntryDialog({
  state,
  countryOptions,
  ipGroups,
  onClose,
  onChange,
  onSubmit,
}: RuleEntryDialogProps) {
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (!state.open) return;
    setKeyword('');
  }, [state.dimension, state.open]);

  const selectedCountrySet = useMemo(
    () => new Set(state.countryValues),
    [state.countryValues],
  );
  const selectedIPGroupSet = useMemo(
    () => new Set(state.ipGroupIDs),
    [state.ipGroupIDs],
  );

  const filteredCountries = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return countryOptions
      .filter((option) => !normalized || option.searchText.includes(normalized))
      .sort((left, right) => {
        const leftSelected = selectedCountrySet.has(left.code) ? 1 : 0;
        const rightSelected = selectedCountrySet.has(right.code) ? 1 : 0;
        return rightSelected - leftSelected || left.code.localeCompare(right.code);
      });
  }, [countryOptions, keyword, selectedCountrySet]);

  const toggleCountry = (code: string) => {
    const values = selectedCountrySet.has(code)
      ? state.countryValues.filter((item) => item !== code)
      : normalizeItems([...state.countryValues, code]);
    onChange({ countryValues: values });
  };

  const toggleIPGroup = (id: number) => {
    const values = selectedIPGroupSet.has(id)
      ? state.ipGroupIDs.filter((item) => item !== id)
      : [...state.ipGroupIDs, id].sort((left, right) => left - right);
    onChange({ ipGroupIDs: values });
  };

  const typeLabel = state.listType === 'blacklist' ? '黑名单' : '白名单';
  const dimensionLabel =
    state.dimension === 'ip'
      ? 'IP'
      : state.dimension === 'ip_group'
        ? 'IP 组'
        : '地域';

  return (
    <Dialog open={state.open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>添加{typeLabel}规则</DialogTitle>
          <DialogDescription>
            当前准备新增 {dimensionLabel} 维度的{typeLabel}项。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>类型</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'blacklist', label: '黑名单' },
                  { value: 'whitelist', label: '白名单' },
                ].map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={state.listType === option.value ? 'default' : 'outline'}
                    onClick={() =>
                      onChange({ listType: option.value as RuleListType })
                    }
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>维度</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'ip', label: 'IP' },
                  { value: 'ip_group', label: 'IP 组' },
                  { value: 'country', label: '地域' },
                ].map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={state.dimension === option.value ? 'default' : 'outline'}
                    onClick={() =>
                      onChange({ dimension: option.value as RuleDimension })
                    }
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {state.dimension === 'ip' ? (
            <div className="space-y-2">
              <Label>IP / IP 段</Label>
              <Textarea
                value={state.ipValue}
                placeholder="例如 1.1.1.1 或 192.168.0.0/24"
                onChange={(event) => onChange({ ipValue: event.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                支持单个 IP、CIDR，或使用换行/逗号一次添加多个。
              </p>
            </div>
          ) : null}

          {state.dimension === 'ip_group' ? (
            <div className="space-y-3 rounded-lg border border-dashed p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">选择 IP 组</p>
                  <p className="text-xs text-muted-foreground">
                    发布版本只保存引用 ID，IP 组成员由 Agent 按 checksum 差异同步。
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  已选 {state.ipGroupIDs.length}
                </span>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {ipGroups.length > 0 ? (
                  ipGroups.map((group) => {
                    const selected = selectedIPGroupSet.has(group.id);
                    return (
                      <label
                        key={group.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2',
                          selected && 'border-primary bg-muted/50',
                        )}
                      >
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => toggleIPGroup(group.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium truncate">
                            {group.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {group.type} · {group.ip_list.length} 条 ·{' '}
                            {group.enabled ? '启用' : '停用'}
                          </span>
                        </span>
                      </label>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">暂无 IP 组，请先创建。</p>
                )}
              </div>
            </div>
          ) : null}

          {state.dimension === 'country' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <Search className="size-4 text-muted-foreground" />
                <Input
                  value={keyword}
                  placeholder="搜索国家代码或中文名"
                  className="border-0 shadow-none focus-visible:ring-0"
                  onChange={(event) => setKeyword(event.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onChange({
                      countryValues: normalizeItems([
                        ...state.countryValues,
                        ...filteredCountries.map((option) => option.code),
                      ]),
                    })
                  }
                >
                  全选当前
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ countryValues: [] })}
                >
                  清空
                </Button>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-dashed p-3">
                {filteredCountries.map((option) => {
                  const selected = selectedCountrySet.has(option.code);
                  return (
                    <label
                      key={option.code}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2',
                        selected && 'border-primary bg-muted/50',
                      )}
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggleCountry(option.code)}
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button type="button" onClick={onSubmit}>
            添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
