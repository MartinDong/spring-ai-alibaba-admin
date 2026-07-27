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

import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.definition.ToolDefinition;
import org.springframework.ai.tool.metadata.ToolMetadata;
import org.springframework.ai.tool.resolution.ToolCallbackResolver;

/**
 * Resolves unknown tool names to a stub callback that returns an error payload instead of
 * aborting the agent turn with {@code IllegalStateException}.
 *
 * @since 1.0.0.3
 */
public class FallbackToolCallbackResolver implements ToolCallbackResolver {

	@Nullable
	@Override
	public ToolCallback resolve(@NotNull String toolName) {
		return new UnavailableToolCallback(toolName);
	}

	private static final class UnavailableToolCallback implements ToolCallback {

		private final String toolName;

		private UnavailableToolCallback(String toolName) {
			this.toolName = toolName;
		}

		@NotNull
		@Override
		public ToolDefinition getToolDefinition() {
			return ToolDefinition.builder()
				.name(toolName)
				.description("Unavailable tool stub")
				.inputSchema("""
						{"type":"object","properties":{},"additionalProperties":true}
						""")
				.build();
		}

		@NotNull
		@Override
		public ToolMetadata getToolMetadata() {
			return ToolMetadata.builder().returnDirect(false).build();
		}

		@NotNull
		@Override
		public String call(@NotNull String toolInput) {
			return """
					Error: Tool "%s" is not registered in this Admin runtime.
					Available skill tools are only `read_skill` and `read_skill_resource`.
					Plugin/MCP/component tools must be bound on the agent. Built-in Codex/OpenClaw tools and skill scripts are not executable here.
					Do not invent tool names; continue with registered tools or explain the limitation to the user.
					""".formatted(toolName).trim();
		}

	}

}
