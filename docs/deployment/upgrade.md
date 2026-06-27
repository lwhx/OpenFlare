# 升级与维护

你会学到：如何升级 Server 与 Agent、如何清理观测数据，以及维护前后应该执行哪些验证命令。

升级前建议先确认当前激活版本、最近一次 Agent 应用结果和数据库备份策略。生产环境不要在发布配置、Agent 大规模重连或数据库迁移进行中同时升级。

## Server 升级

拉取最新镜像升级

```bash
docker compose pull
docker compose up
```

如果是源码部署，重新启动 Server 后确认日志中没有数据库迁移或启动错误。

## Agent 升级

Agent 可以随意升级，升级后会在下次心跳时自动拉取最新配置。升级方式：

```
docker pull ghcr.io/rain-kl/openflare-agent:beta
docker rm -f openflare-agent 2>/dev/null || true
docker run -d --name openflare-agent --restart unless-stopped \
  -p 80:80 -p 443:443/tcp -p 443:443/udp \
  -e OPENFLARE_SERVER_URL=<OPENFLARE_SERVER_URL> \
  -e OPENFLARE_AGENT_TOKEN=<OPENFLARE_AGENT_TOKEN> \
  ghcr.io/rain-kl/openflare-agent:beta
  
```
