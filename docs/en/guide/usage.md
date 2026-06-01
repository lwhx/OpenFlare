# Basic Usage

You will learn: What website configurations, origins, certificates, versions, nodes, and observability are in OpenFlare, and the recommended sequence of operations during daily usage.

OpenFlare does not directly modify Nginx/OpenResty configurations on nodes online. What you modify in the management console is control plane data; only after publishing and activating a new version will the Agent pull the complete configuration and apply it to the nodes.

## Core Concepts

| Concept | Description |
| --- | --- |
| Website Config | The aggregate object for reverse proxy rules. One website configuration can bind one or more domains. |
| Primary Domain | The first domain in the `domains` list, used as the main display domain for the website. |
| Origin | The upstream address accessed by the reverse proxy, e.g., `http://10.0.0.10:8080`. |
| Config Version | An immutable snapshot of the complete OpenResty configuration generated upon publishing. |
| Active Version | The globally effective configuration version. All nodes consume the same active version by default. |
| Agent | The node-side process responsible for registration, heartbeats, sync, validation, reloads, and rollbacks on failure. |

## Recommended Operation Sequence

When publishing a reverse proxy configuration in daily operations, the following sequence is recommended:

1. Confirm that at least one Agent node is online.
2. Add or select an origin address.
3. Create a website configuration, entering the domain, origin, and site-level configurations.
4. If HTTPS is required, upload or select a certificate and bind it by domain.
5. Preview the configuration or review the change summary.
6. Publish and activate the new version.
7. Verify the application result in the node details and application logs.

## Create Website Configuration

A website configuration requires at least:

| Field | Requirement |
| --- | --- |
| Website Name | Business unique identifier; the primary domain is usually used if left blank |
| Domain | At least one domain, where the first is the primary domain; any domain can belong to only one website globally |
| Origin Address | A valid `http://` or `https://` address |
| Enabled Status | Only enabled website configurations will participate in publishing and rendering |

Example:

| Field | Example |
| --- | --- |
| Website Name | `docs` |
| Domain | `docs.example.com` |
| Origin Address | `http://10.0.0.10:8080` |
| Back-to-source Host | `docs.internal.example.com` |

Upstream Address Rules:

* A single upstream can carry a base path or query, e.g., `https://app.example.com/base?from=openflare`.
* When multiple upstreams are used for load balancing, each upstream must be a pure `scheme://host[:port]`.
* Multiple upstreams in the same rule must use the same protocol.

## Manage Origins

Origins act as a lightweight directory to reuse common upstream addresses. After a website configuration links with an origin, it still stores a renderable snapshot of the `origin_url`, ensuring that historic configuration versions can be re-rendered and rolled back independently.

Recommended Practices:

* Maintain internal service addresses that are frequently reused as Origins.
* After modifying an origin directory, check if published website configurations need their origin snapshots updated.
* Use preview or diff to verify rendering results before publishing.

## Enable HTTPS

HTTPS is bound by domain rather than being forced across the entire website.

Operation Sequence:

1. Upload or host certificates in the Certificate Management section.
2. Edit the website configuration and select certificates for domains requiring HTTPS.
3. Domains without a bound certificate will remain HTTP and will not be automatically placed in a `443 ssl` server block.
4. Publish and activate the new version.

If a website contains multiple domains, the Server groups and renders the HTTPS configuration by certificate during publishing while keeping these domains within the same website snapshot.

## Configure WAF & PoW

Security protection is centrally accessed via the **WAF** link in the side navigation bar:

* The WAF page maintains global and custom rule groups. Global rule groups always apply to all websites; custom rule groups can bind websites directly in the group settings or inside the `WAF` section of the website details.
* Clicking **Manage IP Groups** on the WAF page opens the independent IP Groups section. Manual IP groups store IPs/CIDR blocks directly; automatic IP groups evaluate Expr rules against request logs periodically to update members; subscription IP groups periodically sync from remote text or JSON feeds.
* The Auto IP Group page provides two presets: requests count > 100 and 404 ratio >= 80% from a single IP; or IP-host direct access count > 50 and direct access ratio > 50% from a single IP. You can click **Test Rule** to preview IPs matching the log window before saving, and click **Execute Now** to update the group members instantly after saving. The syntax is detailed in [WAF Auto IP Group Expressions](./waf-ip-group-expr.md).
* In the blacklist/whitelist settings of a WAF rule group, you can add IPs/CIDR blocks directly or reference existing IP groups. The published version snapshot only contains referenced IP group IDs; the Agent synchronizes IP group members via checksum differentials and WebSocket real-time broadcasts.
* `PoW` is a configuration Tab in the rule group, located between `Blacklist/Whitelist` and `Block Interception`. It reuses the site's existing PoW execution logic, allowing current PoW parameters to apply to all websites or only those bound to the current rule group.
* The website details page no longer edits individual PoW rules; it only displays the global WAF rule group and binds custom WAF rule groups. The PoW enablement scopes and rule parameters must be maintained centrally on the WAF pages.

After WAF rule groups, site bindings, or PoW configurations are modified, you must republish and activate the configuration version to let the Agent pull and apply them to OpenResty. IP group member changes do not require a new version publication; online Agents update incrementally via WebSockets, while offline or non-WebSocket Agents synchronize via checksum differentials in the next heartbeat.

For detailed information on WAF security configurations and evaluation principles, see [WAF Security Protection](./waf-usage.md).

## Publish, Activate & Rollback

Standard Pipeline:

```text
Modify config -> Preview / Diff -> Publish -> Generate complete version -> Activate version -> Agent pulls -> Local application -> Report result
```

During publication, the Server reads all enabled website configurations, the main OpenResty config templates, performance and cache parameters, and certificate assets, rendering the complete configuration and calculating its `checksum`.

Rolling back does not modify historic versions; it simply re-activates an older version. Once the Agent detects a change in the active version, it pulls and applies it following the standard sync flow.

## View Nodes & Observability

The Nodes section is designed to answer three questions:

| Question | Where to check |
| --- | --- |
| Is the node online? | Node List or Node Details |
| Which version is currently running? | Current Version in Node Details |
| Did the most recent application succeed? | Application Logs |

The node IP is automatically filled by Agent registration and heartbeats by default. If you manually enter or modify the IP in the management console, the node edit page defaults to "Lock Node IP"; when enabled, Agent reports will not override this IP. Disabling the lock restores auto-update logic in the next heartbeat or WebSocket state report.

Traffic Analytics and Resource Snapshots provide basic observability. OpenFlare only retains access details within a controlled time window, and is not positioned as a general logging platform. If you require long-term log indexing, integrate an independent logging system.

## Common Scenarios

### Add a Reverse Proxy for an Internal Service

1. Verify that the origin service is reachable from the Agent node.
2. Add a website configuration in the management console.
3. Enter the domain, e.g., `app.example.com`.
4. Enter the origin, e.g., `http://10.0.0.20:8080`.
5. Publish and activate the version.
6. Verify the domain on the Agent node or from a browser.

> [!TIP]
> If your origin server is deployed internally without a public IP and is unreachable by the Agent, use the intranet penetration tunnel feature to map your service. For detailed instructions, see [Tunnel & Intranet Penetration](./tunnel-usage.md).

### Enable HTTPS for an Existing Domain

1. Prepare a certificate covering the domain.
2. Upload or create a certificate record in Certificate Management.
3. Edit the website configuration and select the certificate for the domain.
4. Publish and activate the version.
5. Verify the certificate chain and status code in a browser or via `curl -I https://your-domain`.

### Roll Back a Failed Publication

1. Open the Configuration Versions page.
2. Locate the last known good version.
3. Re-activate that version.
4. Check the node application logs to verify that the Agent applied the old version.
5. Fix the configuration issues before publishing a new version.

## Recommended Practices

* Explicitly configure `SESSION_SECRET` and prefer PostgreSQL in production.
* Review the preview or diff after modifying a website configuration before publishing.
* Check the node details and application logs after every publication.
* Maintain a stable network path from Agent to Server in multi-node deployments.
* Never manually modify OpenResty configurations managed by OpenFlare on the node; these files will be overwritten in the next publication.
