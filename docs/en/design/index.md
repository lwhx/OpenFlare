# Product Boundary

OpenFlare is a self-hosted OpenResty control plane for single-team or single-organization operations. It unifies reverse proxy configuration, node synchronization, certificate management, and basic observability.

Stable capabilities:

| Capability | Description |
| --- | --- |
| Reverse proxy management | Site-level configuration with multiple domains and origins |
| Configuration versions | Preview, publish, activate, and rollback |
| Agent sync | Registration, heartbeat, sync, and apply result reporting |
| OpenResty management | Main template, performance options, cache options, and Lua assets |
| HTTPS/TLS | Certificate storage and per-domain binding |
| Basic observability | Request rollups, resource snapshots, health events, and access analytics |
| Node management | Node state, tokens, deployment, and update flow |

Default operating model:

* All nodes consume the same globally active version.
* Server stores configuration and state, but does not SSH into nodes.
* Agent is the only controlled entry point on each node.
