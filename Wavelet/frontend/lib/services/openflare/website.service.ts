import {LegacyOpenFlareBaseService} from './legacy-base.service';
import type {ManagedDomainItem, ManagedDomainMatchResult, ManagedDomainMutationPayload,} from './types';

export class WebsiteService extends LegacyOpenFlareBaseService {
  protected static readonly basePath = '/api/managed-domains';

  static async list(): Promise<ManagedDomainItem[]> {
    return this.legacyGet<ManagedDomainItem[]>('/');
  }

  static async create(
    payload: ManagedDomainMutationPayload,
  ): Promise<ManagedDomainItem> {
    return this.legacyPost<ManagedDomainItem>('/', payload);
  }

  static async update(
    id: number,
    payload: ManagedDomainMutationPayload,
  ): Promise<ManagedDomainItem> {
    return this.legacyPost<ManagedDomainItem>(`/${id}/update`, payload);
  }

  static async delete(id: number): Promise<void> {
    return this.legacyPost<void>(`/${id}/delete`);
  }

  static async match(domain: string): Promise<ManagedDomainMatchResult> {
    return this.legacyGet<ManagedDomainMatchResult>('/match', {domain});
  }
}
