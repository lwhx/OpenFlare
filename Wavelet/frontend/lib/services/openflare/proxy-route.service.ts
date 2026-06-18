import {LegacyOpenFlareBaseService} from './legacy-base.service';
import type {ProxyRouteItem, ProxyRouteMutationPayload} from './types';

export class ProxyRouteService extends LegacyOpenFlareBaseService {
  protected static readonly basePath = '/api/proxy-routes';

  static async list(): Promise<ProxyRouteItem[]> {
    return this.legacyGet<ProxyRouteItem[]>('/');
  }

  static async getById(id: number): Promise<ProxyRouteItem> {
    return this.legacyGet<ProxyRouteItem>(`/${id}`);
  }

  static async create(payload: ProxyRouteMutationPayload): Promise<ProxyRouteItem> {
    return this.legacyPost<ProxyRouteItem>('/', payload);
  }

  static async update(
    id: number,
    payload: ProxyRouteMutationPayload,
  ): Promise<ProxyRouteItem> {
    return this.legacyPost<ProxyRouteItem>(`/${id}/update`, payload);
  }

  static async delete(id: number): Promise<void> {
    return this.legacyPost<void>(`/${id}/delete`);
  }
}
