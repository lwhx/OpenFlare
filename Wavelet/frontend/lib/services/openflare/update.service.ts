import {LegacyOpenFlareBaseService} from './legacy-base.service';
import type {LatestReleaseInfo, ReleaseChannel} from './types';

/**
 * OpenFlare 服务端升级 API（遗留 `/api/update/*`）。
 *
 * 可选集成：在顶栏或 Admin 升级入口调用 `getLatestRelease()` 展示版本与更新状态；
 * 完整升级流程（upgrade / manual-upload / logs WebSocket）可对接 Wavelet `admin/updater`。
 */
export class UpdateService extends LegacyOpenFlareBaseService {
  protected static override readonly basePath = '/api/update';

  static getLatestRelease(channel: ReleaseChannel = 'stable'): Promise<LatestReleaseInfo> {
    return this.legacyGet<LatestReleaseInfo>('/latest-release', { channel });
  }
}
