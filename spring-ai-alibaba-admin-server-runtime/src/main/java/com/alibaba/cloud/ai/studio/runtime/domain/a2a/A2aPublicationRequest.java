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

package com.alibaba.cloud.ai.studio.runtime.domain.a2a;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serializable;

/**
 * Request to publish a Studio app as an A2A agent.
 *
 * @since 1.0.0.3
 */
@Data
public class A2aPublicationRequest implements Serializable {

	@JsonProperty("app_id")
	private String appId;

	@JsonProperty("app_type")
	private String appType;

	@JsonProperty("agent_name")
	private String agentName;

	private String description;

	/** Whether the publication endpoint is enabled (default true) */
	private Integer enabled = 1;

	/** Whether to register with Nacos A2A registry when available */
	@JsonProperty("register_nacos")
	private Boolean registerNacos = true;

}
