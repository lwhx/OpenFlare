import {LegacyOpenFlareBaseService} from './legacy-base.service';
import type {OriginDetail, OriginItem, OriginMutationPayload,} from './types';

export class OriginService extends LegacyOpenFlareBaseService {
  protected static override readonly basePath = '/api/origins';

  static list(): Promise<OriginItem[]> {
    return this.legacyGet<OriginItem[]>('/');
  }

  static get(id: number): Promise<OriginDetail> {
    return this.legacyGet<OriginDetail>(`/${id}`);
  }

  static create(payload: OriginMutationPayload): Promise<OriginItem> {
    return this.legacyPost<OriginItem>('/', payload);
  }

  static update(
    id: number,
    payload: OriginMutationPayload,
  ): Promise<OriginItem> {
    return this.legacyPost<OriginItem>(`/${id}/update`, payload);
  }

  static delete(id: number): Promise<void> {
    return this.legacyPost<void>(`/${id}/delete`);
  }
}
