import {LegacyOpenFlareBaseService} from './legacy-base.service';
import type {OpenFlarePublicStatus} from './types';

export class StatusService extends LegacyOpenFlareBaseService {
  protected static override readonly basePath = '/api';

  static getPublicStatus(): Promise<OpenFlarePublicStatus> {
    return this.legacyGet<OpenFlarePublicStatus>('/status');
  }
}
