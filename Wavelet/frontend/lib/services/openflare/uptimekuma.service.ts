import {LegacyOpenFlareBaseService} from './legacy-base.service';

export class UptimeKumaService extends LegacyOpenFlareBaseService {
  protected static override readonly basePath = '/api/uptimekuma';

  static sync(): Promise<void> {
    return this.legacyPost<void>('/sync');
  }
}
