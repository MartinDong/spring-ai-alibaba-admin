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

package com.alibaba.cloud.ai.studio.core.agent.tool;

import com.alibaba.cloud.ai.studio.core.base.service.A2aRemoteAgentService;
import com.alibaba.cloud.ai.studio.runtime.domain.a2a.A2aInvokeResult;
import com.alibaba.cloud.ai.studio.runtime.domain.a2a.A2aRemoteAgentDetail;
import com.alibaba.cloud.ai.studio.runtime.domain.chat.ToolCallType;
import com.alibaba.cloud.ai.studio.runtime.utils.JsonUtils;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.jetbrains.annotations.NotNull;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.ai.tool.metadata.ToolMetadata;

import java.util.Map;

/**
 * Tool callback that invokes a remote A2A agent as a tool.
 *
 * @since 1.0.0.3
 */
@RequiredArgsConstructor
public class A2AToolCallback implements AgentToolCallback {

	private final A2aRemoteAgentService a2aRemoteAgentService;

	private final A2aRemoteAgentDetail agentDetail;

	private final Map<String, Object> extraParams;

	@NotNull
	@Override
	public ToolDefinition getToolDefinition() {
		String toolName = sanitizeToolName(agentDetail.getName());
		String description = StringUtils.isNotBlank(agentDetail.getDescription()) ? agentDetail.getDescription()
				: "Invoke remote A2A agent: " + agentDetail.getName();
		String inputSchema = """
				{"type":"object","properties":{"input":{"type":"string","description":"User message to send to the remote A2A agent"}},"required":["input"]}
				""";
		return ToolDefinition.builder().name(toolName).description(description).inputSchema(inputSchema).build();
	}

	@NotNull
	@Override
	public String call(@NotNull String functionInput) {
		Map<String, Object> arguments = ToolArgumentsHelper.mergeToolArguments(functionInput, extraParams,
				agentDetail.getAgentCode());
		Object inputObj = arguments.get("input");
		if (inputObj == null) {
			inputObj = arguments.get("query");
		}
		if (inputObj == null) {
			inputObj = functionInput;
		}
		A2aInvokeResult result = a2aRemoteAgentService.testInvoke(agentDetail.getAgentCode(),
				String.valueOf(inputObj));
		return JsonUtils.toJson(result);
	}

	@NotNull
	@Override
	public ToolMetadata getToolMetadata() {
		return ToolMetadata.builder().returnDirect(false).build();
	}

	@Override
	public String getId() {
		return agentDetail.getAgentCode();
	}

	@Override
	public ToolCallType getToolCallType() {
		return ToolCallType.A2A_TOOL_CALL;
	}

	static String sanitizeToolName(String name) {
		if (StringUtils.isBlank(name)) {
			return "a2a_agent";
		}
		String sanitized = name.trim().replaceAll("[^a-zA-Z0-9_-]", "_");
		if (sanitized.isEmpty()) {
			return "a2a_agent";
		}
		if (!Character.isLetter(sanitized.charAt(0))) {
			sanitized = "a2a_" + sanitized;
		}
		return sanitized.length() > 64 ? sanitized.substring(0, 64) : sanitized;
	}

}
