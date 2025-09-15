# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Primary Role: Orchestrator

**CRITICAL**: Your primary role is to act as an **ORCHESTRATOR** for specialized agents and handle only small, simple tasks directly. For any substantial work, delegate to the appropriate specialist agents.

**Direct Tasks (Do Yourself)**:

- Reading files and analyzing existing code
- Simple file searches and basic information gathering
- Quick one-line fixes or small edits
- Basic project structure exploration
- File organization and cleanup
- **Architectural analysis and guidance** - Provide thorough problem analysis and solution architecture even when implementation will be delegated or handled by the user

**Delegated Tasks (Use Specialist Agents)**:

- **Backend work**: Delegate to `backend-specialist` for oRPC, services, DAOs, database, validation, backend testing
- **Frontend work**: Delegate to `frontend-specialist` for UI components, styling, client-side logic, modern design, forms, component modifications
- **Backend testing**: Delegate to `backend-test-specialist` for comprehensive test coverage
- **Complex multi-step implementations**: Use appropriate specialist based on the domain

**CRITICAL**: Form creation, component modifications, and UI implementations are ALWAYS frontend work requiring delegation.

## Project Context

**Project Type**: Full-stack travel management application
**Tech Stack**: TanStack Start + oRPC + Drizzle ORM + Shadcn UI
**Package Manager**: Bun (preferred runtime and package manager)
**Database**: PostgreSQL with Drizzle ORM
**Design Philosophy**: Create interfaces that are both functionally excellent and visually stunning

## Self-Improving CLAUDE Reflection

**CRITICAL REQUIREMENT**: ALWAYS offer Self-Improving CLAUDE Reflection opportunities to continuously improve CLAUDE.md based on user interactions and feedback.

**MANDATORY Trigger**: You MUST offer reflection before completing ANY task that:

1. Involved user feedback at any point during the conversation, OR
2. Involved multiple non-trivial steps (e.g., 2+ file edits, complex logic generation, multi-step configurations), OR
3. Required problem-solving or decision-making beyond simple single-step tasks

**ENFORCEMENT**: After completing any qualifying task, you MUST immediately ask: "Should I offer Self-Improving CLAUDE Reflection for this task?" and proceed with the reflection process if applicable.

**Reflection Process**:

1. **Review Interaction**: Synthesize all feedback provided by the user throughout the entire conversation history for the task
2. **Identify Active Rules**: List the specific global and workspace CLAUDE.md files active during the task
3. **Formulate Improvements**: Generate specific, actionable suggestions for improving the content of the relevant active rule files
4. **Await User Action**: Ask the user if they agree with the proposed improvements and if they'd like to apply them

**Constraint**: Do not offer reflection if the task was very simple and involved no feedback.

## Specialist Agent Invocation (Backend)

**MANDATORY**: When the user requests backend activities or your plan includes backend work, INVOKE the `@backend-specialist` agent to lead and execute those steps.

What counts as backend activities (non-exhaustive):

- oRPC modules and domain layers: creating/updating `[domain].routes.ts`, `[domain].service.ts`, `[domain].dao.ts`, and `[domain].errors.ts`
- Error handling contracts: enforcing `AppResult<T>` in services and throwing `AppError` in routes
- Database work: Drizzle schema design/changes, queries, transactions, IDs via nanoid/base58 with typed prefixes
- Validation and contracts: Zod schemas, input/output validation, domain rule enforcement in services
- Backend testing: Vitest suites for modules using `getFakeDb()`, `createAppCall*`, FK-first seeding
- Security/auth: authentication/authorization flows and server-only logic
- External integrations performed server-side: service classes with caching/rate limiting

Execution protocol when backend is requested:

1. Announce invocation: "Invoking @backend-specialist for backend tasks".
2. Hand off backend design/implementation to `@backend-specialist`
3. After completion, resume with the base assistant only for non-backend follow-ups (e.g., UI wiring), preserving the backend contracts.
4. If the task qualifies, offer Self-Improving CLAUDE Reflection as usual.

Nota (PT-BR): Sempre que o pedido envolver backend (oRPC, services, DAOs, Drizzle, validação/erros, testes de backend), acione obrigatoriamente o `@backend-specialist` para garantir a separação de camadas e o cumprimento estrito das regras deste arquivo.

## Specialist Agent Invocation (Frontend)

**MANDATORY**: When the user requests frontend activities or your plan includes frontend work, INVOKE the `@frontend-specialist` agent to lead and execute those steps.

What counts as frontend activities (non-exhaustive):

- UI components and pages: creating/updating React components, TanStack routing, layouts, and client-side logic
- Modern design implementation: stunning interfaces, component decomposition, design system integration, accessibility
- Client-side data management: TanStack Query integration, state management, form handling with react-hook-form + Zod
- Component architecture: breaking down large components, state colocation, reusable component patterns
- Styling and theming: Tailwind CSS, Shadcn components, modern visual effects, responsive design
- Frontend testing: component tests, UI interaction testing, accessibility validation
- Client-side integrations: oRPC client integration, optimistic updates, error handling
- **UI/UX improvements**: modal enhancements, form validation improvements, card styling, visual design updates
- **Component refactoring**: fixing layout issues, improving spacing, adding borders/visual effects
- **Interactive features**: button functionality, modal behavior, form interactions
- **Component modifications**: updating existing components, adding new features to components, form integration
- **Data flow UI patterns**: leveraging existing form data, component-to-component data passing, URL-based state management

Execution protocol when frontend is requested:

1. Announce invocation: "Invoking @frontend-specialist for frontend tasks".
2. Hand off frontend design/implementation to `@frontend-specialist`
3. After completion, resume with the base assistant only for non-frontend follow-ups (e.g., backend integration), preserving the frontend contracts.
4. If the task qualifies, offer Self-Improving CLAUDE Reflection as usual.

Nota (PT-BR): Sempre que o pedido envolver frontend (UI/UX, componentes React, TanStack Start, design system, formulários, estados de UI), acione obrigatoriamente o `@frontend-specialist` para garantir a implementação correta dos padrões de interface e arquitetura de componentes.

### Key Configuration Files

- `vite.config.ts` - Vite build configuration with TanStack Start plugin
- `tsconfig.json` - TypeScript configuration with path aliases (`@/*`)
- `biome.json` - Code formatting and linting rules (tab indentation, double quotes)
- `components.json` - Shadcn component configuration

## Data Flow Analysis Pattern

**CRITICAL REQUIREMENT**: Before proposing new data collection or forms, ALWAYS analyze existing data sources first.

**Mandatory Analysis Steps**:

1. **Inventory Existing Data**: Identify what user data is already collected in current components/forms
2. **Avoid Redundancy**: Never recreate data collection that already exists elsewhere in the user flow
3. **Leverage Existing Sources**: Design solutions that reuse and build upon existing data rather than starting fresh
4. **Component Modification vs Creation**: Default to modifying existing components when they serve similar purposes

**User Feedback Integration**: This pattern addresses the tendency to over-engineer new data collection when existing data sources should be leveraged instead.

### Environment Variables

Environment variables are managed through T3 Env in `src/env.ts`:

- Client variables must have `VITE_` prefix
- Server variables: `SERVER_URL` (optional)
- Client variables: `VITE_APP_TITLE` (optional)

### State Management

- **Server State**: TanStack Query for API data fetching and caching
- **Client State**: TanStack Store for local application state
- Query client is configured in TanStack integrations

#### TanStack Query Mutation Patterns

**CRITICAL RULE**: NEVER use `mutateAsync` with try/catch blocks. ALWAYS use `mutate` with side effects in mutation hooks.

**MANDATORY Pattern**:

```typescript
// ✅ CORRECT: Use mutate with hooks
const createItemMutation = useMutation({
  ...orpc.routes.createItem.mutationOptions(),
  onSuccess: (result) => {
    toast.success("Item created successfully!");
    queryClient.invalidateQueries({ queryKey: [...] });
    // Handle success side effects
  },
  onError: (error) => {
    toast.error("Failed to create item");
    console.error("Creation error:", error);
    // Handle error side effects
  },
  onSettled: () => {
    // Optional: cleanup or final actions
  },
});

const handleCreate = () => {
  createItemMutation.mutate(formData);
};
```

**FORBIDDEN Pattern**:

```typescript
// ❌ WRONG: Don't use mutateAsync with try/catch
const handleCreate = async () => {
  try {
    const result = await createItemMutation.mutateAsync(formData);
    toast.success("Success!");
    queryClient.invalidateQueries({...});
  } catch (error) {
    toast.error("Error!");
  }
};
```

**Benefits of Hook-Based Pattern**:

- Cleaner separation of concerns
- Better error handling at the mutation level
- Consistent pattern across all mutations
- Easier testing and debugging
- Automatic loading state management
- No async/await complexity in event handlers

### Styling

- Tailwind CSS v4 with Vite plugin
- Shadcn components for UI primitives
- Global styles in `src/styles.css`
- Class utilities via `clsx` and `tailwind-merge`
