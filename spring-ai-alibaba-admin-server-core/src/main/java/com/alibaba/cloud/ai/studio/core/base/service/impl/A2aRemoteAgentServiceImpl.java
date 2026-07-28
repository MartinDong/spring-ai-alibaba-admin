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

import com.alibaba.cloud.ai.studio.core.base.entity.A2aRemoteAgentEntity;
import com.alibaba.cloud.ai.studio.core.base.manager.A2aClientManager;
import com.alibaba.cloud.ai.studio.core.base.mapper.A2aRemoteAgentMapper;
import com.alibaba.cloud.ai.studio.core.base.service.A2aPublicationService;
import com.alibaba.cloud.ai.studio.core.base.service.A2aRemoteAgentService;
import com.alibaba.cloud.ai.studio.core.context.RequestContextHolder;
import com.alibaba.cloud.ai.studio.core.utils.common.IdGenerator;
import com.alibaba.cloud.ai.studio.runtime.domain.PagingList;
import com.alibaba.cloud.ai.studio.runtime.domain.RequestContext;
import com.alibaba.cloud.ai.studio.runtime.domain.a2a.A2aInvokeResult;
import com.alibaba.cloud.ai.studio.runtime.domain.a2a.A2aRemoteAgentDetail;
import com.alibaba.cloud.ai.studio.runtime.domain.a2a.A2aRemoteAgentQuery;
import com.alibaba.cloud.ai.studio.runtime.enums.A2aSourceTypeEnum;
import com.alibaba.cloud.ai.studio.runtime.enums.A2aStatusEnum;
import com.alibaba.cloud.ai.studio.runtime.enums.ErrorCode;
import com.alibaba.cloud.ai.studio.runtime.exception.BizException;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.apache.commons.lang3.StringUtils;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Implementation of remote A2A agent CRUD and invoke.
 *
 * @since 1.0.0.3
 */
@Service
public class A2aRemoteAgentServiceImpl extends ServiceImpl<A2aRemoteAgentMapper, A2aRemoteAgentEntity>
		implements A2aRemoteAgentService {

	private final A2aClientManager a2aClientManager;

	private final A2aPublicationService a2aPublicationService;

	public A2aRemoteAgentServiceImpl(A2aClientManager a2aClientManager,
			@Lazy A2aPublicationService a2aPublicationService) {
		this.a2aClientManager = a2aClientManager;
		this.a2aPublicationService = a2aPublicationService;
	}

	@Override
	public String create(A2aRemoteAgentDetail detail) {
		try {
			RequestContext context = RequestContextHolder.getRequestContext();
			validateDetail(detail, false);

			A2aRemoteAgentEntity entity = new A2aRemoteAgentEntity();
			String agentCode = IdGenerator.idStr();
			entity.setAgentCode(agentCode);
			entity.setName(detail.getName());
			entity.setDescription(detail.getDescription());
			entity.setSourceType(normalizeSourceType(detail.getSourceType()));
			entity.setCardUrl(detail.getCardUrl());
			entity.setNacosAgentName(detail.getNacosAgentName());
			entity.setWorkspaceId(context.getWorkspaceId());
			entity.setAccountId(context.getAccountId());
			entity.setStatus(A2aStatusEnum.ENABLED.getCode());
			entity.setGmtCreate(new Date());
			entity.setGmtModified(new Date());

			try {
				entity.setCardJson(doFetchCard(entity));
			}
			catch (Exception e) {
				// allow create without card; card can be refreshed later
				entity.setCardJson(detail.getCardJson());
			}

			this.save(entity);
			return agentCode;
		}
		catch (BizException e) {
			throw e;
		}
		catch (Exception e) {
			throw new BizException(ErrorCode.CREATE_A2A_ERROR.toError(e.getMessage()), e);
		}
	}

	@Override
	public void update(A2aRemoteAgentDetail detail) {
		try {
			RequestContext context = RequestContextHolder.getRequestContext();
			if (StringUtils.isBlank(detail.getAgentCode())) {
				throw new BizException(ErrorCode.MISSING_PARAMS.toError("agentCode"));
			}
			validateDetail(detail, true);

			A2aRemoteAgentEntity entity = getByCode(context.getWorkspaceId(), detail.getAgentCode());
			if (entity == null) {
				throw new BizException(ErrorCode.A2A_NOT_FOUND.toError());
			}

			entity.setName(detail.getName());
			entity.setDescription(detail.getDescription());
			entity.setSourceType(normalizeSourceType(detail.getSourceType()));
			entity.setCardUrl(detail.getCardUrl());
			entity.setNacosAgentName(detail.getNacosAgentName());
			if (detail.getStatus() != null) {
				entity.setStatus(detail.getStatus());
			}
			entity.setGmtModified(new Date());

			try {
				entity.setCardJson(doFetchCard(entity));
			}
			catch (Exception e) {
				if (StringUtils.isNotBlank(detail.getCardJson())) {
					entity.setCardJson(detail.getCardJson());
				}
			}

			this.updateById(entity);
		}
		catch (BizException e) {
			throw e;
		}
		catch (Exception e) {
			throw new BizException(ErrorCode.UPDATE_A2A_ERROR.toError(e.getMessage()), e);
		}
	}

	@Override
	public void delete(String agentCode) {
		try {
			RequestContext context = RequestContextHolder.getRequestContext();
			A2aRemoteAgentEntity entity = getByCode(context.getWorkspaceId(), agentCode);
			if (entity == null) {
				throw new BizException(ErrorCode.A2A_NOT_FOUND.toError());
			}
			entity.setStatus(A2aStatusEnum.DELETED.getCode());
			entity.setGmtModified(new Date());
			this.updateById(entity);
		}
		catch (BizException e) {
			throw e;
		}
		catch (Exception e) {
			throw new BizException(ErrorCode.DELETE_A2A_ERROR.toError(), e);
		}
	}

	@Override
	public A2aRemoteAgentDetail get(String agentCode) {
		RequestContext context = RequestContextHolder.getRequestContext();
		A2aRemoteAgentEntity entity = getByCode(context.getWorkspaceId(), agentCode);
		if (entity == null) {
			throw new BizException(ErrorCode.A2A_NOT_FOUND.toError());
		}
		return toDetail(entity);
	}

	@Override
	public PagingList<A2aRemoteAgentDetail> list(A2aRemoteAgentQuery query) {
		a2aPublicationService.syncLocalSelectableAgents();
		RequestContext context = RequestContextHolder.getRequestContext();
		Page<A2aRemoteAgentEntity> page = new Page<>(query.getCurrent(), query.getSize());
		LambdaQueryWrapper<A2aRemoteAgentEntity> wrapper = new LambdaQueryWrapper<>();
		wrapper.eq(A2aRemoteAgentEntity::getWorkspaceId, context.getWorkspaceId());
		if (StringUtils.isNotBlank(query.getName())) {
			wrapper.like(A2aRemoteAgentEntity::getName, query.getName());
		}
		if (StringUtils.isNotBlank(query.getSourceType())) {
			wrapper.eq(A2aRemoteAgentEntity::getSourceType, normalizeSourceType(query.getSourceType()));
		}
		if (query.getStatus() != null) {
			wrapper.eq(A2aRemoteAgentEntity::getStatus, query.getStatus());
		}
		else {
			wrapper.ne(A2aRemoteAgentEntity::getStatus, A2aStatusEnum.DELETED.getCode());
		}
		wrapper.orderByDesc(A2aRemoteAgentEntity::getId);
		IPage<A2aRemoteAgentEntity> pageResult = this.page(page, wrapper);
		List<A2aRemoteAgentDetail> details = new ArrayList<>();
		if (!CollectionUtils.isEmpty(pageResult.getRecords())) {
			for (A2aRemoteAgentEntity entity : pageResult.getRecords()) {
				details.add(toDetail(entity));
			}
		}
		return new PagingList<>(query.getCurrent(), query.getSize(), pageResult.getTotal(), details);
	}

	@Override
	public List<A2aRemoteAgentDetail> listByCodes(A2aRemoteAgentQuery query) {
		RequestContext context = RequestContextHolder.getRequestContext();
		LambdaQueryWrapper<A2aRemoteAgentEntity> wrapper = new LambdaQueryWrapper<>();
		wrapper.eq(A2aRemoteAgentEntity::getWorkspaceId, context.getWorkspaceId());
		wrapper.ne(A2aRemoteAgentEntity::getStatus, A2aStatusEnum.DELETED.getCode());
		if (!CollectionUtils.isEmpty(query.getAgentCodes())) {
			wrapper.in(A2aRemoteAgentEntity::getAgentCode, query.getAgentCodes());
		}
		wrapper.orderByDesc(A2aRemoteAgentEntity::getGmtModified);
		List<A2aRemoteAgentEntity> entities = this.list(wrapper);
		List<A2aRemoteAgentDetail> details = new ArrayList<>();
		if (!CollectionUtils.isEmpty(entities)) {
			for (A2aRemoteAgentEntity entity : entities) {
				details.add(toDetail(entity));
			}
		}
		return details;
	}

	@Override
	public String fetchCard(String agentCode) {
		RequestContext context = RequestContextHolder.getRequestContext();
		A2aRemoteAgentEntity entity = getByCode(context.getWorkspaceId(), agentCode);
		if (entity == null) {
			throw new BizException(ErrorCode.A2A_NOT_FOUND.toError());
		}
		String cardJson = doFetchCard(entity);
		entity.setCardJson(cardJson);
		entity.setGmtModified(new Date());
		this.updateById(entity);
		return cardJson;
	}

	@Override
	public A2aInvokeResult testInvoke(String agentCode, String input) {
		RequestContext context = RequestContextHolder.getRequestContext();
		A2aRemoteAgentEntity entity = getByCode(context.getWorkspaceId(), agentCode);
		if (entity == null) {
			throw new BizException(ErrorCode.A2A_NOT_FOUND.toError());
		}
		String cardJson = entity.getCardJson();
		if (StringUtils.isBlank(cardJson)) {
			cardJson = doFetchCard(entity);
			entity.setCardJson(cardJson);
			entity.setGmtModified(new Date());
			this.updateById(entity);
		}
		String endpoint = a2aClientManager.resolveEndpointFromCardJson(cardJson);
		if (StringUtils.isBlank(endpoint) && StringUtils.isNotBlank(entity.getCardUrl())) {
			endpoint = entity.getCardUrl();
		}
		String output = a2aClientManager.invoke(endpoint, input);
		return new A2aInvokeResult(output);
	}

	private String doFetchCard(A2aRemoteAgentEntity entity) {
		A2aSourceTypeEnum sourceType = A2aSourceTypeEnum.of(entity.getSourceType());
		if (sourceType == A2aSourceTypeEnum.NACOS) {
			return a2aClientManager.fetchAgentCardByNacosName(entity.getNacosAgentName());
		}
		return a2aClientManager.fetchAgentCard(entity.getCardUrl());
	}

	private A2aRemoteAgentEntity getByCode(String workspaceId, String agentCode) {
		LambdaQueryWrapper<A2aRemoteAgentEntity> wrapper = new LambdaQueryWrapper<>();
		wrapper.eq(A2aRemoteAgentEntity::getWorkspaceId, workspaceId);
		wrapper.eq(A2aRemoteAgentEntity::getAgentCode, agentCode);
		wrapper.ne(A2aRemoteAgentEntity::getStatus, A2aStatusEnum.DELETED.getCode());
		wrapper.last("limit 1");
		return this.getOne(wrapper);
	}

	private void validateDetail(A2aRemoteAgentDetail detail, boolean isUpdate) {
		if (StringUtils.isBlank(detail.getName())) {
			throw new BizException(ErrorCode.MISSING_PARAMS.toError("name"));
		}
		String sourceType = normalizeSourceType(detail.getSourceType());
		if (StringUtils.isBlank(sourceType)) {
			throw new BizException(ErrorCode.MISSING_PARAMS.toError("sourceType"));
		}
		A2aSourceTypeEnum type = A2aSourceTypeEnum.of(sourceType);
		if (type == null) {
			throw new BizException(ErrorCode.INVALID_PARAMS.toError("sourceType", "must be URL or NACOS"));
		}
		if (type == A2aSourceTypeEnum.URL && StringUtils.isBlank(detail.getCardUrl())) {
			throw new BizException(ErrorCode.MISSING_PARAMS.toError("cardUrl"));
		}
		if (type == A2aSourceTypeEnum.NACOS && StringUtils.isBlank(detail.getNacosAgentName())) {
			throw new BizException(ErrorCode.MISSING_PARAMS.toError("nacosAgentName"));
		}
	}

	private String normalizeSourceType(String sourceType) {
		A2aSourceTypeEnum type = A2aSourceTypeEnum.of(sourceType);
		return type == null ? sourceType : type.getValue();
	}

	private A2aRemoteAgentDetail toDetail(A2aRemoteAgentEntity entity) {
		A2aRemoteAgentDetail detail = new A2aRemoteAgentDetail();
		detail.setAgentCode(entity.getAgentCode());
		detail.setName(entity.getName());
		detail.setDescription(entity.getDescription());
		detail.setSourceType(entity.getSourceType());
		detail.setCardUrl(entity.getCardUrl());
		detail.setNacosAgentName(entity.getNacosAgentName());
		detail.setCardJson(entity.getCardJson());
		detail.setStatus(entity.getStatus());
		detail.setGmtModified(entity.getGmtModified());
		return detail;
	}

}
