# Publish First Site

OpenFlare publishes complete configuration versions. After editing a site, publish and activate a new version before Agents apply it.

## Create Site Configuration

Required fields:

| Field | Description |
| --- | --- |
| Site name | Business-unique identifier; defaults to the primary domain when omitted |
| Domains | At least one domain; the first one is the primary domain |
| Origin URL | Valid `http://` or `https://` upstream URL |
| Enabled | Only enabled sites are rendered into releases |

A domain can belong to only one site.

## Bind Certificates

HTTPS certificates are bound per domain. Domains without certificates are not automatically rendered into `443 ssl` server blocks.

## Publish and Activate

```text
Edit rules -> Preview / diff -> Publish -> Create full version -> Activate -> Agent pulls -> Agent applies -> Agent reports
```

Server reads enabled sites, OpenResty template, performance options, and cache options, renders a full configuration, computes `checksum`, writes `config_versions`, then switches the active version.

## Verify

Check that the node is online, the node version matches the active version, the latest apply log succeeded, and the version page marks the new version as active.
