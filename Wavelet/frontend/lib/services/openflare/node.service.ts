import {LegacyOpenFlareBaseService} from './legacy-base.service';
import type {
  NodeAgentReleaseInfo,
  NodeAgentUpdatePayload,
  NodeBootstrapToken,
  NodeItem,
  NodeMutationPayload,
  NodeObservability,
  ReleaseChannel,
} from './types';

export class NodeService extends LegacyOpenFlareBaseService {
  protected static readonly basePath = '/api/nodes';

  static async listNodes(): Promise<NodeItem[]> {
    return this.legacyGet<NodeItem[]>('/');
  }

  static async createNode(payload: NodeMutationPayload): Promise<NodeItem> {
    return this.legacyPost<NodeItem>('/', payload);
  }

  static async updateNode(id: number, payload: NodeMutationPayload): Promise<NodeItem> {
    return this.legacyPost<NodeItem>(`/${id}/update`, payload);
  }

  static async deleteNode(id: number): Promise<void> {
    return this.legacyPost<void>(`/${id}/delete`);
  }

  static async getBootstrapToken(): Promise<NodeBootstrapToken> {
    return this.legacyGet<NodeBootstrapToken>('/bootstrap-token');
  }

  static async rotateBootstrapToken(): Promise<NodeBootstrapToken> {
    return this.legacyPost<NodeBootstrapToken>('/bootstrap-token/rotate');
  }

  static async requestAgentUpdate(
    id: number,
    payload?: NodeAgentUpdatePayload,
  ): Promise<NodeItem> {
    return this.legacyPost<NodeItem>(`/${id}/agent-update`, payload ?? {});
  }

  static async requestForceSync(id: number): Promise<NodeItem> {
    return this.legacyPost<NodeItem>(`/${id}/force-sync`);
  }

  static async requestOpenrestyRestart(id: number): Promise<NodeItem> {
    return this.legacyPost<NodeItem>(`/${id}/openresty-restart`);
  }

  static async getAgentRelease(
    id: number,
    channel: ReleaseChannel = 'stable',
  ): Promise<NodeAgentReleaseInfo> {
    return this.legacyGet<NodeAgentReleaseInfo>(`/${id}/agent-release`, { channel });
  }

  static async getObservability(
    id: number,
    options?: { hours?: number; limit?: number },
  ): Promise<NodeObservability> {
    return this.legacyGet<NodeObservability>(`/${id}/observability`, {
      hours: options?.hours,
      limit: options?.limit,
    });
  }
}
