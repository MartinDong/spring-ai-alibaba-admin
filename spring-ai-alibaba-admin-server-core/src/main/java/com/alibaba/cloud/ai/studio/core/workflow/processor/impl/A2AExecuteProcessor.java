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

package com.alibaba.cloud.ai.studio.core.workflow.processor.impl;

import com.alibaba.cloud.ai.studio.core.base.manager.RedisManager;
import com.alibaba.cloud.ai.studio.core.base.service.A2aRemoteAgentService;
import com.alibaba.cloud.ai.studio.core.config.CommonConfig;
import com.alibaba.cloud.ai.studio.core.utils.common.VariableUtils;
import com.alibaba.cloud.ai.studio.core.workflow.WorkflowContext;
import com.alibaba.cloud.ai.studio.core.workflow.WorkflowInnerService;
import com.alibaba.cloud.ai.studio.core.workflow.processor.AbstractExecuteProcessor;
import com.alibaba.cloud.ai.studio.runtime.domain.a2a.A2aInvokeResult;
import com.alibaba.cloud.ai.studio.runtime.domain.workflow.Edge;
import com.alibaba.cloud.ai.studio.runtime.domain.workflow.Node;
import com.alibaba.cloud.ai.studio.runtime.domain.workflow.NodeResult;
import com.alibaba.cloud.ai.studio.runtime.domain.workflow.NodeStatusEnum;
import com.alibaba.cloud.ai.studio.runtime.domain.workflow.NodeTypeEnum;
import com.alibaba.cloud.ai.studio.runtime.domain.workflow.ValueFromEnum;
import com.alibaba.cloud.ai.studio.runtime.enums.ErrorCode;
import com.alibaba.cloud.ai.studio.runtime.utils.JsonUtils;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.common.collect.Maps;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.jgrapht.graph.DirectedAcyclicGraph;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

/**
 * A2A remote agent node processor.
 *
 * @since 1.0.0.3
 */
@Component("A2AExecuteProcessor")
@Slf4j
public class A2AExecuteProcessor extends AbstractExecuteProcessor {

	private final A2aRemoteAgentService a2aRemoteAgentService;

	public A2AExecuteProcessor(RedisManager redisManager, WorkflowInnerService workflowInnerService,
			ChatMemory conversationChatMemory, CommonConfig commonConfig,
			A2aRemoteAgentService a2aRemoteAgentService) {
		super(redisManager, workflowInnerService, conversationChatMemory, commonConfig);
		this.a2aRemoteAgentService = a2aRemoteAgentService;
	}

	@Override
	public NodeResult innerExecute(DirectedAcyclicGraph<String, Edge> graph, Node node, WorkflowContext context) {
		NodeResult nodeResult = initNodeResultAndRefreshContext(node, context);
		try {
			NodeParam nodeParam = JsonUtils.fromMap(node.getConfig().getNodeParam(), NodeParam.class);
			String agentCode = nodeParam.getAgentCode();
			String input = resolveInput(nodeParam, node.getConfig().getInputParams(), context);
			A2aInvokeResult invokeResult = a2aRemoteAgentService.testInvoke(agentCode, input);

			nodeResult.setNodeStatus(NodeStatusEnum.SUCCESS.getCode());
			nodeResult.setInput(JsonUtils.toJson(Map.of("agent_code", agentCode, "input", input)));
			Map<String, Object> outputMap = Maps.newHashMap();
			outputMap.put(OUTPUT_DECORATE_PARAM_KEY, invokeResult == null ? null : invokeResult.getOutput());
			nodeResult.setOutput(JsonUtils.toJson(outputMap));
		}
		catch (Exception e) {
			nodeResult.setNodeStatus(NodeStatusEnum.FAIL.getCode());
			String errorMsg = "A2A Node execute fail: " + e.getMessage();
			nodeResult.setError(ErrorCode.WORKFLOW_EXECUTE_ERROR.toError(errorMsg));
			nodeResult.setErrorInfo(errorMsg);
		}
		return nodeResult;
	}

	private String resolveInput(NodeParam nodeParam, List<Node.InputParam> inputParams, WorkflowContext context) {
		if (StringUtils.isNotBlank(nodeParam.getInput())) {
			String expression = VariableUtils.getExpressionFromBracket(nodeParam.getInput());
			if (expression != null) {
				Object value = VariableUtils.getValueFromPayload(expression, context.getVariablesMap());
				return value == null ? nodeParam.getInput() : String.valueOf(value);
			}
			return nodeParam.getInput();
		}
		if (inputParams != null) {
			for (Node.InputParam inputParam : inputParams) {
				if ("input".equals(inputParam.getKey()) && inputParam.getValue() != null) {
					if (ValueFromEnum.input.name().equals(inputParam.getValueFrom())) {
						return String.valueOf(inputParam.getValue());
					}
					Object value = VariableUtils.getValueFromPayload(
							VariableUtils.getExpressionFromBracket((String) inputParam.getValue()),
							context.getVariablesMap());
					return value == null ? "" : String.valueOf(value);
				}
			}
		}
		return "";
	}

	@Override
	public CheckNodeParamResult checkNodeParam(DirectedAcyclicGraph<String, Edge> graph, Node node) {
		CheckNodeParamResult result = super.checkNodeParam(graph, node);
		NodeParam nodeParam = JsonUtils.fromMap(node.getConfig().getNodeParam(), NodeParam.class);
		if (nodeParam == null || StringUtils.isBlank(nodeParam.getAgentCode())) {
			result.setSuccess(false);
			result.getErrorInfos().add("agent_code is required");
		}
		return result;
	}

	@Override
	public String getNodeType() {
		return NodeTypeEnum.A2A.getCode();
	}

	@Override
	public String getNodeDescription() {
		return NodeTypeEnum.A2A.getDesc();
	}

	@Data
	public static class NodeParam {

		@JsonProperty("agent_code")
		private String agentCode;

		@JsonProperty("agent_name")
		private String agentName;

		private String input;

	}

}
