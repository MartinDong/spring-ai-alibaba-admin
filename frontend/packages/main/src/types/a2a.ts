import $i18n from '@/i18n';

export enum A2aSourceType {
  URL = 'URL',
  NACOS = 'NACOS',
}

export enum A2aStatus {
  DISABLED = 0,
  ENABLED = 1,
  DELETED = 3,
}

export const A2aStatusMap = {
  [A2aStatus.DISABLED]: {
    color: 'error',
    text: $i18n.get({ id: 'main.types.a2a.disabled', dm: '已停用' }),
  },
  [A2aStatus.ENABLED]: {
    color: 'success',
    text: $i18n.get({ id: 'main.types.a2a.enabled', dm: '已启用' }),
  },
  [A2aStatus.DELETED]: {
    color: 'default',
    text: $i18n.get({ id: 'main.types.a2a.deleted', dm: '已删除' }),
  },
};

export const A2A_MAX_LIMIT = 5;

export interface IA2aRemoteAgent {
  agent_code: string;
  name: string;
  description?: string;
  source_type: A2aSourceType | string;
  card_url?: string;
  nacos_agent_name?: string;
  card_json?: string;
  status?: A2aStatus | number;
  gmt_modified?: string;
}

export interface ICreateA2aAgentParams {
  name: string;
  description?: string;
  source_type: A2aSourceType | string;
  card_url?: string;
  nacos_agent_name?: string;
}

export interface IUpdateA2aAgentParams extends ICreateA2aAgentParams {
  agent_code: string;
  status?: number;
}

export interface IListA2aAgentsParams {
  current?: number;
  size?: number;
  name?: string;
  status?: number;
  source_type?: string;
}

export interface IListA2aAgentsByCodesParams {
  agent_codes: string[];
}

export interface IA2aInvokeRequest {
  agent_code: string;
  input: string;
}

export interface IA2aInvokeResult {
  output?: string;
}

export interface IA2aPublication {
  publication_code: string;
  app_id: string;
  app_type?: string;
  agent_name?: string;
  description?: string;
  enabled?: number;
  card_json?: string;
  nacos_registered?: number;
  workspace_id?: string;
  account_id?: string;
  status?: number;
  gmt_create?: string;
  gmt_modified?: string;
}

export interface IPublishA2aParams {
  app_id: string;
  app_type?: string;
  agent_name?: string;
  description?: string;
  enabled?: number;
  register_nacos?: boolean;
}

export interface IPagingList<T> {
  current: number;
  size: number;
  total: number;
  records: T[];
}
