import { request } from '@/request';
import { IApiResponse } from '@/types/common';
import type {
  IA2aInvokeRequest,
  IA2aInvokeResult,
  IA2aPublication,
  IA2aRemoteAgent,
  ICreateA2aAgentParams,
  IListA2aAgentsByCodesParams,
  IListA2aAgentsParams,
  IPagingList,
  IPublishA2aParams,
  IUpdateA2aAgentParams,
} from '@/types/a2a';

export async function createA2aAgent(
  params: ICreateA2aAgentParams,
): Promise<IApiResponse<string>> {
  const response = await request({
    url: '/console/v1/a2a-agents',
    method: 'POST',
    data: params,
  });
  return response.data as IApiResponse<string>;
}

export async function updateA2aAgent(
  params: IUpdateA2aAgentParams,
): Promise<IApiResponse<null>> {
  const response = await request({
    url: '/console/v1/a2a-agents',
    method: 'PUT',
    data: params,
  });
  return response.data as IApiResponse<null>;
}

export async function deleteA2aAgent(
  agentCode: string,
): Promise<IApiResponse<null>> {
  const response = await request({
    url: `/console/v1/a2a-agents/${agentCode}`,
    method: 'DELETE',
  });
  return response.data as IApiResponse<null>;
}

export async function getA2aAgent(
  agentCode: string,
): Promise<IApiResponse<IA2aRemoteAgent>> {
  const response = await request({
    url: `/console/v1/a2a-agents/${agentCode}`,
    method: 'GET',
  });
  return response.data as IApiResponse<IA2aRemoteAgent>;
}

export async function listA2aAgents(
  params: IListA2aAgentsParams,
): Promise<IApiResponse<IPagingList<IA2aRemoteAgent>>> {
  const response = await request({
    url: '/console/v1/a2a-agents',
    method: 'GET',
    params,
  });
  return response.data as IApiResponse<IPagingList<IA2aRemoteAgent>>;
}

export async function listA2aAgentsByCodes(
  params: IListA2aAgentsByCodesParams,
): Promise<IApiResponse<IA2aRemoteAgent[]>> {
  const response = await request({
    url: '/console/v1/a2a-agents/query-by-codes',
    method: 'POST',
    data: params,
  });
  return response.data as IApiResponse<IA2aRemoteAgent[]>;
}

export async function debugA2aInvoke(
  params: IA2aInvokeRequest,
): Promise<IApiResponse<IA2aInvokeResult>> {
  const response = await request({
    url: '/console/v1/a2a-agents/debug-invoke',
    method: 'POST',
    data: params,
  });
  return response.data as IApiResponse<IA2aInvokeResult>;
}

export async function previewA2aCard(
  agentCode: string,
): Promise<IApiResponse<Record<string, any>>> {
  const response = await request({
    url: `/console/v1/a2a-agents/${agentCode}/card`,
    method: 'GET',
  });
  return response.data as IApiResponse<Record<string, any>>;
}

export async function publishA2a(
  params: IPublishA2aParams,
): Promise<IApiResponse<IA2aPublication>> {
  const response = await request({
    url: '/console/v1/a2a/publications',
    method: 'POST',
    data: params,
  });
  return response.data as IApiResponse<IA2aPublication>;
}

export async function unpublishA2a(
  publicationCode: string,
): Promise<IApiResponse<null>> {
  const response = await request({
    url: `/console/v1/a2a/publications/${publicationCode}`,
    method: 'DELETE',
  });
  return response.data as IApiResponse<null>;
}

export async function listA2aPublications(params: {
  current?: number;
  size?: number;
}): Promise<IApiResponse<IPagingList<IA2aPublication>>> {
  const response = await request({
    url: '/console/v1/a2a/publications',
    method: 'GET',
    params,
  });
  return response.data as IApiResponse<IPagingList<IA2aPublication>>;
}

export async function getA2aPublication(
  publicationCode: string,
): Promise<IApiResponse<IA2aPublication>> {
  const response = await request({
    url: `/console/v1/a2a/publications/${publicationCode}`,
    method: 'GET',
  });
  return response.data as IApiResponse<IA2aPublication>;
}

export async function getA2aPublicationByAppId(
  appId: string,
): Promise<IApiResponse<IA2aPublication>> {
  const response = await request({
    url: `/console/v1/a2a/publications/by-app/${appId}`,
    method: 'GET',
  });
  return response.data as IApiResponse<IA2aPublication>;
}
