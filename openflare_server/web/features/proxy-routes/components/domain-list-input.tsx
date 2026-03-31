'use client';

import { useId, useMemo } from 'react';

import {
  ResourceInput,
  SecondaryButton,
} from '@/features/shared/components/resource-primitives';

function splitDomainRows(value: string) {
  const rows = value.split(/\r?\n/);
  return rows.length > 0 ? rows : [''];
}

function buildSuggestionSources(domains: string[]) {
  const values = new Set<string>();

  for (const domain of domains) {
    const normalized = domain.trim().toLowerCase().replace(/^\*\./, '');
    if (!normalized) {
      continue;
    }

    values.add(normalized);

    const segments = normalized.split('.');
    for (let index = 1; index < segments.length - 1; index += 1) {
      values.add(segments.slice(index).join('.'));
    }
  }

  return Array.from(values);
}

function buildDomainSuggestions(input: string, sources: string[], rows: string[]) {
  const normalizedInput = input.trim().toLowerCase();
  if (!normalizedInput) {
    return [];
  }

  const existingDomains = new Set(
    rows
      .map((row) => row.trim().toLowerCase())
      .filter((row) => row && row !== normalizedInput),
  );
  const suggestions: string[] = [];

  for (const source of sources) {
    if (source.startsWith(normalizedInput) && source !== normalizedInput) {
      suggestions.push(source);
    }

    const separatorIndex = normalizedInput.lastIndexOf('.');
    if (separatorIndex <= 0) {
      continue;
    }

    const prefix = normalizedInput.slice(0, separatorIndex);
    const suffixInput = normalizedInput.slice(separatorIndex + 1);

    if (!suffixInput || source.startsWith(suffixInput)) {
      suggestions.push(`${prefix}.${source}`);
    }
  }

  return suggestions.filter((suggestion, index) => {
    return (
      suggestion !== normalizedInput &&
      !existingDomains.has(suggestion) &&
      suggestions.indexOf(suggestion) === index
    );
  });
}

export function DomainListInput({
  value,
  onChange,
  onBlur,
  suggestionSources = [],
  placeholder = 'app.example.com',
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  suggestionSources?: string[];
  placeholder?: string;
}) {
  const listId = useId();
  const rows = splitDomainRows(value);
  const normalizedSources = useMemo(
    () => buildSuggestionSources(suggestionSources),
    [suggestionSources],
  );

  const updateRows = (nextRows: string[]) => {
    onChange(nextRows.join('\n'));
  };

  return (
    <div className="space-y-3">
      {rows.map((row, index) => {
        const suggestions = buildDomainSuggestions(row, normalizedSources, rows).slice(
          0,
          4,
        );

        return (
          <div key={`${index}-${rows.length}`} className="space-y-2">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <ResourceInput
                  value={row}
                  list={`${listId}-${index}`}
                  aria-label={`域名 ${index + 1}`}
                  placeholder={index === 0 ? placeholder : 'www.example.com'}
                  onBlur={onBlur}
                  onChange={(event) => {
                    const nextRows = rows.slice();
                    nextRows[index] = event.target.value;
                    updateRows(nextRows);
                  }}
                />
                <datalist id={`${listId}-${index}`}>
                  {suggestions.map((suggestion) => (
                    <option key={suggestion} value={suggestion} />
                  ))}
                </datalist>
              </div>

              <SecondaryButton
                type="button"
                aria-label={`新增域名输入框 ${index + 1}`}
                className="h-[46px] min-w-11 px-0"
                onClick={() => {
                  const nextRows = rows.slice();
                  nextRows.splice(index + 1, 0, '');
                  updateRows(nextRows);
                }}
              >
                +
              </SecondaryButton>

              <SecondaryButton
                type="button"
                aria-label={`删除域名输入框 ${index + 1}`}
                className="h-[46px] min-w-11 px-0"
                disabled={rows.length === 1}
                onClick={() => {
                  if (rows.length === 1) {
                    updateRows(['']);
                    return;
                  }

                  updateRows(rows.filter((_, rowIndex) => rowIndex !== index));
                }}
              >
                -
              </SecondaryButton>
            </div>

            {suggestions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-1 text-xs text-[var(--foreground-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--foreground-primary)]"
                    onClick={() => {
                      const nextRows = rows.slice();
                      nextRows[index] = suggestion;
                      updateRows(nextRows);
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}

          </div>
        );
      })}
    </div>
  );
}
