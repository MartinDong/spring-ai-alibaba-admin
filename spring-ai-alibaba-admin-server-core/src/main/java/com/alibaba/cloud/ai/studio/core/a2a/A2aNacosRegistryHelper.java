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

import com.alibaba.cloud.ai.a2a.core.registry.AgentRegistry;
import io.a2a.spec.AgentCard;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

/**
 * Optional Nacos A2A registry helper. Registers AgentCard when AgentRegistry is available.
 *
 * @since 1.0.0.3
 */
@Slf4j
@Component
public class A2aNacosRegistryHelper {

	private final ObjectProvider<AgentRegistry> agentRegistry;

	public A2aNacosRegistryHelper(ObjectProvider<AgentRegistry> agentRegistry) {
		this.agentRegistry = agentRegistry;
	}

	/**
	 * Register agent card to Nacos when registry bean is present.
	 * @return true if registered successfully
	 */
	public boolean register(AgentCard agentCard) {
		AgentRegistry registry = agentRegistry.getIfAvailable();
		if (registry == null) {
			log.info("AgentRegistry not available; skip Nacos A2A registration for agent={}",
					agentCard == null ? null : agentCard.name());
			return false;
		}
		try {
			registry.register(agentCard);
			log.info("Registered A2A agent card to {}: {}", registry.registryName(), agentCard.name());
			return true;
		}
		catch (Exception e) {
			log.warn("Failed to register A2A agent card to Nacos (API may be unavailable): {}", e.getMessage());
			return false;
		}
	}

	public boolean isRegistryAvailable() {
		return agentRegistry.getIfAvailable() != null;
	}

}
