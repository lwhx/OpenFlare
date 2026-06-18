import {LegacyOpenFlareBaseService} from './legacy-base.service';
import type {
  DatabaseCleanupPayload,
  DatabaseCleanupResult,
  GeoIPLookupResult,
  OptionBatchPayload,
  OptionItem,
} from './types';

export class OptionService extends LegacyOpenFlareBaseService {
  protected static override readonly basePath = '/api/option';

  static list(): Promise<OptionItem[]> {
    return this.legacyGet<OptionItem[]>('/');
  }

  static update(key: string, value: string): Promise<void> {
    return this.legacyPost<void>('/update', { key, value });
  }

  static updateBatch(options: OptionItem[]): Promise<void> {
    const payload: OptionBatchPayload = { options };
    return this.legacyPost<void>('/update-batch', payload);
  }

  static lookupGeoIP(provider: string, ip: string): Promise<GeoIPLookupResult> {
    return this.legacyPost<GeoIPLookupResult>('/geoip/lookup', { provider, ip });
  }

  static cleanupDatabase(
    payload: DatabaseCleanupPayload,
  ): Promise<DatabaseCleanupResult> {
    return this.legacyPost<DatabaseCleanupResult>('/database/cleanup', payload);
  }
}
