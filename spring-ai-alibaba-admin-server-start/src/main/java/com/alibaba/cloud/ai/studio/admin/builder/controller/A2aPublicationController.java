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

import com.alibaba.cloud.ai.studio.core.base.service.A2aPublicationService;
import com.alibaba.cloud.ai.studio.core.context.RequestContextHolder;
import com.alibaba.cloud.ai.studio.runtime.domain.PagingList;
import com.alibaba.cloud.ai.studio.runtime.domain.RequestContext;
import com.alibaba.cloud.ai.studio.runtime.domain.Result;
import com.alibaba.cloud.ai.studio.runtime.domain.a2a.A2aPublicationDetail;
import com.alibaba.cloud.ai.studio.runtime.domain.a2a.A2aPublicationRequest;
import com.alibaba.cloud.ai.studio.runtime.enums.ErrorCode;
import com.alibaba.cloud.ai.studio.runtime.exception.BizException;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Console APIs for publishing Studio apps as A2A agents (server side).
 *
 * @since 1.0.0.3
 */
@Slf4j
@RestController
@Tag(name = "a2a-publications")
@RequestMapping("/console/v1/a2a/publications")
public class A2aPublicationController {

	private final A2aPublicationService a2aPublicationService;

	public A2aPublicationController(A2aPublicationService a2aPublicationService) {
		this.a2aPublicationService = a2aPublicationService;
	}

	@PostMapping
	public Result<A2aPublicationDetail> publish(@RequestBody A2aPublicationRequest request) {
		RequestContext context = RequestContextHolder.getRequestContext();
		if (request == null || StringUtils.isBlank(request.getAppId())) {
			throw new BizException(ErrorCode.MISSING_PARAMS.toError("appId"));
		}
		return Result.success(context.getRequestId(), a2aPublicationService.publish(request));
	}

	@DeleteMapping("/{publicationCode}")
	public Result<Void> unpublish(@PathVariable("publicationCode") String publicationCode) {
		RequestContext context = RequestContextHolder.getRequestContext();
		if (StringUtils.isBlank(publicationCode)) {
			throw new BizException(ErrorCode.MISSING_PARAMS.toError("publicationCode"));
		}
		a2aPublicationService.unpublish(publicationCode);
		return Result.success(context.getRequestId(), null);
	}

	@GetMapping
	public Result<PagingList<A2aPublicationDetail>> list(
			@RequestParam(value = "current", required = false, defaultValue = "1") Integer current,
			@RequestParam(value = "size", required = false, defaultValue = "10") Integer size) {
		RequestContext context = RequestContextHolder.getRequestContext();
		return Result.success(context.getRequestId(), a2aPublicationService.list(current, size));
	}

	@GetMapping("/{publicationCode}")
	public Result<A2aPublicationDetail> get(@PathVariable("publicationCode") String publicationCode) {
		RequestContext context = RequestContextHolder.getRequestContext();
		if (StringUtils.isBlank(publicationCode)) {
			throw new BizException(ErrorCode.MISSING_PARAMS.toError("publicationCode"));
		}
		return Result.success(context.getRequestId(), a2aPublicationService.get(publicationCode));
	}

	@GetMapping("/by-app/{appId}")
	public Result<A2aPublicationDetail> getByAppId(@PathVariable("appId") String appId) {
		RequestContext context = RequestContextHolder.getRequestContext();
		if (StringUtils.isBlank(appId)) {
			throw new BizException(ErrorCode.MISSING_PARAMS.toError("appId"));
		}
		return Result.success(context.getRequestId(), a2aPublicationService.getByAppId(appId));
	}

}
