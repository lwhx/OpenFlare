import {LegacyOpenFlareBaseService} from './legacy-base.service';
import type {
  WAFIPGroup,
  WAFIPGroupAutoTestPayload,
  WAFIPGroupAutoTestResult,
  WAFIPGroupPayload,
  WAFIPGroupSyncResult,
  WAFRuleGroup,
  WAFRuleGroupPayload,
  WAFSiteRuleGroups,
} from './types';

export class WafService extends LegacyOpenFlareBaseService {
  protected static readonly basePath = '/api/waf';

  static async listRuleGroups(): Promise<WAFRuleGroup[]> {
    return this.legacyGet<WAFRuleGroup[]>('/rule-groups');
  }

  static async getRuleGroup(id: number): Promise<WAFRuleGroup> {
    return this.legacyGet<WAFRuleGroup>(`/rule-groups/${id}`);
  }

  static async createRuleGroup(payload: WAFRuleGroupPayload): Promise<WAFRuleGroup> {
    return this.legacyPost<WAFRuleGroup>('/rule-groups', payload);
  }

  static async updateRuleGroup(
    id: number,
    payload: WAFRuleGroupPayload,
  ): Promise<WAFRuleGroup> {
    return this.legacyPost<WAFRuleGroup>(`/rule-groups/${id}/update`, payload);
  }

  static async deleteRuleGroup(id: number): Promise<void> {
    return this.legacyPost<void>(`/rule-groups/${id}/delete`);
  }

  static async updateRuleGroupSites(id: number, ids: number[]): Promise<WAFRuleGroup> {
    return this.legacyPost<WAFRuleGroup>(`/rule-groups/${id}/sites`, { ids });
  }

  static async listSiteRuleGroups(routeId: number): Promise<WAFSiteRuleGroups> {
    return this.legacyGet<WAFSiteRuleGroups>(`/sites/${routeId}/rule-groups`);
  }

  static async updateSiteRuleGroups(
    routeId: number,
    ids: number[],
  ): Promise<WAFSiteRuleGroups> {
    return this.legacyPost<WAFSiteRuleGroups>(`/sites/${routeId}/rule-groups`, {
      ids,
    });
  }

  static async listIPGroups(): Promise<WAFIPGroup[]> {
    return this.legacyGet<WAFIPGroup[]>('/ip-groups');
  }

  static async getIPGroup(id: number): Promise<WAFIPGroup> {
    return this.legacyGet<WAFIPGroup>(`/ip-groups/${id}`);
  }

  static async createIPGroup(payload: WAFIPGroupPayload): Promise<WAFIPGroup> {
    return this.legacyPost<WAFIPGroup>('/ip-groups', payload);
  }

  static async updateIPGroup(id: number, payload: WAFIPGroupPayload): Promise<WAFIPGroup> {
    return this.legacyPost<WAFIPGroup>(`/ip-groups/${id}/update`, payload);
  }

  static async deleteIPGroup(id: number): Promise<void> {
    return this.legacyPost<void>(`/ip-groups/${id}/delete`);
  }

  static async testIPGroup(
    payload: WAFIPGroupAutoTestPayload,
  ): Promise<WAFIPGroupAutoTestResult> {
    return this.legacyPost<WAFIPGroupAutoTestResult>('/ip-groups/test', payload);
  }

  static async syncIPGroup(id: number): Promise<WAFIPGroupSyncResult> {
    return this.legacyPost<WAFIPGroupSyncResult>(`/ip-groups/${id}/sync`);
  }
}
