# Development Constraints

After `1.0.0`, OpenFlare development prioritizes stability, upgrade and rollback reliability, documentation accuracy, test coverage, and small iterations inside the existing boundary.

## Change Admission

Before implementing a requirement, check:

1. Whether it fits the product boundary.
2. Whether it follows Server, Agent, and frontend development rules.
3. Whether it risks the publish, sync, rollback, or upgrade flow.
4. Whether deployment, configuration, or README docs need updates.

If a requirement expands the boundary or introduces new infrastructure, update design documentation first.

## Database Migrations

Any table, index, column type, sharding, or internal persistence metadata change must bump the database version and include an explicit migration from the previous version.

Migrations must validate the upgraded schema. Startup must stop if migration or validation fails.

## Frontend Rules

`openflare_server/web` is the frontend baseline:

* Routes and layouts live in `app/`.
* API calls are centralized under `lib/api/`.
* Business logic belongs in `features/`.
* Server state uses TanStack Query.
* Forms use React Hook Form and Zod.
* Theme supports `light`, `dark`, and `system`.
