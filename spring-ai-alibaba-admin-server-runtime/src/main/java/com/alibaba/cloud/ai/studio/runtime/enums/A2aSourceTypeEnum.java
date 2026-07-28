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

package com.alibaba.cloud.ai.studio.runtime.enums;

import lombok.Getter;

/**
 * Source type for remote A2A agents.
 *
 * @since 1.0.0.3
 */
@Getter
public enum A2aSourceTypeEnum {

	/** Discover agent card via HTTP URL */
	URL("URL"),

	/** Discover agent card via Nacos A2A registry */
	NACOS("NACOS");

	private final String value;

	A2aSourceTypeEnum(String value) {
		this.value = value;
	}

	public static A2aSourceTypeEnum of(String value) {
		if (value == null) {
			return null;
		}
		for (A2aSourceTypeEnum type : values()) {
			if (type.value.equalsIgnoreCase(value) || type.name().equalsIgnoreCase(value)) {
				return type;
			}
		}
		return null;
	}

}
