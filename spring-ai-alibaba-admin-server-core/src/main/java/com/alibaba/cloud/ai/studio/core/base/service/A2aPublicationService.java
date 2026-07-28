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
import com.alibaba.cloud.ai.studio.runtime.domain.a2a.A2aPublicationDetail;
import com.alibaba.cloud.ai.studio.runtime.domain.a2a.A2aPublicationRequest;

/**
 * Service for publishing Studio apps as A2A agents (server side).
 *
 * @since 1.0.0.3
 */
public interface A2aPublicationService {

	A2aPublicationDetail publish(A2aPublicationRequest request);

	void unpublish(String publicationCode);

	PagingList<A2aPublicationDetail> list(Integer current, Integer size);

	A2aPublicationDetail get(String publicationCode);

	A2aPublicationDetail getByAppId(String appId);

	String buildAgentCard(String appId);

	A2aPublicationDetail getEnabledByAppId(String appId);

	/**
	 * Ensure each enabled publication has a selectable local remote-agent row
	 * (so the A2A selector can pick published Studio apps).
	 */
	void syncLocalSelectableAgents();

}
