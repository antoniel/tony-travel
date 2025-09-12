ALWAYS ACK THE @CALUDE.md

# Repository Guidelines

## Project Structure & Modules

- `src/routes/`: File-based routes using TanStack Router (e.g., `index.tsx`, `__root.tsx`, `trip.$tripId.tsx`, `api.$.ts`). Do not edit `src/routeTree.gen.ts` (generated).
- `src/components/`: App-specific React components (PascalCase), and `src/components/ui/` shadcn/ui primitives (kebab-case files like `alert-dialog.tsx`).
- `src/orpc/`: oRPC client and modules.
  - Modules live in `src/orpc/modules/<name>/` with:
    - `<name>.model.ts`: Zod schemas (domain types, parsing/coercion).
    - `<name>.routes.ts`: oRPC procedures for the module (query/mutation), import model here.
  - `src/orpc/router/index.ts`: composes/exports modules’ routes.
  - `src/orpc/client.ts`: oRPC client + TanStack Query utils.
- `src/integrations/`: Integration providers (e.g., TanStack Query).
- `src/lib/`, `src/hooks/`, `src/data/`: Utilities, hooks, and sample data.
- `public/`: Static assets (favicon, manifest, robots).

## Build, Test, and Development

- Install deps: `bun install`
- Dev server: `bunx --bun run dev` (Vite on `http://localhost:3000`).
- Build (SSR): `bunx --bun run build` (outputs to `.output/`).
- Preview: `bunx --bun run serve`.
- Start built server: `bunx --bun run start`.
- Lint: `bunx --bun run lint` • Format: `bunx --bun run format` • Check both: `npm run tscheck `.
- Tests (Vitest): `bunx --bun run test`.

## Data Fetching & oRPC

- Always use TanStack Query with the oRPC utils from `@/orpc/client` — no raw `fetch/axios` in components.
- Prefer module routes: `orpc.<module>.<procedure>` when applicable.
- Query example: `useQuery(orpc.getTravel.queryOptions({ input: { id } }))`.
- Mutation example: `useMutation(orpc.saveTravel.mutationOptions())` then `mutate({ travel })`.
- Invalidation: `queryClient.invalidateQueries(orpc.getTravel.queryKey({ input: { id } }))`.

## Coding Style & Naming

- Formatter/Linter: Biome (`biome.json`) with tabs for indentation and double quotes; imports auto-organized.
- TypeScript strict mode; path alias `@/*` (e.g., `import { env } from '@/env'`).
- Components: PascalCase in `src/components` (e.g., `Header.tsx`); UI primitives in `src/components/ui` use kebab-case filenames (e.g., `button.tsx`).
- Routes follow TanStack patterns: `__root.tsx`, `index.tsx`, dynamic `$param` (e.g., `trip.$tripId.tsx`).
- oRPC modules: files named `<module>.model.ts` (Zod) and `<module>.routes.ts` (procedures) under `src/orpc/modules/<module>/`.

## Testing Guidelines

- Framework: Vitest + Testing Library.
- Location: co-locate tests near code under `src` using `*.test.ts(x)`.
- Coverage: no strict threshold yet; add focused tests for route loaders, hooks, and complex components (e.g., calendar interactions).

## Commit & PR Guidelines

- Commits: Imperative, concise subject with optional details, mirroring history (e.g., “Add EventDetailsPanel to Calendar: integrate and handle click”). Prefer small, scoped commits.
- PRs: Include clear description, linked issues, screenshots for UI changes, and a test plan. Ensure `npm run tscheck ` and tests pass; update docs when behavior changes.

## Security & Configuration

- Env vars validated via T3 Env (`src/env.ts`). Client-exposed vars must be prefixed `VITE_` (e.g., `VITE_APP_TITLE`). Do not commit secrets.
- Tailwind CSS v4 via Vite plugin; global styles in `src/styles.css`.
