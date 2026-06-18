import {LegacyOpenFlareBaseService} from './legacy-base.service';
import type {
  AccessLogCleanupPayload,
  AccessLogCleanupResult,
  AccessLogFilters,
  AccessLogIPSummaryFilters,
  AccessLogIPSummaryList,
  AccessLogIPTrend,
  AccessLogIPTrendFilters,
  AccessLogList,
  FoldedAccessLogFilters,
  FoldedAccessLogIPFilters,
  FoldedAccessLogIPList,
  FoldedAccessLogList,
} from './types';

function buildSearchParams(filters: object): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  Object.entries(filters as Record<string, string | number | undefined>).forEach(
    ([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      params[key] = value;
    },
  );
  return params;
}

export class AccessLogService extends LegacyOpenFlareBaseService {
  protected static override readonly basePath = '/api/access-logs';

  static list(filters: AccessLogFilters = {}): Promise<AccessLogList> {
    return this.legacyGet<AccessLogList>('/', buildSearchParams(filters));
  }

  static listFolds(
    filters: FoldedAccessLogFilters,
  ): Promise<FoldedAccessLogList> {
    return this.legacyGet<FoldedAccessLogList>(
      '/folds',
      buildSearchParams(filters),
    );
  }

  static listFoldIPs(
    filters: FoldedAccessLogIPFilters,
  ): Promise<FoldedAccessLogIPList> {
    return this.legacyGet<FoldedAccessLogIPList>(
      '/folds/ip-summary',
      buildSearchParams(filters),
    );
  }

  static listIPSummaries(
    filters: AccessLogIPSummaryFilters = {},
  ): Promise<AccessLogIPSummaryList> {
    return this.legacyGet<AccessLogIPSummaryList>(
      '/ip-summary',
      buildSearchParams(filters),
    );
  }

  static getIPTrend(
    filters: AccessLogIPTrendFilters,
  ): Promise<AccessLogIPTrend> {
    return this.legacyGet<AccessLogIPTrend>(
      '/ip-summary/trend',
      buildSearchParams(filters),
    );
  }

  static cleanup(
    payload: AccessLogCleanupPayload,
  ): Promise<AccessLogCleanupResult> {
    return this.legacyPost<AccessLogCleanupResult>('/cleanup', payload);
  }
}
