# SAA Admin DB 配置导出

- 来源: `saa-mysql` / 库 `admin`（宿主机端口 `13316`，对应 `saa-admin`）
- 时间: 2026-07-28T06:55:35Z
- 已脱敏: `provider.credential`、`account.password`、`model_config.api_key`
- 完整文件: `ALL.json`（及分表 `*.json`）

## 数量

- `a2a_agent_publication`: 2
- `a2a_remote_agent`: 1
- `account`: 1
- `application`: 3
- `application_component`: 3
- `application_version`: 9
- `knowledge_base`: 1
- `mcp_server`: 1
- `model`: 27
- `model_config`: 0
- `prompt`: 0
- `provider`: 2
- `skill`: 5
- `workspace`: 1

## 应用

### SeeTime (`2081577084405129218`)
- type=`basic` app_status=`published_editing` (3)
- v`1` published model=`24b0e20c/DeepSeek-V4-Flash` skills=0 mcp=0 components=0+0 kb=['2081577502875033602']
- v`2` published model=`24b0e20c/DeepSeek-V4-Flash` skills=0 mcp=0 components=1+1 kb=['2081577502875033602']
- v`3` published model=`24b0e20c/DeepSeek-V4-Flash` skills=1 mcp=0 components=1+1 kb=['2081577502875033602']
- v`4` published model=`24b0e20c/DeepSeek-V4-Flash` skills=1 mcp=0 components=1+1 kb=['2081577502875033602']
- v`5` published model=`24b0e20c/DeepSeek-V4-Flash` skills=1 mcp=0 components=2+1 kb=['2081577502875033602']
- v`6` draft model=`24b0e20c/DeepSeek-V4-Flash` skills=1 mcp=0 components=2+1 kb=['2081577502875033602']

### 报告生成WorkFlow流程编排 (`2081587430652305409`)
- type=`workflow` app_status=`published_editing` (3)
- v`1` published nodes=3 edges=2
- v`2` draft nodes=5 edges=4

### 景区流量查询Agent (`2081674179070840834`)
- type=`basic` app_status=`published` (2)
- v`1` published model=`24b0e20c/DeepSeek-V4-Flash` skills=0 mcp=0 components=0+0

## 资源

- Skill `2081626422176043009` name=`sample-skill` path=`skill/10000/1/2081626422176043009`
- Skill `2081628181916876802` name=`seedoc-cli` path=`skill/10000/1/2081628181916876802`
- Skill `2081628242528763905` name=`codex-ppt` path=`skill/10000/1/2081628242528763905`
- Skill `2081630339991269377` name=`sample-skill` path=`skill/10000/1/2081630339991269377`
- Skill `2081630816158019585` name=`codex-ppt` path=`skill/10000/1/2081630816158019585`
- MCP `2081994243039166466` 高德地图MCP host=`https://mcp.api-inference.modelscope.net` SSE=``
- KB `2081577502875033602` 交通法律法规 docs=0
- A2A pub `2081713837444472834` agent=`景区流量查询Agent` app=`2081674179070840834` enabled=0
- A2A pub `2081713940636934145` agent=`景区流量查询Agent` app=`2081674179070840834` enabled=1
- A2A remote `local_a2a_2081674179070840834` url=`http://172.30.10.28:9080/.well-known/agents/2081674179070840834/agent.json`
- Component `2081587257435938818` 交通事故查询Agent type=`basic` → `2081577084405129218`
- Component `2081588828106317825` 测试工作流 type=`workflow` → `2081587430652305409`
- Component `2081674308402204674` 景区流量Agent type=`basic` → `2081674179070840834`
- Provider `Tongyi` enable=0 has_credential=1
- Provider `24b0e20c` enable=1 has_credential=1

## 账号/工作空间

- account `10000` user=`saa` type=`admin`
- workspace `1` name=`Default Workspace`

