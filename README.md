<p align="right">
    <a href="./README.md">中文</a> | <strong>English</strong>
</p>

[//]: # (<p align="center">)

[//]: # (  <a href="https://github.com/Rain-kl/ATSFlare"><img src="https://raw.githubusercontent.com/Rain-kl/ATSFlare/main/atsf_server/web/public/logo.png" width="150" height="150" alt="ATSFlare logo"></a>)

[//]: # (</p>)

<div align="center">

# ATSFlare

_✨ control plane for reverse proxy management ✨_

</div>

<p align="center">
  <a href="https://raw.githubusercontent.com/Rain-kl/ATSFlare/main/LICENSE">
    <img src="https://img.shields.io/github/license/Rain-kl/ATSFlare?color=brightgreen" alt="license">
  </a>
  <a href="https://github.com/Rain-kl/ATSFlare/releases/latest">
    <img src="https://img.shields.io/github/v/release/Rain-kl/ATSFlare?color=brightgreen&include_prereleases" alt="release">
  </a>
  <a href="https://github.com/Rain-kl/ATSFlare/releases/latest">
    <img src="https://img.shields.io/github/downloads/Rain-kl/ATSFlare/total?color=brightgreen&include_prereleases" alt="release">
  </a>
  <a href="https://goreportcard.com/report/github.com/Rain-kl/ATSFlare">
    <img src="https://goreportcard.com/badge/github.com/Rain-kl/ATSFlare" alt="GoReportCard">
  </a>
</p>

[//]: # (<p align="center">)

[//]: # (  <a href="https://github.com/Rain-kl/ATSFlare/releases">Download</a>)

[//]: # (  ·)

[//]: # (  <a href="https://github.com/Rain-kl/ATSFlare/blob/main/README.en.md#deployment">Tutorial</a>)

[//]: # (  ·)

[//]: # (  <a href="https://github.com/Rain-kl/ATSFlare/issues">Feedback</a>)

[//]: # (</p>)



## 仓库结构

- `atsf_server`: Gin + GORM + SQLite 的控制中心，包含管理端 API、Agent API 和 Web 管理台
- `atsf_agent`: Go 单体 Agent，负责注册、心跳、同步配置、写入 Nginx 路由文件并 reload
- `docs`: 设计、开发规范、开发计划和部署联调文档


## 快速开始

- [docs/deployment.md](/Users/ryan/DEV/Go/ATSFlare/docs/deployment.md)


## 贡献

参与开发请先阅读：

1. [docs/design.md](/Users/ryan/DEV/Go/ATSFlare/docs/design.md)
2. [docs/development-guidelines.md](/Users/ryan/DEV/Go/ATSFlare/docs/development-guidelines.md)
3. [docs/development-plan.md](/Users/ryan/DEV/Go/ATSFlare/docs/development-plan.md)

