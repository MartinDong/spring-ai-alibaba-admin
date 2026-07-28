/*
 * Copyright 2025 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.alibaba.cloud.ai.studio.core.base.service.impl;

import com.alibaba.cloud.ai.studio.core.a2a.A2aNacosRegistryHelper;
import com.alibaba.cloud.ai.studio.core.base.entity.A2aPublicationEntity;
import com.alibaba.cloud.ai.studio.core.base.entity.A2aRemoteAgentEntity;
import com.alibaba.cloud.ai.studio.core.base.mapper.A2aPublicationMapper;
import com.alibaba.cloud.ai.studio.core.base.mapper.A2aRemoteAgentMapper;
import com.alibaba.cloud.ai.studio.core.base.service.A2aPublicationService;
import com.alibaba.cloud.ai.studio.core.base.service.AppService;
import com.alibaba.cloud.ai.studio.core.context.RequestContextHolder;
import com.alibaba.cloud.ai.studio.core.utils.common.IdGenerator;
import com.alibaba.cloud.ai.studio.runtime.domain.PagingList;
import com.alibaba.cloud.ai.studio.runtime.domain.RequestContext;
import com.alibaba.cloud.ai.studio.runtime.domain.a2a.A2aPublicationDetail;
import com.alibaba.cloud.ai.studio.runtime.domain.a2a.A2aPublicationRequest;
import com.alibaba.cloud.ai.studio.runtime.domain.app.Application;
import com.alibaba.cloud.ai.studio.runtime.domain.app.ApplicationVersion;
import com.alibaba.cloud.ai.studio.runtime.enums.A2aSourceTypeEnum;
import com.alibaba.cloud.ai.studio.runtime.enums.A2aStatusEnum;
import com.alibaba.cloud.ai.studio.runtime.enums.AppType;
import com.alibaba.cloud.ai.studio.runtime.enums.ErrorCode;
import com.alibaba.cloud.ai.studio.runtime.exception.BizException;
import com.alibaba.cloud.ai.studio.runtime.utils.JsonUtils;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import io.a2a.spec.AgentCapabilities;
import io.a2a.spec.AgentCard;
import io.a2a.spec.AgentSkill;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Implementation of A2A publication (Studio app → A2A server card).
 *
 * @since 1.0.0.3
 */
@Service
public class A2aPublicationServiceImpl extends ServiceImpl<A2aPublicationMapper, A2aPublicationEntity>
		implements A2aPublicationService {

	/** Deterministic agent_code prefix so published apps appear in A2A selector. */
	static final String LOCAL_AGENT_CODE_PREFIX = "local_a2a_";

	private final AppService appService;

	private final A2aNacosRegistryHelper a2aNacosRegistryHelper;

	private final A2aRemoteAgentMapper a2aRemoteAgentMapper;

	@Value("${spring.ai.alibaba.a2a.server.public-base-url:http://localhost:8080}")
	private String publicBaseUrl;

	public A2aPublicationServiceImpl(AppService appService, A2aNacosRegistryHelper a2aNacosRegistryHelper,
			A2aRemoteAgentMapper a2aRemoteAgentMapper) {
		this.appService = appService;
		this.a2aNacosRegistryHelper = a2aNacosRegistryHelper;
		this.a2aRemoteAgentMapper = a2aRemoteAgentMapper;
	}

	@Override
	public A2aPublicationDetail publish(A2aPublicationRequest request) {
		try {
			RequestContext context = RequestContextHolder.getRequestContext();
			if (request == null || StringUtils.isBlank(request.getAppId())) {
				throw new BizException(ErrorCode.MISSING_PARAMS.toError("appId"));
			}

			ApplicationVersion version = appService.getAppVersion(request.getAppId(), "lastPublished");
			if (version == null) {
				throw new BizException(ErrorCode.A2A_PUBLISH_ERROR
					.toError("app has no published version; publish the app first"));
			}

			Application app = appService.getApp(request.getAppId());
			if (app == null) {
				throw new BizException(ErrorCode.A2A_PUBLISH_ERROR.toError("app not found"));
			}

			String appType = StringUtils.isNotBlank(request.getAppType()) ? request.getAppType()
					: (app.getType() == null ? AppType.BASIC.getValue() : app.getType().getValue());
			String agentName = StringUtils.isNotBlank(request.getAgentName()) ? request.getAgentName() : app.getName();
			String description = StringUtils.isNotBlank(request.getDescription()) ? request.getDescription()
					: app.getDescription();
			Integer enabled = request.getEnabled() == null ? 1 : request.getEnabled();

			A2aPublicationEntity existing = findByAppId(context.getWorkspaceId(), request.getAppId());
			A2aPublicationEntity entity;
			if (existing == null) {
				entity = new A2aPublicationEntity();
				entity.setPublicationCode(IdGenerator.idStr());
				entity.setAppId(request.getAppId());
				entity.setGmtCreate(new Date());
				entity.setWorkspaceId(context.getWorkspaceId());
				entity.setAccountId(context.getAccountId());
			}
			else {
				entity = existing;
			}

			entity.setAppType(appType);
			entity.setAgentName(agentName);
			entity.setDescription(description);
			entity.setEnabled(enabled);
			entity.setStatus(A2aStatusEnum.ENABLED.getCode());
			entity.setGmtModified(new Date());

			String cardJson = buildAgentCardJson(entity);
			entity.setCardJson(cardJson);

			boolean registerNacos = request.getRegisterNacos() == null || Boolean.TRUE.equals(request.getRegisterNacos());
			boolean registered = false;
			if (registerNacos) {
				try {
					AgentCard card = buildSdkAgentCard(entity);
					registered = a2aNacosRegistryHelper.register(card);
				}
				catch (Exception e) {
					// Nacos A2A API may be unavailable; keep publication local
				}
			}
			entity.setNacosRegistered(registered ? 1 : 0);

			if (existing == null) {
				this.save(entity);
			}
			else {
				this.updateById(entity);
			}
			if (enabled != null && enabled == 1) {
				upsertLocalSelectableAgent(entity);
			}
			else {
				softDeleteLocalSelectableAgent(entity.getWorkspaceId(), entity.getAppId());
			}
			return toDetail(entity);
		}
		catch (BizException e) {
			throw e;
		}
		catch (Exception e) {
			throw new BizException(ErrorCode.A2A_PUBLISH_ERROR.toError(e.getMessage()), e);
		}
	}

	@Override
	public void unpublish(String publicationCode) {
		try {
			RequestContext context = RequestContextHolder.getRequestContext();
			A2aPublicationEntity entity = getByCode(context.getWorkspaceId(), publicationCode);
			if (entity == null) {
				throw new BizException(ErrorCode.A2A_NOT_FOUND.toError());
			}
			entity.setEnabled(0);
			entity.setStatus(A2aStatusEnum.DELETED.getCode());
			entity.setGmtModified(new Date());
			this.updateById(entity);
			softDeleteLocalSelectableAgent(entity.getWorkspaceId(), entity.getAppId());
		}
		catch (BizException e) {
			throw e;
		}
		catch (Exception e) {
			throw new BizException(ErrorCode.A2A_UNPUBLISH_ERROR.toError(e.getMessage()), e);
		}
	}

	@Override
	public void syncLocalSelectableAgents() {
		RequestContext context = RequestContextHolder.getRequestContext();
		if (context == null || StringUtils.isBlank(context.getWorkspaceId())) {
			return;
		}
		LambdaQueryWrapper<A2aPublicationEntity> wrapper = new LambdaQueryWrapper<>();
		wrapper.eq(A2aPublicationEntity::getWorkspaceId, context.getWorkspaceId());
		wrapper.eq(A2aPublicationEntity::getEnabled, 1);
		wrapper.eq(A2aPublicationEntity::getStatus, A2aStatusEnum.ENABLED.getCode());
		List<A2aPublicationEntity> publications = this.list(wrapper);
		if (CollectionUtils.isEmpty(publications)) {
			return;
		}
		for (A2aPublicationEntity publication : publications) {
			upsertLocalSelectableAgent(publication);
		}
	}

	@Override
	public PagingList<A2aPublicationDetail> list(Integer current, Integer size) {
		RequestContext context = RequestContextHolder.getRequestContext();
		int pageNo = current == null ? 1 : current;
		int pageSize = size == null ? 10 : size;
		Page<A2aPublicationEntity> page = new Page<>(pageNo, pageSize);
		LambdaQueryWrapper<A2aPublicationEntity> wrapper = new LambdaQueryWrapper<>();
		wrapper.eq(A2aPublicationEntity::getWorkspaceId, context.getWorkspaceId());
		wrapper.ne(A2aPublicationEntity::getStatus, A2aStatusEnum.DELETED.getCode());
		wrapper.orderByDesc(A2aPublicationEntity::getId);
		IPage<A2aPublicationEntity> pageResult = this.page(page, wrapper);
		List<A2aPublicationDetail> details = new ArrayList<>();
		if (!CollectionUtils.isEmpty(pageResult.getRecords())) {
			for (A2aPublicationEntity entity : pageResult.getRecords()) {
				details.add(toDetail(entity));
			}
		}
		return new PagingList<>(pageNo, pageSize, pageResult.getTotal(), details);
	}

	@Override
	public A2aPublicationDetail get(String publicationCode) {
		RequestContext context = RequestContextHolder.getRequestContext();
		A2aPublicationEntity entity = getByCode(context.getWorkspaceId(), publicationCode);
		if (entity == null) {
			throw new BizException(ErrorCode.A2A_NOT_FOUND.toError());
		}
		return toDetail(entity);
	}

	@Override
	public A2aPublicationDetail getByAppId(String appId) {
		RequestContext context = RequestContextHolder.getRequestContext();
		A2aPublicationEntity entity = findByAppId(context.getWorkspaceId(), appId);
		return entity == null ? null : toDetail(entity);
	}

	@Override
	public String buildAgentCard(String appId) {
		RequestContext context = RequestContextHolder.getRequestContext();
		A2aPublicationEntity entity = findByAppId(context.getWorkspaceId(), appId);
		if (entity == null) {
			Application app = appService.getApp(appId);
			if (app == null) {
				throw new BizException(ErrorCode.A2A_NOT_FOUND.toError());
			}
			entity = new A2aPublicationEntity();
			entity.setAppId(appId);
			entity.setAppType(app.getType() == null ? AppType.BASIC.getValue() : app.getType().getValue());
			entity.setAgentName(app.getName());
			entity.setDescription(app.getDescription());
		}
		return buildAgentCardJson(entity);
	}

	@Override
	public A2aPublicationDetail getEnabledByAppId(String appId) {
		LambdaQueryWrapper<A2aPublicationEntity> wrapper = new LambdaQueryWrapper<>();
		wrapper.eq(A2aPublicationEntity::getAppId, appId);
		wrapper.eq(A2aPublicationEntity::getEnabled, 1);
		wrapper.eq(A2aPublicationEntity::getStatus, A2aStatusEnum.ENABLED.getCode());
		wrapper.orderByDesc(A2aPublicationEntity::getGmtModified);
		wrapper.last("limit 1");
		A2aPublicationEntity entity = this.getOne(wrapper);
		return entity == null ? null : toDetail(entity);
	}

	private String buildAgentCardJson(A2aPublicationEntity entity) {
		String base = trimTrailingSlash(publicBaseUrl);
		String url = base + "/a2a/" + entity.getAppId();
		Map<String, Object> card = new HashMap<>();
		card.put("name", entity.getAgentName());
		card.put("description", entity.getDescription() == null ? "" : entity.getDescription());
		card.put("url", url);
		card.put("version", "1.0.0");
		card.put("protocolVersion", "0.3.0");
		card.put("preferredTransport", "JSONRPC");
		card.put("defaultInputModes", List.of("text/plain"));
		card.put("defaultOutputModes", List.of("text/plain"));
		card.put("capabilities", Map.of("streaming", false, "pushNotifications", false, "stateTransitionHistory", false));
		card.put("skills", List.of(Map.of("id", "chat", "name", "chat", "description",
				"Chat with the published Studio application", "tags", List.of("chat"), "examples", List.of())));
		card.put("additionalInterfaces", List.of(Map.of("transport", "JSONRPC", "url", url)));
		return JsonUtils.toJson(card);
	}

	private AgentCard buildSdkAgentCard(A2aPublicationEntity entity) {
		String base = trimTrailingSlash(publicBaseUrl);
		String url = base + "/a2a/" + entity.getAppId();
		AgentSkill skill = new AgentSkill.Builder().id("chat")
			.name("chat")
			.description("Chat with the published Studio application")
			.tags(List.of("chat"))
			.examples(List.of())
			.build();
		return new AgentCard.Builder().name(entity.getAgentName())
			.description(entity.getDescription() == null ? "" : entity.getDescription())
			.url(url)
			.version("1.0.0")
			.protocolVersion("0.3.0")
			.preferredTransport("JSONRPC")
			.defaultInputModes(List.of("text/plain"))
			.defaultOutputModes(List.of("text/plain"))
			.capabilities(new AgentCapabilities.Builder().streaming(false).build())
			.skills(List.of(skill))
			.build();
	}

	private A2aPublicationEntity getByCode(String workspaceId, String publicationCode) {
		LambdaQueryWrapper<A2aPublicationEntity> wrapper = new LambdaQueryWrapper<>();
		wrapper.eq(A2aPublicationEntity::getWorkspaceId, workspaceId);
		wrapper.eq(A2aPublicationEntity::getPublicationCode, publicationCode);
		wrapper.ne(A2aPublicationEntity::getStatus, A2aStatusEnum.DELETED.getCode());
		wrapper.last("limit 1");
		return this.getOne(wrapper);
	}

	private A2aPublicationEntity findByAppId(String workspaceId, String appId) {
		LambdaQueryWrapper<A2aPublicationEntity> wrapper = new LambdaQueryWrapper<>();
		wrapper.eq(A2aPublicationEntity::getWorkspaceId, workspaceId);
		wrapper.eq(A2aPublicationEntity::getAppId, appId);
		wrapper.ne(A2aPublicationEntity::getStatus, A2aStatusEnum.DELETED.getCode());
		wrapper.orderByDesc(A2aPublicationEntity::getGmtModified);
		wrapper.last("limit 1");
		return this.getOne(wrapper);
	}

	private A2aPublicationDetail toDetail(A2aPublicationEntity entity) {
		A2aPublicationDetail detail = new A2aPublicationDetail();
		detail.setPublicationCode(entity.getPublicationCode());
		detail.setAppId(entity.getAppId());
		detail.setAppType(entity.getAppType());
		detail.setAgentName(entity.getAgentName());
		detail.setDescription(entity.getDescription());
		detail.setEnabled(entity.getEnabled());
		detail.setCardJson(entity.getCardJson());
		detail.setNacosRegistered(entity.getNacosRegistered());
		detail.setWorkspaceId(entity.getWorkspaceId());
		detail.setAccountId(entity.getAccountId());
		detail.setStatus(entity.getStatus());
		detail.setGmtCreate(entity.getGmtCreate());
		detail.setGmtModified(entity.getGmtModified());
		return detail;
	}

	private String trimTrailingSlash(String url) {
		if (url == null) {
			return "";
		}
		String trimmed = url.trim();
		while (trimmed.endsWith("/")) {
			trimmed = trimmed.substring(0, trimmed.length() - 1);
		}
		return trimmed;
	}

	static String localAgentCode(String appId) {
		return LOCAL_AGENT_CODE_PREFIX + appId;
	}

	private void upsertLocalSelectableAgent(A2aPublicationEntity publication) {
		if (publication == null || StringUtils.isBlank(publication.getAppId())) {
			return;
		}
		String agentCode = localAgentCode(publication.getAppId());
		String cardUrl = trimTrailingSlash(publicBaseUrl) + "/.well-known/agents/" + publication.getAppId()
				+ "/agent.json";
		Date now = new Date();

		LambdaQueryWrapper<A2aRemoteAgentEntity> wrapper = new LambdaQueryWrapper<>();
		wrapper.eq(A2aRemoteAgentEntity::getWorkspaceId, publication.getWorkspaceId());
		wrapper.eq(A2aRemoteAgentEntity::getAgentCode, agentCode);
		wrapper.last("limit 1");
		A2aRemoteAgentEntity existing = a2aRemoteAgentMapper.selectOne(wrapper);

		if (existing == null) {
			A2aRemoteAgentEntity entity = new A2aRemoteAgentEntity();
			entity.setAgentCode(agentCode);
			entity.setName(publication.getAgentName());
			entity.setDescription(publication.getDescription());
			entity.setSourceType(A2aSourceTypeEnum.URL.getValue());
			entity.setCardUrl(cardUrl);
			entity.setCardJson(publication.getCardJson());
			entity.setWorkspaceId(publication.getWorkspaceId());
			entity.setAccountId(publication.getAccountId());
			entity.setStatus(A2aStatusEnum.ENABLED.getCode());
			entity.setGmtCreate(now);
			entity.setGmtModified(now);
			a2aRemoteAgentMapper.insert(entity);
			return;
		}

		existing.setName(publication.getAgentName());
		existing.setDescription(publication.getDescription());
		existing.setSourceType(A2aSourceTypeEnum.URL.getValue());
		existing.setCardUrl(cardUrl);
		existing.setCardJson(publication.getCardJson());
		existing.setStatus(A2aStatusEnum.ENABLED.getCode());
		existing.setGmtModified(now);
		a2aRemoteAgentMapper.updateById(existing);
	}

	private void softDeleteLocalSelectableAgent(String workspaceId, String appId) {
		if (StringUtils.isBlank(workspaceId) || StringUtils.isBlank(appId)) {
			return;
		}
		LambdaQueryWrapper<A2aRemoteAgentEntity> wrapper = new LambdaQueryWrapper<>();
		wrapper.eq(A2aRemoteAgentEntity::getWorkspaceId, workspaceId);
		wrapper.eq(A2aRemoteAgentEntity::getAgentCode, localAgentCode(appId));
		wrapper.last("limit 1");
		A2aRemoteAgentEntity existing = a2aRemoteAgentMapper.selectOne(wrapper);
		if (existing == null) {
			return;
		}
		existing.setStatus(A2aStatusEnum.DELETED.getCode());
		existing.setGmtModified(new Date());
		a2aRemoteAgentMapper.updateById(existing);
	}

}
