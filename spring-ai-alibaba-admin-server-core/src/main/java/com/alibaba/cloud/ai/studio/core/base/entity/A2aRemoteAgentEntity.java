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
 * Entity for remote A2A agents.
 *
 * @since 1.0.0.3
 */
@Data
@TableName("a2a_remote_agent")
public class A2aRemoteAgentEntity {

	@TableId(value = "id", type = IdType.AUTO)
	private Long id;

	@TableField("gmt_create")
	private Date gmtCreate;

	@TableField("gmt_modified")
	private Date gmtModified;

	@TableField("agent_code")
	private String agentCode;

	private String name;

	private String description;

	@TableField("source_type")
	private String sourceType;

	@TableField("card_url")
	private String cardUrl;

	@TableField("nacos_agent_name")
	private String nacosAgentName;

	@TableField("card_json")
	private String cardJson;

	@TableField("workspace_id")
	private String workspaceId;

	@TableField("account_id")
	private String accountId;

	private Integer status;

}
