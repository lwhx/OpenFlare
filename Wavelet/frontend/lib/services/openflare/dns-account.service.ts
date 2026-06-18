import {LegacyOpenFlareBaseService} from './legacy-base.service';
import type {DnsAccountItem, DnsAccountMutationPayload} from './types';

export class DnsAccountService extends LegacyOpenFlareBaseService {
  protected static readonly basePath = '/api/dns-accounts';

  static async list(): Promise<DnsAccountItem[]> {
    return this.legacyGet<DnsAccountItem[]>('/');
  }

  static async create(
    payload: DnsAccountMutationPayload,
  ): Promise<DnsAccountItem> {
    return this.legacyPost<DnsAccountItem>('/', payload);
  }

  static async update(
    id: number,
    payload: DnsAccountMutationPayload,
  ): Promise<DnsAccountItem> {
    return this.legacyPost<DnsAccountItem>(`/${id}/update`, payload);
  }

  static async delete(id: number): Promise<void> {
    return this.legacyPost<void>(`/${id}/delete`);
  }
}