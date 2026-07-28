# SAA Admin 本机 Docker 部署

面向当前主机（已有 WeKnora / Nuwax 等占用常用端口）的完整栈部署。

## 访问地址

| 服务 | 地址 |
|------|------|
| Admin UI | http://172.30.10.28:9080/admin |
| OTLP (traces) | http://172.30.10.28:14318/v1/traces |
| Kibana | http://127.0.0.1:15601 |
| Nacos (3.x，A2A 注册/发现) | http://127.0.0.1:17848/nacos |

> 从 Nacos 2.x 升级到 3.x 时，若启动失败请清空 `./data/nacos` 后重建（配置数据需重新导入）。

## A2A

Admin 支持双向 A2A：

1. **发布**：控制台将已发布的 Agent/Workflow 发布为 A2A → `GET /.well-known/agents/{appId}/agent.json`、`POST /a2a/{appId}`
2. **消费**：侧栏「A2A」登记远程 Agent（Card URL 或 Nacos 名），挂到智能体工具或工作流 A2A 节点

环境变量：`A2A_PUBLIC_BASE_URL`（默认 `http://${LAN_IP}:${ADMIN_HOST_PORT}`）用于写入 AgentCard 中的对外 URL。

已有 MySQL 数据卷需手动执行：`init/mysql/a2a-schema-upgrade.sql`。

## 启动

```bash
cd docker/saa-admin
# 可选：在 .env 中设置 DASHSCOPE_API_KEY
docker compose up -d --build
```

## 停止

```bash
cd docker/saa-admin
docker compose down
```

## 模型配置

编辑同目录 `model-config.yml`（默认 DashScope 模板），并在 `.env` 中设置：

```bash
DASHSCOPE_API_KEY=sk-xxx
```

然后 `docker compose up -d admin` 重启 Admin 容器。
