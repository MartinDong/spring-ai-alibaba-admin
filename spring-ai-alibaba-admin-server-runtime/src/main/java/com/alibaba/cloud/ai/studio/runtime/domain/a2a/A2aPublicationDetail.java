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
import java.util.Date;

/**
 * A2A agent publication detail.
 *
 * @since 1.0.0.3
 */
@Data
public class A2aPublicationDetail implements Serializable {

	@JsonProperty("publication_code")
	private String publicationCode;

	@JsonProperty("app_id")
	private String appId;

	@JsonProperty("app_type")
	private String appType;

	@JsonProperty("agent_name")
	private String agentName;

	private String description;

	private Integer enabled;

	@JsonProperty("card_json")
	private String cardJson;

	@JsonProperty("nacos_registered")
	private Integer nacosRegistered;

	@JsonProperty("workspace_id")
	private String workspaceId;

	@JsonProperty("account_id")
	private String accountId;

	private Integer status;

	@JsonProperty("gmt_create")
	private Date gmtCreate;

	@JsonProperty("gmt_modified")
	private Date gmtModified;

}
