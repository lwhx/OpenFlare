# Release Model

OpenFlare publishes complete configuration versions instead of modifying node configuration online.

```text
Edit rules -> Preview / diff -> Publish -> Create full version -> Activate -> Agent pulls -> Agent applies -> Agent reports
```

## Publish Rules

Server must:

1. Read all enabled `proxy_routes`.
2. Read the OpenResty main template and structured options.
3. Render the full OpenResty configuration.
4. Compute `checksum`.
5. Write `config_versions`.
6. Switch the active version.
7. Let Agents discover and apply it in later heartbeats.

Version numbers use `YYYYMMDD-NNN`.

## Immutable History

Historical versions are immutable. Rollback reactivates an old version.

Only one global active version exists at a time. Node-specific version groups are not part of the current model.

## Agent Apply Strategy

Agent backs up old files, writes the new main config, route config, certificates, and Lua assets, then validates and reloads.

If activation fails, Agent attempts to recover. A failed `version + checksum` is blocked locally until the remote active version or checksum changes.
