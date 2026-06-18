import type {InternalAxiosRequestConfig} from 'axios';

import {LegacyOpenFlareBaseService} from './legacy-base.service';
import type {
  ConfigDiffResult,
  ConfigPreviewResult,
  ConfigVersionCleanupPayload,
  ConfigVersionCleanupResult,
  ConfigVersionDetail,
  ConfigVersionSummary,
} from './types';

export class ConfigVersionService extends LegacyOpenFlareBaseService {
  protected static override readonly basePath = '/api/config-versions';

  static list(): Promise<ConfigVersionSummary[]> {
    return this.legacyGet<ConfigVersionSummary[]>('/');
  }

  static getActive(): Promise<ConfigVersionDetail> {
    return this.legacyGet<ConfigVersionDetail>('/active');
  }

  static preview(): Promise<ConfigPreviewResult> {
    return this.legacyGet<ConfigPreviewResult>('/preview');
  }

  static diff(): Promise<ConfigDiffResult> {
    return this.legacyGet<ConfigDiffResult>('/diff');
  }

  static getById(id: number): Promise<ConfigVersionDetail> {
    return this.legacyGet<ConfigVersionDetail>(`/${id}`);
  }

  static publish(force?: boolean): Promise<ConfigVersionDetail> {
    return this.legacyPost<ConfigVersionDetail>(
      '/publish',
      undefined,
      force
        ? ({ params: { force: true } } as InternalAxiosRequestConfig)
        : undefined,
    );
  }

  static activate(id: number): Promise<ConfigVersionDetail> {
    return this.legacyPost<ConfigVersionDetail>(`/${id}/activate`);
  }

  static cleanup(
    payload: ConfigVersionCleanupPayload,
  ): Promise<ConfigVersionCleanupResult> {
    return this.legacyPost<ConfigVersionCleanupResult>('/cleanup', payload);
  }
}
