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

package com.alibaba.cloud.ai.studio.core.a2a;

import com.alibaba.cloud.ai.studio.core.base.service.AgentService;
import com.alibaba.cloud.ai.studio.core.base.service.WorkflowService;
import com.alibaba.cloud.ai.studio.core.context.RequestContextHolder;
import com.alibaba.cloud.ai.studio.core.utils.common.IdGenerator;
import com.alibaba.cloud.ai.studio.runtime.domain.RequestContext;
import com.alibaba.cloud.ai.studio.runtime.domain.agent.AgentRequest;
import com.alibaba.cloud.ai.studio.runtime.domain.agent.AgentResponse;
import com.alibaba.cloud.ai.studio.runtime.domain.chat.ChatMessage;
import com.alibaba.cloud.ai.studio.runtime.domain.chat.MessageRole;
import com.alibaba.cloud.ai.studio.runtime.domain.workflow.debug.WorkflowRequest;
import com.alibaba.cloud.ai.studio.runtime.domain.workflow.debug.WorkflowResponse;
import com.alibaba.cloud.ai.studio.runtime.enums.AppType;
import com.alibaba.cloud.ai.studio.runtime.enums.ErrorCode;
import com.alibaba.cloud.ai.studio.runtime.exception.BizException;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;

import java.util.List;

/**
 * Handles inbound A2A messages by routing to Studio AgentService / WorkflowService.
 * Self-contained (does not rely on GraphAgentExecutor / ReactAgent auto-config).
 *
 * @since 1.0.0.3
 */
@Slf4j
public class StudioAppA2aHandler {

	private final String appId;

	private final AppType appType;

	private final String workspaceId;

	private final String accountId;

	private final AgentService agentService;

	private final WorkflowService workflowService;

	public StudioAppA2aHandler(String appId, AppType appType, String workspaceId, String accountId,
			AgentService agentService, WorkflowService workflowService) {
		this.appId = appId;
		this.appType = appType;
		this.workspaceId = workspaceId;
		this.accountId = accountId;
		this.agentService = agentService;
		this.workflowService = workflowService;
	}

	/**
	 * Handle a user text message and return assistant text.
	 */
	public String handleMessage(String text) {
		RequestContext previous = RequestContextHolder.getRequestContext();
		try {
			ensureRequestContext();
			if (appType == AppType.WORKFLOW) {
				return handleWorkflow(text);
			}
			return handleAgent(text);
		}
		finally {
			if (previous == null) {
				RequestContextHolder.clearRequestContext();
			}
			else {
				RequestContextHolder.setRequestContext(previous);
			}
		}
	}

	private void ensureRequestContext() {
		RequestContext context = RequestContextHolder.getRequestContext();
		if (context != null && StringUtils.isNotBlank(context.getAccountId())
				&& StringUtils.isNotBlank(context.getWorkspaceId())) {
			return;
		}
		RequestContext synthetic = new RequestContext();
		synthetic.setRequestId(IdGenerator.uuid());
		synthetic.setAccountId(StringUtils.defaultIfBlank(accountId, "a2a-system"));
		synthetic.setWorkspaceId(StringUtils.defaultIfBlank(workspaceId, "default"));
		synthetic.setSource("a2a");
		synthetic.setStartTime(System.currentTimeMillis());
		RequestContextHolder.setRequestContext(synthetic);
	}

	private String handleAgent(String text) {
		AgentRequest request = new AgentRequest();
		request.setAppId(appId);
		request.setDraft(false);
		request.setStream(false);
		request.setMessages(List.of(new ChatMessage(MessageRole.USER, text == null ? "" : text)));
		AgentResponse response = agentService.call(request);
		if (response == null) {
			throw new BizException(ErrorCode.A2A_CALL_ERROR.toError("empty agent response"));
		}
		if (!response.isSuccess()) {
			String msg = response.getError() == null ? "agent call failed" : response.getError().getMessage();
			throw new BizException(ErrorCode.A2A_CALL_ERROR.toError(msg));
		}
		return extractContent(response.getMessage());
	}

	private String handleWorkflow(String text) {
		WorkflowRequest request = new WorkflowRequest();
		request.setAppId(appId);
		request.setDraft(false);
		request.setStream(false);
		request.setMessages(List.of(new ChatMessage(MessageRole.USER, text == null ? "" : text)));
		WorkflowResponse response = workflowService.call(request);
		if (response == null) {
			throw new BizException(ErrorCode.A2A_CALL_ERROR.toError("empty workflow response"));
		}
		if (!response.isSuccess()) {
			String msg = response.getError() == null ? "workflow call failed" : response.getError().getMessage();
			throw new BizException(ErrorCode.A2A_CALL_ERROR.toError(msg));
		}
		return extractContent(response.getMessage());
	}

	private String extractContent(ChatMessage message) {
		if (message == null || message.getContent() == null) {
			return "";
		}
		return String.valueOf(message.getContent());
	}

}
