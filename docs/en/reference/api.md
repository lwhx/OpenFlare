# API Conventions

Management API and Agent API both use JSON.

## Response Shape

Success and failure responses should include a clear `message`:

```json
{
  "success": true,
  "message": "",
  "data": {}
}
```

## Paths

| Type | Convention |
| --- | --- |
| Management API | Authenticated by management Session |
| Agent API | Fixed under `/api/agent/*` |
| Read-only endpoints | `GET` |
| Mutating endpoints | `POST` |

## Authentication

Management endpoints reuse the existing login, role, and Session system.

Agent requests use the node-specific `agent_token`. First-time registration can use a global `discovery_token`. The header is:

```http
X-Agent-Token: <token>
```

Do not log full tokens.

## Swagger

After logging in:

```text
/swagger/index.html
```
