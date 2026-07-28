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

package com.alibaba.cloud.ai.studio.core.base.service;

import com.alibaba.cloud.ai.studio.runtime.domain.PagingList;
import com.alibaba.cloud.ai.studio.runtime.domain.a2a.A2aInvokeResult;
import com.alibaba.cloud.ai.studio.runtime.domain.a2a.A2aRemoteAgentDetail;
import com.alibaba.cloud.ai.studio.runtime.domain.a2a.A2aRemoteAgentQuery;

import java.util.List;

/**
 * Service for managing remote A2A agents (client side).
 *
 * @since 1.0.0.3
 */
public interface A2aRemoteAgentService {

	String create(A2aRemoteAgentDetail detail);

	void update(A2aRemoteAgentDetail detail);

	void delete(String agentCode);

	A2aRemoteAgentDetail get(String agentCode);

	PagingList<A2aRemoteAgentDetail> list(A2aRemoteAgentQuery query);

	List<A2aRemoteAgentDetail> listByCodes(A2aRemoteAgentQuery query);

	/**
	 * Fetch and optionally refresh cached agent card for the given agent.
	 */
	String fetchCard(String agentCode);

	/**
	 * Test-invoke a remote agent with text input.
	 */
	A2aInvokeResult testInvoke(String agentCode, String input);

}
