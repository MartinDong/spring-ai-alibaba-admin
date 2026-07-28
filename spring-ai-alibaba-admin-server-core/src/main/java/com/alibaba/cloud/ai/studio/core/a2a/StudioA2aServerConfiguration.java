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
import com.alibaba.cloud.ai.studio.core.base.service.A2aPublicationService;
import com.alibaba.cloud.ai.studio.core.base.service.WorkflowService;
import com.alibaba.cloud.ai.studio.runtime.domain.a2a.A2aPublicationDetail;
import com.alibaba.cloud.ai.studio.runtime.enums.AppType;
import com.alibaba.cloud.ai.studio.runtime.utils.JsonUtils;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.function.RouterFunction;
import org.springframework.web.servlet.function.RouterFunctions;
import org.springframework.web.servlet.function.ServerRequest;
import org.springframework.web.servlet.function.ServerResponse;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Exposes Studio apps as A2A JSON-RPC endpoints without relying on ReactAgent
 * auto-configuration.
 *
 * <ul>
 * <li>GET {@code /.well-known/agents/{appId}/agent.json} — agent card</li>
 * <li>POST {@code /a2a/{appId}} — JSON-RPC {@code message/send}</li>
 * </ul>
 *
 * @since 1.0.0.3
 */
@Slf4j
@Configuration
public class StudioA2aServerConfiguration {

	private final A2aPublicationService a2aPublicationService;

	private final AgentService agentService;

	private final WorkflowService workflowService;

	private final ObjectMapper objectMapper = new ObjectMapper();

	public StudioA2aServerConfiguration(A2aPublicationService a2aPublicationService, AgentService agentService,
			WorkflowService workflowService) {
		this.a2aPublicationService = a2aPublicationService;
		this.agentService = agentService;
		this.workflowService = workflowService;
	}

	@Bean
	public RouterFunction<ServerResponse> studioA2aRouter() {
		return RouterFunctions.route()
			.GET("/.well-known/agents/{appId}/agent.json", this::handleAgentCard)
			.POST("/a2a/{appId}", this::handleJsonRpc)
			.build();
	}

	private ServerResponse handleAgentCard(ServerRequest request) {
		String appId = request.pathVariable("appId");
		try {
			A2aPublicationDetail publication = a2aPublicationService.getEnabledByAppId(appId);
			if (publication == null || StringUtils.isBlank(publication.getCardJson())) {
				return ServerResponse.notFound().build();
			}
			return ServerResponse.ok()
				.contentType(MediaType.APPLICATION_JSON)
				.body(publication.getCardJson());
		}
		catch (Exception e) {
			log.warn("Failed to serve agent card for appId={}: {}", appId, e.getMessage());
			return ServerResponse.status(404).body("{\"error\":\"agent card not found\"}");
		}
	}

	private ServerResponse handleJsonRpc(ServerRequest request) throws Exception {
		String appId = request.pathVariable("appId");
		String body = request.body(String.class);
		JsonNode root = objectMapper.readTree(body == null ? "{}" : body);
		Object idNode = root.has("id") ? objectMapper.convertValue(root.get("id"), Object.class) : null;
		String method = root.path("method").asText("");

		if (!"message/send".equals(method) && !"message/stream".equals(method)) {
			return ServerResponse.ok()
				.contentType(MediaType.APPLICATION_JSON)
				.body(JsonUtils.toJson(jsonRpcError(idNode, -32601, "Method not found: " + method)));
		}

		try {
			A2aPublicationDetail publication = a2aPublicationService.getEnabledByAppId(appId);
			if (publication == null) {
				return ServerResponse.ok()
					.contentType(MediaType.APPLICATION_JSON)
					.body(JsonUtils.toJson(jsonRpcError(idNode, -32004, "A2A publication not found or disabled")));
			}

			String text = extractUserText(root.path("params"));
			AppType appType = parseAppType(publication.getAppType());
			StudioAppA2aHandler handler = new StudioAppA2aHandler(appId, appType, publication.getWorkspaceId(),
					publication.getAccountId(), agentService, workflowService);
			String output = handler.handleMessage(text);

			Map<String, Object> result = buildMessageResult(output);
			Map<String, Object> response = new HashMap<>();
			response.put("jsonrpc", "2.0");
			response.put("id", idNode);
			response.put("result", result);
			return ServerResponse.ok().contentType(MediaType.APPLICATION_JSON).body(JsonUtils.toJson(response));
		}
		catch (Exception e) {
			log.error("A2A JSON-RPC handling failed for appId={}", appId, e);
			return ServerResponse.ok()
				.contentType(MediaType.APPLICATION_JSON)
				.body(JsonUtils.toJson(jsonRpcError(idNode, -32000, e.getMessage())));
		}
	}

	@SuppressWarnings("unchecked")
	private String extractUserText(JsonNode params) {
		if (params == null || params.isMissingNode()) {
			return "";
		}
		JsonNode message = params.path("message");
		JsonNode parts = message.path("parts");
		if (parts.isArray()) {
			StringBuilder sb = new StringBuilder();
			for (JsonNode part : parts) {
				if (part.has("text")) {
					sb.append(part.get("text").asText(""));
				}
			}
			return sb.toString();
		}
		// fallback: params may already be a map-like object with text
		if (params.has("text")) {
			return params.get("text").asText("");
		}
		return "";
	}

	private Map<String, Object> buildMessageResult(String output) {
		Map<String, Object> part = Map.of("kind", "text", "text", output == null ? "" : output);
		Map<String, Object> message = new HashMap<>();
		message.put("kind", "message");
		message.put("role", "agent");
		message.put("messageId", UUID.randomUUID().toString().replace("-", ""));
		message.put("parts", List.of(part));
		return message;
	}

	private Map<String, Object> jsonRpcError(Object id, int code, String message) {
		Map<String, Object> error = new HashMap<>();
		error.put("code", code);
		error.put("message", message == null ? "error" : message);
		Map<String, Object> response = new HashMap<>();
		response.put("jsonrpc", "2.0");
		response.put("id", id);
		response.put("error", error);
		return response;
	}

	private AppType parseAppType(String appType) {
		if (StringUtils.isBlank(appType)) {
			return AppType.BASIC;
		}
		for (AppType type : AppType.values()) {
			if (type.getValue().equalsIgnoreCase(appType) || type.name().equalsIgnoreCase(appType)) {
				return type;
			}
		}
		return AppType.BASIC;
	}

}
