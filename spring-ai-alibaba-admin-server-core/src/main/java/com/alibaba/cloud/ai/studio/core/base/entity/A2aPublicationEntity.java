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

package com.alibaba.cloud.ai.studio.core.base.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.util.Date;

/**
 * Entity for A2A agent publications (Studio app → A2A server).
 *
 * @since 1.0.0.3
 */
@Data
@TableName("a2a_agent_publication")
public class A2aPublicationEntity {

	@TableId(value = "id", type = IdType.AUTO)
	private Long id;

	@TableField("gmt_create")
	private Date gmtCreate;

	@TableField("gmt_modified")
	private Date gmtModified;

	@TableField("publication_code")
	private String publicationCode;

	@TableField("app_id")
	private String appId;

	@TableField("app_type")
	private String appType;

	@TableField("agent_name")
	private String agentName;

	private String description;

	private Integer enabled;

	@TableField("card_json")
	private String cardJson;

	@TableField("nacos_registered")
	private Integer nacosRegistered;

	@TableField("workspace_id")
	private String workspaceId;

	@TableField("account_id")
	private String accountId;

	private Integer status;

}
