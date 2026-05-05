# Command Center Usage

## Run The Dev Server

From the repo root:

```bash
pnpm dev:web
```

Open:

```text
http://localhost:3000/internal/command-center
```

The command center is protected by environment logic. It is available when `NODE_ENV !== "production"` or when `INTERNAL_COMMAND_CENTER_ENABLED=true`.

## Generate Screenshots

Start or build/serve the web app, then run:

```bash
pnpm ui:screenshots
```

Screenshots are written to `docs/ui/screenshots`.

## Sync Screenshots For Browser Viewing

```bash
pnpm ui:screenshots:sync
```

This copies `docs/ui/screenshots/*.png` into `apps/web/public/screenshots`.

## Generate Registry And Docs

```bash
pnpm ui:command-center
```

This runs:

- `pnpm ui:registry`
- `pnpm ui:screenshots:sync`
- `pnpm ui:docs`

## Add Change Requests

Use the detail panel in `http://localhost:3000/internal/command-center`.

The UI calls:

```text
/api/internal/command-center/change-requests
```

The API writes to:

```text
docs/ui/change-requests.json
```

After adding or updating requests, regenerate docs:

```bash
pnpm ui:docs
```

## Verify No Drift

Run:

```bash
pnpm ui:command-center
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Then review `docs/ui/DOCS_SYNC_REPORT.md`.
