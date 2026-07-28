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

package com.alibaba.cloud.ai.studio.admin.builder.controller;

import com.alibaba.cloud.ai.studio.admin.builder.annotation.ApiModelAttribute;
import com.alibaba.cloud.ai.studio.core.base.service.A2aRemoteAgentService;
import com.alibaba.cloud.ai.studio.core.context.RequestContextHolder;
import com.alibaba.cloud.ai.studio.runtime.domain.PagingList;
import com.alibaba.cloud.ai.studio.runtime.domain.RequestContext;
import com.alibaba.cloud.ai.studio.runtime.domain.Result;
import com.alibaba.cloud.ai.studio.runtime.domain.a2a.A2aInvokeRequest;
import com.alibaba.cloud.ai.studio.runtime.domain.a2a.A2aInvokeResult;
import com.alibaba.cloud.ai.studio.runtime.domain.a2a.A2aRemoteAgentDetail;
import com.alibaba.cloud.ai.studio.runtime.domain.a2a.A2aRemoteAgentQuery;
import com.alibaba.cloud.ai.studio.runtime.enums.ErrorCode;
import com.alibaba.cloud.ai.studio.runtime.exception.BizException;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Console APIs for remote A2A agents (client side).
 *
 * @since 1.0.0.3
 */
@Slf4j
@RestController
@Tag(name = "a2a-agents")
@RequestMapping("/console/v1/a2a-agents")
public class A2aRemoteAgentController {

	private final A2aRemoteAgentService a2aRemoteAgentService;

	public A2aRemoteAgentController(A2aRemoteAgentService a2aRemoteAgentService) {
		this.a2aRemoteAgentService = a2aRemoteAgentService;
	}

	@PostMapping
	public Result<String> create(@RequestBody A2aRemoteAgentDetail detail) {
		RequestContext context = RequestContextHolder.getRequestContext();
		String agentCode = a2aRemoteAgentService.create(detail);
		return Result.success(context.getRequestId(), agentCode);
	}

	@PutMapping
	public Result<Void> update(@RequestBody A2aRemoteAgentDetail detail) {
		RequestContext context = RequestContextHolder.getRequestContext();
		if (StringUtils.isBlank(detail.getAgentCode())) {
			throw new BizException(ErrorCode.MISSING_PARAMS.toError("agentCode"));
		}
		a2aRemoteAgentService.update(detail);
		return Result.success(context.getRequestId(), null);
	}

	@DeleteMapping("/{agentCode}")
	public Result<Void> delete(@PathVariable("agentCode") String agentCode) {
		RequestContext context = RequestContextHolder.getRequestContext();
		if (StringUtils.isBlank(agentCode)) {
			throw new BizException(ErrorCode.MISSING_PARAMS.toError("agentCode"));
		}
		a2aRemoteAgentService.delete(agentCode);
		return Result.success(context.getRequestId(), null);
	}

	@GetMapping("/{agentCode}")
	public Result<A2aRemoteAgentDetail> get(@PathVariable("agentCode") String agentCode) {
		RequestContext context = RequestContextHolder.getRequestContext();
		if (StringUtils.isBlank(agentCode)) {
			throw new BizException(ErrorCode.MISSING_PARAMS.toError("agentCode"));
		}
		return Result.success(context.getRequestId(), a2aRemoteAgentService.get(agentCode));
	}

	@GetMapping
	public Result<PagingList<A2aRemoteAgentDetail>> list(@ApiModelAttribute A2aRemoteAgentQuery query) {
		RequestContext context = RequestContextHolder.getRequestContext();
		return Result.success(context.getRequestId(), a2aRemoteAgentService.list(query));
	}

	@PostMapping("/query-by-codes")
	public Result<List<A2aRemoteAgentDetail>> listByCodes(@RequestBody A2aRemoteAgentQuery query) {
		RequestContext context = RequestContextHolder.getRequestContext();
		return Result.success(context.getRequestId(), a2aRemoteAgentService.listByCodes(query));
	}

	@PostMapping("/debug-invoke")
	public Result<A2aInvokeResult> debugInvoke(@RequestBody A2aInvokeRequest request) {
		RequestContext context = RequestContextHolder.getRequestContext();
		if (request == null || StringUtils.isBlank(request.getAgentCode())) {
			throw new BizException(ErrorCode.MISSING_PARAMS.toError("agentCode"));
		}
		A2aInvokeResult result = a2aRemoteAgentService.testInvoke(request.getAgentCode(), request.getInput());
		return Result.success(context.getRequestId(), result);
	}

	@GetMapping("/{agentCode}/card")
	public Result<Map<String, Object>> previewCard(@PathVariable("agentCode") String agentCode) {
		RequestContext context = RequestContextHolder.getRequestContext();
		if (StringUtils.isBlank(agentCode)) {
			throw new BizException(ErrorCode.MISSING_PARAMS.toError("agentCode"));
		}
		String cardJson = a2aRemoteAgentService.fetchCard(agentCode);
		return Result.success(context.getRequestId(),
				cardJson == null ? Map.of() : com.alibaba.cloud.ai.studio.runtime.utils.JsonUtils.fromJsonToMap(cardJson));
	}

}
