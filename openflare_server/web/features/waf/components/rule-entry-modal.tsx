import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { AppModal } from '@/components/ui/app-modal';
import {
  PrimaryButton,
  ResourceField,
  ResourceTextarea,
  SecondaryButton,
} from '@/features/shared/components/resource-primitives';
import { cn } from '@/lib/utils/cn';
import { normalizeItems } from './helpers';
import type { CountryOption, RuleListType, RuleDimension, RuleModalState } from './types';

export function RuleEntryModal({
  state,
  countryOptions,
  pending,
  onClose,
  onChange,
  onSubmit,
}: {
  state: RuleModalState;
  countryOptions: CountryOption[];
  pending: boolean;
  onClose: () => void;
  onChange: (patch: Partial<RuleModalState>) => void;
  onSubmit: () => void;
}) {
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (!state.open) {
      return;
    }
    setKeyword('');
  }, [state.dimension, state.open]);

  const selectedCountrySet = useMemo(
    () => new Set(state.countryValues),
    [state.countryValues],
  );

  const filteredCountries = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();

    return countryOptions
      .filter((option) => !normalized || option.searchText.includes(normalized))
      .sort((left, right) => {
        const leftSelected = selectedCountrySet.has(left.code) ? 1 : 0;
        const rightSelected = selectedCountrySet.has(right.code) ? 1 : 0;
        return (
          rightSelected - leftSelected || left.code.localeCompare(right.code)
        );
      });
  }, [countryOptions, keyword, selectedCountrySet]);

  const toggleCountry = (code: string) => {
    const values = selectedCountrySet.has(code)
      ? state.countryValues.filter((item) => item !== code)
      : normalizeItems([...state.countryValues, code]);
    onChange({ countryValues: values });
  };

  const selectFiltered = () => {
    onChange({
      countryValues: normalizeItems([
        ...state.countryValues,
        ...filteredCountries.map((option) => option.code),
      ]),
    });
  };

  const clearCountries = () => onChange({ countryValues: [] });

  const typeLabel = state.listType === 'blacklist' ? '黑名单' : '白名单';
  const dimensionLabel = state.dimension === 'ip' ? 'IP' : '地域';

  return (
    <AppModal
      isOpen={state.open}
      title={`添加${typeLabel}规则`}
      description={`当前准备新增 ${dimensionLabel} 维度的${typeLabel}项。`}
      size="lg"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <SecondaryButton type="button" onClick={onClose}>
            取消
          </SecondaryButton>
          <PrimaryButton type="button" disabled={pending} onClick={onSubmit}>
            {pending ? '处理中...' : '添加'}
          </PrimaryButton>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <ResourceField label="类型" container="div">
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'blacklist', label: '黑名单' },
                { value: 'whitelist', label: '白名单' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    onChange({ listType: option.value as RuleListType })
                  }
                  className={cn(
                    'rounded-2xl border px-4 py-3 text-sm font-medium transition',
                    state.listType === option.value
                      ? 'border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--foreground-primary)]'
                      : 'border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)]',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </ResourceField>
          <ResourceField label="维度" container="div">
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'ip', label: 'IP' },
                { value: 'country', label: '地域' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    onChange({ dimension: option.value as RuleDimension })
                  }
                  className={cn(
                    'rounded-2xl border px-4 py-3 text-sm font-medium transition',
                    state.dimension === option.value
                      ? 'border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--foreground-primary)]'
                      : 'border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)]',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </ResourceField>
        </div>

        {state.dimension === 'ip' ? (
          <ResourceField
            label="IP / IP 段"
            hint="支持单个 IP、CIDR，或使用换行/逗号一次添加多个。"
          >
            <ResourceTextarea
              value={state.ipValue}
              placeholder="例如 1.1.1.1 或 192.168.0.0/24"
              onChange={(event) => onChange({ ipValue: event.target.value })}
            />
          </ResourceField>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 py-3">
              <Search className="h-4 w-4 text-[var(--foreground-secondary)]" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索国家代码或中文名"
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground-primary)] outline-none placeholder:text-[var(--foreground-muted)]"
              />
              <button
                type="button"
                onClick={selectFiltered}
                className="text-xs font-medium text-[var(--brand-primary)]"
              >
                全选当前
              </button>
              <button
                type="button"
                onClick={clearCountries}
                className="text-xs font-medium text-[var(--foreground-secondary)]"
              >
                清空
              </button>
            </div>

            <div className="rounded-[26px] border border-[var(--border-default)] bg-[var(--surface-elevated)] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--foreground-primary)]">
                    地域多选
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--foreground-secondary)]">
                    选项显示为「国家代码 国家中文名」。
                  </p>
                </div>
                <span className="rounded-full border border-[var(--border-default)] px-2.5 py-1 text-xs font-medium text-[var(--foreground-secondary)]">
                  已选 {state.countryValues.length}
                </span>
              </div>

              <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
                {filteredCountries.map((option) => {
                  const selected = selectedCountrySet.has(option.code);
                  return (
                    <label
                      key={option.code}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition',
                        selected
                          ? 'border-[var(--border-strong)] bg-[var(--accent-soft)]'
                          : 'border-[var(--border-default)] bg-[var(--surface-panel)] hover:bg-[var(--surface-muted)]',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleCountry(option.code)}
                        className="h-4 w-4 rounded border-[var(--border-default)] accent-[var(--brand-primary)]"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-[var(--foreground-primary)]">
                          {option.label}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppModal>
  );
}
