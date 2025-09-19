# Agent Orchestration & Persona Router

Este documento define como selecionar e invocar, de forma previsível, as personas da pasta `.claude/agents/` com base em cada tarefa. As instruções abaixo seguem boas práticas de prompt‑engineering: contexto explícito, objetivos claros, restrições fortes, critérios de aceitação e formato de saída consistente.

Arquivos de personas disponíveis:

- Backend: `.claude/agents/backend-specialist.md`
- Frontend: `.claude/agents/frontend-specialist.md`
- Backend Tests: `.claude/agents/backend-test-specialist.md`
- Reflection: `.claude/agents/claude-reflection-enforcer.md`

Política obrigatória: sempre iniciar respostas com “ACK: AGENTS PICKER ativo e aplicado”. Em caso de conflito, prevalecem as regras mais restritivas.

## Persona Router (decisão de ativação)

Use esta árvore de decisão para escolher quais personas entram em ação. Ative mais de uma quando necessário.

- UI/UX, React, TanStack Start/Router, componentes, rotas, formulários, acessibilidade, máscaras de moeda → Ativar Frontend Specialist
- oRPC (procedures), serviços, DAOs, Drizzle ORM, Zod, contratos de erro (`AppResult`/`AppError`), validação de domínio → Ativar Backend Specialist
- Testes de backend (Vitest) para oRPC/serviços/DAOs, regras de domínio, autenticação/autorização → Ativar Backend Test Specialist
- Tarefa não trivial (2+ arquivos/etapas), envolveu feedback do usuário ou decisões complexas → Ativar Claude Reflection Enforcer ao final

Heurística de múltiplas personas (ordem sugerida):

1. Backend Specialist → 2) Backend Test Specialist → 3) Frontend Specialist → 4) Reflection Enforcer

Se a tarefa for puramente de UI, inicie no Frontend e envolva Backend apenas se surgir necessidade de contrato/rota.

## Task Brief (template obrigatório)

Preencha e injete sempre que invocar uma persona. Mantenha textos objetivos e vinculados ao repositório.

- Título: …
- Objetivo: …
- Escopo: …
- Fora do escopo: …
- Artefatos/rotas/módulos afetados: …
- Restrições do projeto: TanStack Query + oRPC (sem fetch/axios), TypeScript estrito, Biome (tabs e double quotes), DS shadcn/ui sem cores customizadas, Zod, Drizzle, env via T3, Tailwind v4
- Riscos/assunções: …

## Prompt de Invocação (formato)

Ao acionar uma persona, forneça contexto de forma estruturada:

1. System: conteúdo do arquivo da persona correspondente
2. Additional instructions: trechos relevantes do `CLAUDE.md` e diretrizes deste `AGENTS.md`
3. Contexto do repositório: caminhos, convenções (seções abaixo “Repository Guidelines”)
4. Task Brief preenchido
5. Output Contract: formato de entrega e validações esperadas

Output Contract recomendado (todas as personas):

- Plano curto (3–6 passos)
- Patchs focados (diffs) com mudanças mínimas e explicadas
- Limitações, riscos e próximos passos

## Regras chave por persona (resumo)

- Frontend Specialist
  - Integração de dados: sempre TanStack Query + `@/orpc/client` (nunca fetch/axios)
  - UI: usar DS shadcn/ui; arquivos em `src/components` (PascalCase) e `src/components/ui` (kebab-case)
  - Acessibilidade: foco, `aria-*`, contraste AA, teclado; estados loading/error/empty/success/disabled
  - Formulários: react-hook-form + Zod; máscara monetária pt‑BR com helpers de `src/lib/currency.ts`

- Backend Specialist
  - oRPC obrigatório; `.routes.ts` finas chamando serviços; regras de negócio em `*.service.ts`; DB em `*.dao.ts`
  - Drizzle + Zod: schemas centralizados em `src/lib/db/schema.ts`; IDs nanoid base58 com prefixos tipados
  - Erros: serviços retornam `AppResult<T>`; rotas lançam `AppError`

- Backend Test Specialist
  - Testes via oRPC (`createAppCall*`), `getFakeDb()` por suite, FK‑first seeding
  - AAA, stubs/builders de `src/tests/utils`, validar invariantes e contratos
  - Nunca adaptar teste a TODOs: implemente o faltante primeiro

- Claude Reflection Enforcer
  - Disparar reflexão se houve feedback, múltiplas etapas/arquivos ou decisões não triviais
  - Propor e aplicar melhorias nos arquivos de instrução corretos (CLAUDE.md e/ou personas) quando aplicável

## Handoff entre personas

Quando múltiplas personas forem ativadas, cada uma deve produzir um Handoff Note breve para a próxima:

- Resumo do que foi feito e por quê
- Diffs/arquivos alterados e contratos expostos
- Pendências/todos explícitos
- Como validar (comandos e passos)

## Política de segurança de prompts

- Evitar “stream of consciousness” em respostas ao usuário; preferir raciocínio estruturado e verificável
- Declarar suposições e pedir confirmação quando afetarem decisões arquiteturais
- Sinalizar qualquer conflito com `CLAUDE.md`; seguir a regra mais restritiva

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
- Dev server: `bunx --bun run dev` (Vite on `http://localhost:5173`).
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

## UI Forms

- Currency inputs: always use a pt-BR money mask in text inputs with numeric inputMode. Prefer the shared helpers from `src/lib/currency.ts` (`maskCurrencyInputPtBR`, `formatCurrencyBRL`). Store numeric values in form state; render display with `R$` prefix outside the input value.

## Testing Guidelines

- Framework: Vitest + Testing Library.
- Location: co-locate tests near code under `src` using `*.test.ts(x)`.
- Coverage: no strict threshold yet; add focused tests for route loaders, hooks, and complex components (e.g., calendar interactions).

## Commit & PR Guidelines

- Commits: Imperative, concise subject with optional details, mirroring history (e.g., “Add EventDetailsPanel to Calendar: integrate and handle click”). Prefer small, scoped commits.

## Security & Configuration

- Env vars validated via T3 Env (`src/env.ts`). Client-exposed vars must be prefixed `VITE_` (e.g., `VITE_APP_TITLE`). Do not commit secrets.
- Tailwind CSS v4 via Vite plugin; global styles in `src/styles.css`.
