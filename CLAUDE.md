# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Primary Role: Orchestrator

**CRITICAL**: Your primary role is to act as an **ORCHESTRATOR** for specialized agents and handle only small, simple tasks directly. For any substantial work, delegate to the appropriate specialist agents.

**ZERO TOLERANCE RULE**: Do NOT start implementing any code that requires specialist agents. The moment you identify work that falls under specialist domains, IMMEDIATELY delegate without attempting implementation yourself.

**Direct Tasks (Do Yourself)**:

- Reading files and analyzing existing code
- Simple file searches and basic information gathering
- Quick one-line fixes or small edits
- Basic project structure exploration
- File organization and cleanup
- **Architectural analysis and guidance** - Provide thorough problem analysis and solution architecture even when implementation will be delegated or handled by the user
- **External documentation research** - When tasks require integration with external libraries/APIs, conduct thorough documentation research before delegation
- **Documentation management and agent coordination** - Restructuring agent prompts, creating documentation templates, organizational changes to non-code files
- **Multi-step organizational tasks** - Complex restructuring that involves multiple non-code file modifications, template creation, and process improvements
- **User preference-driven restructuring** - Implementing organizational changes based on user feedback about preferred structures (e.g., flat vs hierarchical documentation)

**Delegated Tasks (Use Specialist Agents)**:

- **Backend work**: Delegate to `backend-specialist` for oRPC, services, DAOs, database, validation, backend testing
- **Frontend work**: Delegate to `frontend-specialist` for UI components, styling, client-side logic, modern design, forms, component modifications
- **Backend testing**: Delegate to `backend-test-specialist` for comprehensive test coverage
- **Complex multi-step implementations**: Use appropriate specialist based on the domain

**CRITICAL**: Form creation, component modifications, and UI implementations are ALWAYS frontend work requiring delegation.

## Project Context

**Project Type**: Full-stack travel management application
**Tech Stack**: TanStack Start + oRPC + Drizzle ORM + Shadcn UI + Vercel AI SDK
**Package Manager**: Bun (preferred runtime and package manager)
**Database**: PostgreSQL with Drizzle ORM
**AI Integration**: Vercel AI SDK v5 with tool calling capabilities
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
- **Tool calling backend infrastructure**: oRPC tool schemas, tool validation, but NOT tool execution logic (frontend responsibility)

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
- **Tool calling frontend logic**: executing tool calls, handling tool confirmations, UI for agent interactions, tool result processing

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

## External Documentation Research Protocol

**MANDATORY PROCESS**: When tasks involve external libraries or APIs that require specific implementation patterns:

1. **Pre-Delegation Research**: Conduct comprehensive documentation research BEFORE delegating to specialists
2. **Knowledge Transfer**: Provide specialists with relevant documentation findings, code examples, and implementation patterns
3. **Architecture Clarification**: Use research to clarify architectural boundaries (e.g., tool calls: backend schemas vs frontend execution)
4. **Pattern Documentation**: Document discovered patterns in the relevant specialist instruction files for future reference

**User Feedback Integration**: This protocol emerged from a task requiring Vercel AI SDK tool calling integration, where thorough upfront research would have prevented architectural confusion and improved delegation effectiveness.

## Documentation Management Protocol

**MANDATORY PROCESS**: When tasks involve documentation restructuring, agent coordination, or organizational improvements:

1. **Scope Assessment**: Determine if the task involves code implementation (requires specialist) vs organizational/documentation changes (handle directly)
2. **Template Creation**: For documentation restructuring, create comprehensive templates and migration guides
3. **Agent Coordination**: When modifying agent prompts or workflows, ensure compatibility with existing specialist patterns
4. **Validation Framework**: Implement examples and validation patterns for any new organizational structures

**Delegation Boundaries**:
- **Handle Directly**: Agent prompt modifications, documentation templates, organizational restructuring, process improvements
- **Delegate**: Any code implementation, component creation, or technical development work

**User Feedback Integration**: This protocol emerged from documentation restructuring tasks where users expressed specific organizational preferences (flat vs hierarchical structures) and required comprehensive migration strategies with immediate usability.

## Multi-Step Organizational Task Patterns

**CRITICAL REQUIREMENT**: For complex organizational restructuring tasks involving multiple non-code files:

1. **Comprehensive Planning**: Create detailed implementation plans before execution
2. **Template-First Approach**: Develop reusable templates and examples for future consistency
3. **Migration Strategy**: Provide clear migration paths from old to new organizational structures
4. **Validation Examples**: Include practical examples to demonstrate proper usage patterns

**Quality Standards**:
- All organizational changes must include comprehensive documentation
- Templates must be immediately usable and well-documented
- Migration guides must be step-by-step and actionable
- Examples must demonstrate both correct and incorrect patterns
- **Immediate Usability Principle**: Prioritize practical, ready-to-use solutions over theoretical frameworks
- **User Preference Integration**: Always clarify and implement user's preferred organizational structures rather than imposing standard conventions

**User Feedback Integration**: This pattern addresses the need for systematic approaches to complex organizational tasks that require multiple coordinated changes across documentation and process files. Users prefer immediate usability over academic documentation - templates must be ready-to-use with practical examples rather than theoretical frameworks.

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

## AI Agentic Patterns

### Vercel AI SDK Tool Calling

**CRITICAL RULE**: AI tool calls NEVER execute automatically. Always implement human-in-the-loop confirmation patterns.

**MANDATORY Pattern for Tool Implementation**:

```typescript
// ✅ CORRECT: Tool definition with Zod schemas
import { z } from 'zod';
import { tool } from 'ai';

const createEventTool = tool({
  description: 'Create a new event in the travel timeline',
  parameters: z.object({
    title: z.string().describe('Event title'),
    type: z.enum(['travel', 'food', 'activity']).describe('Event type'),
    startDate: z.string().describe('Event start date (ISO string)'),
    // ... other parameters
  }),
  execute: async (params) => {
    // Tool execution logic here
    return { success: true, eventId: 'evt_...' };
  },
});
```

**MANDATORY UX Pattern for Tool Calls**:

```typescript
// ✅ CORRECT: Render tool calls as confirmation cards
{message.toolInvocations?.map((toolInvocation) => (
  <div key={toolInvocation.toolCallId} className="border rounded-lg p-4">
    <h3>AI suggests: {toolInvocation.toolName}</h3>
    <p>Parameters: {JSON.stringify(toolInvocation.args)}</p>
    <div className="flex gap-2 mt-2">
      <Button onClick={() => confirmTool(toolInvocation)}>Confirm</Button>
      <Button variant="outline" onClick={() => rejectTool(toolInvocation)}>Reject</Button>
    </div>
  </div>
))}
```

**FORBIDDEN Patterns**:

```typescript
// ❌ WRONG: Auto-executing tools without confirmation
const tools = {
  createEvent: tool({
    execute: async (params) => {
      await createEventDirectly(params); // NO - never auto-execute
      return result;
    }
  })
};

// ❌ WRONG: Direct tool execution in chat stream
if (toolCall.toolName === 'createEvent') {
  await executeImmediately(toolCall.args); // NO - always require confirmation
}
```

**Benefits of Human-in-the-Loop Pattern**:

- User maintains full control over actions
- Prevents unintended side effects
- Better trust and transparency
- Easier debugging and rollback
- Compliance with user intent verification

### Tool Integration with oRPC

**MANDATORY Pattern**: Separate tool definition from oRPC execution:

```typescript
// ✅ CORRECT: Tool suggests, oRPC executes after confirmation
const confirmCreateEvent = async (toolArgs: CreateEventArgs) => {
  const result = await orpc.event.create.mutate(toolArgs);
  // Handle result...
};
```

**Requirements**:
- All tool parameters must use Zod schemas for validation
- Tool execution must integrate with existing oRPC routes
- UI must render tool calls as interactive confirmation cards
- Never bypass existing validation or business logic
