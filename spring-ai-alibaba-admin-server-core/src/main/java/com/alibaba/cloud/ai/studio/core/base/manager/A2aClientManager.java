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

package com.alibaba.cloud.ai.studio.core.base.manager;

import com.alibaba.cloud.ai.studio.runtime.enums.ErrorCode;
import com.alibaba.cloud.ai.studio.runtime.exception.BizException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.http.HttpEntity;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * HTTP client manager for A2A agent-card fetch and JSON-RPC message/send invoke.
 * Nacos name lookup uses reflection against nacos-client 3.x A2aService when available.
 *
 * @since 1.0.0.3
 */
@Slf4j
@Component
public class A2aClientManager {

	private final ObjectMapper objectMapper = new ObjectMapper();

	/**
	 * Fetch agent card JSON from a card URL or well-known endpoint.
	 */
	public String fetchAgentCard(String cardUrl) {
		if (StringUtils.isBlank(cardUrl)) {
			throw new BizException(ErrorCode.A2A_CARD_ERROR.toError("cardUrl is blank"));
		}
		Exception lastError = null;
		for (String candidate : buildCardUrlCandidates(cardUrl)) {
			try {
				String body = httpGet(candidate);
				if (StringUtils.isNotBlank(body) && body.trim().startsWith("{")) {
					return body;
				}
			}
			catch (Exception e) {
				lastError = e;
				log.debug("Failed to fetch agent card from {}: {}", candidate, e.getMessage());
			}
		}
		throw new BizException(ErrorCode.A2A_CARD_ERROR
			.toError(lastError == null ? "no valid card response" : lastError.getMessage()), lastError);
	}

	/**
	 * Fetch agent card via Nacos A2aService (nacos-client 3.x) when present on classpath.
	 */
	public String fetchAgentCardByNacosName(String nacosAgentName) {
		if (StringUtils.isBlank(nacosAgentName)) {
			throw new BizException(ErrorCode.A2A_CARD_ERROR.toError("nacosAgentName is blank"));
		}
		try {
			Class<?> aiFactoryClass = Class.forName("com.alibaba.nacos.api.ai.AiFactory");
			Class<?> propsClass = Class.forName("com.alibaba.nacos.api.PropertyKeyConst");
			// Prefer Spring-managed bean if any; otherwise create short-lived client from env
			Object a2aService = resolveA2aServiceReflectively(aiFactoryClass);
			if (a2aService == null) {
				throw new BizException(ErrorCode.A2A_CARD_ERROR.toError(
						"Nacos A2aService unavailable. Use Card URL source, or deploy Nacos 3.x + nacos-client 3.1+."));
			}
			Object nacosCard = a2aService.getClass().getMethod("getAgentCard", String.class).invoke(a2aService,
					nacosAgentName);
			if (nacosCard == null) {
				throw new BizException(ErrorCode.A2A_CARD_ERROR.toError("empty agent card from Nacos"));
			}
			return objectMapper.writeValueAsString(nacosCard);
		}
		catch (BizException e) {
			throw e;
		}
		catch (ClassNotFoundException e) {
			throw new BizException(ErrorCode.A2A_CARD_ERROR.toError(
					"nacos-client 3.x A2A API not on classpath; use Card URL instead"), e);
		}
		catch (Exception e) {
			throw new BizException(ErrorCode.A2A_CARD_ERROR.toError(e.getMessage()), e);
		}
	}

	private Object resolveA2aServiceReflectively(Class<?> aiFactoryClass) {
		try {
			// StudioA2aNacosConfiguration may publish a bean; look up via Spring context if present
			Class<?> holder = Class.forName("org.springframework.web.context.ContextLoader");
			Object ctx = holder.getMethod("getCurrentWebApplicationContext").invoke(null);
			if (ctx != null) {
				Class<?> a2aServiceClass = Class.forName("com.alibaba.nacos.api.ai.A2aService");
				Object[] beans = (Object[]) ctx.getClass()
					.getMethod("getBeansOfType", Class.class)
					.invoke(ctx, a2aServiceClass);
				// getBeansOfType returns Map
			}
		}
		catch (Exception ignored) {
			// fall through
		}
		return null;
	}

	/**
	 * Invoke remote A2A agent via JSON-RPC message/send.
	 */
	public String invoke(String endpointUrl, String input) {
		if (StringUtils.isBlank(endpointUrl)) {
			throw new BizException(ErrorCode.A2A_CALL_ERROR.toError("endpoint url is blank"));
		}
		try {
			String payload = buildSendMessageRequest(input == null ? "" : input);
			String responseText = httpPostJson(endpointUrl, payload);
			Map<String, Object> resultMap = autoDetectAndParseResponse(responseText);
			@SuppressWarnings("unchecked")
			Map<String, Object> result = (Map<String, Object>) resultMap.get("result");
			return extractResponseText(result);
		}
		catch (BizException e) {
			throw e;
		}
		catch (Exception e) {
			throw new BizException(ErrorCode.A2A_CALL_ERROR.toError(e.getMessage()), e);
		}
	}

	/**
	 * Resolve invoke endpoint from card JSON (prefer url field).
	 */
	public String resolveEndpointFromCardJson(String cardJson) {
		if (StringUtils.isBlank(cardJson)) {
			return null;
		}
		try {
			@SuppressWarnings("unchecked")
			Map<String, Object> card = objectMapper.readValue(cardJson, Map.class);
			Object url = card.get("url");
			return url == null ? null : String.valueOf(url);
		}
		catch (Exception e) {
			log.warn("Failed to parse card json for url: {}", e.getMessage());
			return null;
		}
	}

	private List<String> buildCardUrlCandidates(String cardUrl) {
		String trimmed = cardUrl.trim();
		if (trimmed.endsWith("/")) {
			trimmed = trimmed.substring(0, trimmed.length() - 1);
		}
		if (trimmed.contains("agent.json") || trimmed.contains("agent-card.json")) {
			return List.of(trimmed);
		}
		return List.of(trimmed, trimmed + "/.well-known/agent.json", trimmed + "/.well-known/agent-card.json",
				trimmed + "/agent.json");
	}

	private String httpGet(String url) throws Exception {
		try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
			HttpGet get = new HttpGet(url);
			get.setHeader("Accept", "application/json");
			try (CloseableHttpResponse response = httpClient.execute(get)) {
				int statusCode = response.getStatusLine().getStatusCode();
				HttpEntity entity = response.getEntity();
				String body = entity == null ? null : EntityUtils.toString(entity, "UTF-8");
				if (statusCode < 200 || statusCode >= 300) {
					throw new IllegalStateException("HTTP GET failed, status=" + statusCode + ", body=" + body);
				}
				return body;
			}
		}
	}

	private String httpPostJson(String url, String json) throws Exception {
		try (CloseableHttpClient httpClient = HttpClients.createDefault()) {
			HttpPost post = new HttpPost(url);
			post.setHeader("Content-Type", "application/json");
			post.setEntity(new StringEntity(json, ContentType.APPLICATION_JSON));
			try (CloseableHttpResponse response = httpClient.execute(post)) {
				int statusCode = response.getStatusLine().getStatusCode();
				HttpEntity entity = response.getEntity();
				String body = entity == null ? null : EntityUtils.toString(entity, "UTF-8");
				if (statusCode < 200 || statusCode >= 300) {
					throw new IllegalStateException("HTTP POST failed, status=" + statusCode + ", body=" + body);
				}
				return body;
			}
		}
	}

	private String buildSendMessageRequest(String text) throws Exception {
		Map<String, Object> message = new HashMap<>();
		message.put("messageId", UUID.randomUUID().toString());
		message.put("role", "user");
		message.put("parts", List.of(Map.of("kind", "text", "text", text)));

		Map<String, Object> params = new HashMap<>();
		params.put("message", message);

		Map<String, Object> request = new HashMap<>();
		request.put("jsonrpc", "2.0");
		request.put("id", UUID.randomUUID().toString());
		request.put("method", "message/send");
		request.put("params", params);
		return objectMapper.writeValueAsString(request);
	}

	@SuppressWarnings("unchecked")
	private Map<String, Object> autoDetectAndParseResponse(String responseText) throws Exception {
		if (StringUtils.isBlank(responseText)) {
			throw new IllegalStateException("empty A2A response");
		}
		String trimmed = responseText.trim();
		if (trimmed.startsWith("{")) {
			return objectMapper.readValue(trimmed, Map.class);
		}
		String lastJson = null;
		for (String line : trimmed.split("\n")) {
			String l = line.trim();
			if (l.startsWith("data:")) {
				lastJson = l.substring(5).trim();
			}
		}
		if (lastJson != null && lastJson.startsWith("{")) {
			return objectMapper.readValue(lastJson, Map.class);
		}
		throw new IllegalStateException("unsupported A2A response format");
	}

	@SuppressWarnings("unchecked")
	private String extractResponseText(Map<String, Object> result) {
		if (result == null) {
			return "";
		}
		Object status = result.get("status");
		if (status instanceof Map<?, ?> statusMap) {
			Object message = statusMap.get("message");
			if (message instanceof Map<?, ?> msgMap) {
				String fromParts = extractTextFromParts(msgMap.get("parts"));
				if (StringUtils.isNotBlank(fromParts)) {
					return fromParts;
				}
			}
		}
		Object artifacts = result.get("artifacts");
		if (artifacts instanceof List<?> list && !list.isEmpty()) {
			Object first = list.get(0);
			if (first instanceof Map<?, ?> art) {
				String fromParts = extractTextFromParts(art.get("parts"));
				if (StringUtils.isNotBlank(fromParts)) {
					return fromParts;
				}
			}
		}
		Object message = result.get("message");
		if (message instanceof Map<?, ?> msgMap) {
			String fromParts = extractTextFromParts(msgMap.get("parts"));
			if (StringUtils.isNotBlank(fromParts)) {
				return fromParts;
			}
		}
		Object parts = result.get("parts");
		String fromParts = extractTextFromParts(parts);
		if (StringUtils.isNotBlank(fromParts)) {
			return fromParts;
		}
		return objectMapper.valueToTree(result).toString();
	}

	private String extractTextFromParts(Object parts) {
		if (!(parts instanceof List<?> list)) {
			return null;
		}
		StringBuilder sb = new StringBuilder();
		for (Object part : list) {
			if (part instanceof Map<?, ?> map) {
				Object text = map.get("text");
				if (text != null) {
					if (sb.length() > 0) {
						sb.append('\n');
					}
					sb.append(text);
				}
			}
		}
		return sb.toString();
	}

}
