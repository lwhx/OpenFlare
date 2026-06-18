export { LegacyOpenFlareBaseService } from './legacy-base.service';
export type { LegacyApiResponse } from './legacy-base.service';

export { NodeService } from './node.service';
export { ProxyRouteService } from './proxy-route.service';
export { ConfigVersionService } from './config-version.service';
export { ApplyLogService } from './apply-log.service';

export type {
  ApplyLogCleanupPayload,
  ApplyLogCleanupResult,
  ApplyLogItem,
  ApplyLogList,
  ApplyLogListQuery,
  ApplyResult,
  ConfigDiffResult,
  ConfigOptionDiffItem,
  ConfigPreviewResult,
  ConfigVersionCleanupPayload,
  ConfigVersionCleanupResult,
  ConfigVersionDetail,
  ConfigVersionSummary,
  NodeAgentReleaseInfo,
  NodeAgentUpdatePayload,
  NodeBootstrapToken,
  NodeItem,
  NodeMutationPayload,
  NodeObservability,
  NodeStatus,
  NodeType,
  OpenrestyStatus,
  ProxyRouteConfigSection,
  ProxyRouteCustomHeader,
  ProxyRouteItem,
  ProxyRouteMutationPayload,
  ProxyRoutePoWConfig,
  ReleaseChannel,
  SupportFile,
} from './types';

import {ApplyLogService} from './apply-log.service';
import {ConfigVersionService} from './config-version.service';
import {NodeService} from './node.service';
import {ProxyRouteService} from './proxy-route.service';

export const openflareServices = {
  node: NodeService,
  proxyRoute: ProxyRouteService,
  configVersion: ConfigVersionService,
  applyLog: ApplyLogService,
} as const;
