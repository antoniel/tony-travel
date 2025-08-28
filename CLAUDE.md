# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Self-Improving CLAUDE Reflection

**CRITICAL REQUIREMENT**: ALWAYS offer Self-Improving CLAUDE Reflection opportunities to continuously improve CLAUDE.md based on user interactions and feedback.

**MANDATORY Trigger**: You MUST offer reflection before completing ANY task that:
1. Involved user feedback at any point during the conversation, OR
2. Involved multiple non-trivial steps (e.g., 2+ file edits, complex logic generation, multi-step configurations), OR
3. Required problem-solving or decision-making beyond simple single-step tasks

**ENFORCEMENT**: After completing any qualifying task, you MUST immediately ask: "Should I offer Self-Improving CLAUDE Reflection for this task?" and proceed with the reflection process if applicable.

Process:

- a. Review Interaction: Synthesize all feedback provided by the user throughout the entire conversation history for the task. Analyze how this feedback relates to the active .CLAUDE.md and identify areas where modified instructions could have improved the outcome or better aligned with user preferences.
- b. Identify Active Rules: List the specific global and workspace CLAUDE.md files active during the task.
- c. Formulate & Propose Improvements: Generate specific, actionable suggestions for improving the content of the relevant active rule files. Prioritize suggestions directly addressing user feedback. Use replace_in_file diff blocks when practical, otherwise describe changes clearly.
- d. Await User Action on Suggestions: Ask the user if they agree with the proposed improvements and if they'd like me to apply them now using the appropriate tool (replace_in_file or write_to_file). Apply changes if approved, then proceed to attempt_completion.

Constraint: Do not offer reflection if:
The task was very simple and involved no feedback.

## Development Commands

### Running the Application

- `bun install` - Install dependencies
- `bunx --bun run start` - Start the development server (alias: `npm run dev`)
- `vite dev --port 3000` - Alternative development server command

### Building and Testing

- `bunx --bun run build` - Build for production (alias: `npm run build`)
- `vite build` - Build using Vite
- `bunx --bun run test` - Run tests with Vitest
- `vite preview` - Preview production build

### Code Quality

- `bunx --bun run lint` - Run Biome linter
- `bunx --bun run format` - Format code with Biome
- `bunx --bun run check` - Run both linting and formatting checks

### Adding Components

- `pnpx shadcn@latest add [component]` - Add Shadcn components (e.g., `pnpx shadcn@latest add button`)

## Architecture

### Core Stack

- **Framework**: TanStack Start (React SSR framework)
- **Router**: TanStack Router with file-based routing
- **State Management**: TanStack Query for server state, TanStack Store for client state
- **Styling**: Tailwind CSS v4 with Shadcn components
- **API Layer**: oRPC for type-safe API calls
- **Database**: Drizzle ORM with user-friendly ID generation using nanoid and base58 encoding
- **Environment**: T3 Env for type-safe environment variables
- **Validation**: Zod schemas
- **Build Tool**: Vite
- **Code Quality**: Biome (linting + formatting)
- **Testing**: Vitest with Testing Library
- **ID Generation**: nanoid for base58-encoded, user-friendly IDs with typed prefixes

### oRPC Integration Patterns

**Mandatory Usage**: All API functionality MUST be implemented using oRPC, never as direct API routes.

#### Creating New API Functionality:
1. **Define Functions**: Create oRPC functions in `src/orpc/router/` modules
2. **Add Schemas**: Define Zod schemas for input/output validation  
3. **Export from Index**: Ensure functions are exported from router index
4. **Client Usage**: Import and use via oRPC client, not direct HTTP calls

#### Pattern Example:
```typescript
// ❌ NEVER: src/routes/api.example.ts
// ✅ ALWAYS: src/orpc/router/example.ts
export const getExample = os
  .input(ExampleSchema)
  .handler(async ({ input }) => {
    // Implementation
  })
```

#### React Hooks with oRPC Pattern:
**CRITICAL**: React hooks should ONLY call oRPC functions, never implement business logic or custom abstractions.

```typescript
// ✅ CORRECT: Simple hook returning orpc query directly
function useExample(input: ExampleInput) {
  return orpc.getExample.useQuery(input)
  // OR use queryOptions for advanced cases:
  // return useQuery(orpc.getExample.queryOptions(input))
}

// ❌ WRONG: Custom queryKey helpers, data transformations, business logic
function useExample(input: ExampleInput) {
  return useQuery({
    queryKey: useExample.queryKey(input), // Don't create custom queryKey helpers
    queryFn: async () => transform(await api.call()), // Don't transform in hooks
    // ...custom logic
  })
}
```

**Hook Guidelines**:
- Return the entire useQuery result, let callers handle the response
- Use orpc.functionName.queryOptions() for advanced query configuration
- Never implement business logic or database operations in hooks
- Avoid custom queryKey abstractions - use orpc's built-in patterns

#### Integration Architecture:
- **External APIs**: Create service classes with caching and rate limiting
- **Database Operations**: Use DAO pattern with proper type safety
- **Complex Logic**: Implement in oRPC functions, not route handlers
- **Error Handling**: Use oRPC error handling patterns consistently

### Project Structure

```
src/
├── components/          # Reusable React components
├── routes/             # File-based routing (TanStack Router)
│   ├── __root.tsx      # Root layout component
│   ├── index.tsx       # Homepage route
│   ├── api.*.ts        # API route handlers
│   └── demo.*          # Demo routes (can be deleted)
├── orpc/               # oRPC API setup
│   ├── router/         # API route definitions
│   ├── client.ts       # oRPC client configuration
│   └── schema.ts       # Shared Zod schemas
├── integrations/       # Third-party integrations
│   └── tanstack-query/ # Query client setup
├── lib/                # Utility functions
└── env.ts              # Environment variable configuration
```

### Key Configuration Files

- `vite.config.ts` - Vite build configuration with TanStack Start plugin
- `tsconfig.json` - TypeScript configuration with path aliases (`@/*`)
- `biome.json` - Code formatting and linting rules (tab indentation, double quotes)
- `components.json` - Shadcn component configuration

### Environment Variables

Environment variables are managed through T3 Env in `src/env.ts`:

- Client variables must have `VITE_` prefix
- Server variables: `SERVER_URL` (optional)
- Client variables: `VITE_APP_TITLE` (optional)

### API Layer (oRPC)

The project uses oRPC for type-safe API communication:

**CRITICAL RULE**: NEVER create direct API routes (`src/routes/api.*.ts`). ALWAYS use oRPC functions for all API functionality.

- ALL API functionality must be implemented as oRPC functions in `src/orpc/router/`
- Schemas are shared between client and server using Zod
- Client is configured in `src/orpc/client.ts`
- API endpoints are accessible at `/api/rpc`

### Routing

- File-based routing in `src/routes/`
- Layout component in `src/routes/__root.tsx`
- **IMPORTANT**: Do NOT create API routes (`api.[name].ts`) - use oRPC functions instead
- Demo files can be safely deleted

### State Management

- **Server State**: TanStack Query for API data fetching and caching
- **Client State**: TanStack Store for local application state
- Query client is configured in TanStack integrations

### Styling

- Tailwind CSS v4 with Vite plugin
- Shadcn components for UI primitives
- Global styles in `src/styles.css`
- Class utilities via `clsx` and `tailwind-merge`

## TanStack Start Specific Concepts

### Server Functions (RPCs)

TanStack Start's most powerful feature for full-stack development:

- Created using `createServerFn({ method: 'GET' | 'POST' })` from `@tanstack/react-start`
- Can be called from both client and server code
- Automatically extract server-only code from client bundle
- Support input validation with `.validator()` method
- Access server context (headers, cookies, etc.) via `@tanstack/react-start/server`
- Use `useServerFn()` hook for client-side calls to handle redirects/errors properly

Example pattern:

```typescript
const getUser = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    return db.getUser(data)
  })
```

### Server Routes (API Endpoints)

Create API endpoints alongside your routes:

- Export `ServerRoute` from route files using `createServerFileRoute()`
- Support all HTTP methods (GET, POST, PUT, DELETE, etc.)
- Share files between UI routes and API routes
- Access same routing patterns (dynamic params, wildcards)
- Use standard Web APIs (Request, Response)

Example:

```typescript
export const ServerRoute = createServerFileRoute().methods({
  GET: async ({ request }) => {
    return new Response("Hello, API!")
  },
})
```

### Data Loading Patterns

TanStack Start provides multiple ways to load data:

- **Route Loaders**: Use `loader` in route definitions for critical data
- **Server Functions**: Call from loaders for server-side operations
- **TanStack Query**: Integrate for advanced caching and synchronization
- **Static Data**: Use static server functions for build-time data

### SSR and Hydration

- Full-document SSR by default
- Selective SSR with `ssr: false`, `ssr: 'data-only'`, or `ssr: true` on routes
- Streaming support with React 18+ Suspense
- Client-side hydration handles seamlessly

### File Structure Conventions

- `src/routes/__root.tsx` - Root layout (replaces Next.js layout.tsx)
- `src/routes/index.tsx` - Homepage route (replaces Next.js page.tsx)
- `src/routes/about.tsx` - Static route at `/about`
- `src/routes/posts/$postId.tsx` - Dynamic route at `/posts/[postId]`
- `src/routes/api.users.ts` - API endpoint at `/api/users`
- `src/client.tsx` - Client entry point (optional, auto-generated if missing)
- `src/server.tsx` - Server entry point (optional, auto-generated if missing)
- `src/router.tsx` - Router configuration

### Common Patterns and Best Practices

#### Server Function Error Handling

```typescript
// Always validate inputs
.validator((data: unknown): ValidType => {
  if (!isValid(data)) throw new Error('Invalid input')
  return data as ValidType
})

// Handle redirects properly
throw redirect({ to: '/login' })

// Handle not found
throw notFound()
```

#### Route Data Loading

```typescript
export const Route = createFileRoute("/posts/$postId")({
  loader: async ({ params }) => {
    return await getPost({ data: params.postId })
  },
  component: PostPage,
})

function PostPage() {
  const post = Route.useLoaderData()
  // Component logic
}
```

#### Form Handling with Server Functions

```typescript
const createPost = createServerFn({ method: "POST" })
  .validator(PostSchema)
  .handler(async ({ data }) => {
    const post = await db.createPost(data)
    throw redirect({ to: `/posts/${post.id}` })
  })

// In component
const handleSubmit = async (formData: FormData) => {
  await createPost({ data: formData })
  router.invalidate() // Refresh data
}
```

### Development Workflow

1. **Routes**: Create files in `src/routes/` for pages
2. **Server Functions**: Define in separate files and import into routes
3. **API Endpoints**: Use `ServerRoute` exports in route files
4. **Components**: Build reusable UI in `src/components/`
5. **Styling**: Use Tailwind classes with Shadcn components
6. **Data**: Leverage loaders + server functions for SSR data

### Deployment Considerations

- Uses Vite for bundling with SSR support
- Outputs separate client/server bundles
- Server functions become API endpoints at runtime
- Can deploy to any Node.js hosting (Netlify, Vercel, etc.)
- Environment variables follow Vite conventions

## Important Notes

- Demo files prefixed with `demo` can be safely deleted
- Route tree is auto-generated in `src/routeTree.gen.ts` (ignored by Biome)
- Uses Bun as the preferred package manager and runtime
- Server functions are TanStack Start's killer feature for full-stack development
- Always use type-safe patterns with Zod validation
- File-based routing generates TypeScript definitions automatically

## Database Integration Patterns

### ORM Integration Guidelines

When integrating ORMs (Drizzle, Prisma, etc.):

- **Schema Design**: 
  - Define relationships explicitly with proper foreign keys
  - Use TypeScript-first schemas when available (e.g., Drizzle schema definitions)
  - Consider cascading operations for dependent data (events, accommodations)

- **DAO Pattern Implementation**:
  - Create dedicated DAO files (e.g., `travel.dao.ts`) to abstract query logic
  - Group related operations by domain entity
  - Use parallel queries for list operations when fetching related data
  - Implement proper error handling and type safety

- **Migration Strategy**:
  - Generate and run migrations before implementing DAO logic
  - Seed database with existing data to maintain continuity
  - Test database operations before replacing mocked data

### Database Schema Patterns

#### ID Generation Strategy
- Prefer user-friendly IDs with descriptive prefixes (e.g., `trv_`, `acm_`, `evt_`)
- Use base58 encoding to avoid ambiguous characters (0, O, I, l)
- Implement via `$defaultFn` in Drizzle schemas for automatic generation
- Create typed prefix systems for compile-time validation

#### Schema Consistency
- Use `defaultColumn` helpers to reduce duplication of common fields (id, createdAt, updatedAt)
- Leverage `.returning()` in DAOs when working with auto-generated fields
- Maintain type safety throughout schema definitions and DAO operations

#### Best Practices
- Always consider UX implications of technical IDs (readability, copy-paste friendliness)
- Use declarative database-level solutions over application-level ID generation
- Implement consistent patterns across all entity schemas

### Type Safety with ORMs

- Leverage TypeScript inference from schema definitions
- Use proper type mapping between database models and API responses
- Implement validation at the DAO level for data integrity
- Ensure return types match API contract expectations

## Multi-Step Technical Task Management

### Complex Integration Tasks

For multi-step technical integrations (database setup, API integration, etc.):

- **Discovery Phase**: Always explore existing setup and identify integration points
- **Architecture Planning**: Propose architectural patterns (DAO, Repository, Service layers) early
- **Incremental Implementation**: Replace mocked data systematically, maintaining API contracts
- **Abstraction Opportunities**: Identify and implement patterns to reduce code duplication
- **Validation**: Ensure type safety and data integrity throughout the process

### Task Breakdown Best Practices

- Break complex integrations into 6-10 specific, actionable tasks
- Include discovery, setup, implementation, and validation phases
- Explicitly plan for data migration and seeding when replacing mocked data
- Consider architectural improvements (DAO patterns, abstractions) as separate tasks

## Code Organization Principles

### Domain-Driven File Structure

- **DAO Pattern**: Create `.dao.ts` files for database operations by domain
- **Type Definitions**: Keep database models and API types properly mapped
- **Query Optimization**: Use parallel queries for related data fetching
- **Error Handling**: Implement consistent error patterns across DAOs

### Abstraction Guidelines

- Identify query duplication early and abstract into reusable patterns
- Prefer composition over inheritance for database operations
- Maintain clear separation between database logic and API routing
- Use TypeScript generics for reusable query patterns when appropriate

## Component Development Guidelines

**CRITICAL**: ALWAYS use existing components from the project instead of creating custom implementations from scratch. This ensures consistency with the design system and prevents code duplication.

### Component Priority Order:
1. **First**: Check `src/components/ui/` for Shadcn components (Button, Tabs, Card, etc.)
2. **Second**: Check `src/components/` for custom project components
3. **Last Resort**: Only create new components when existing ones cannot fulfill the requirement

### Before Creating Any UI Element:
- Search for existing Tabs, Button, Dialog, Card, Input components
- Use Grep/Glob tools to find similar implementations in the codebase
- Prefer composition of existing components over creating new ones
- Follow established patterns and design system variables (primary, muted-foreground, etc.)

### Component Abstraction Patterns

**When to Abstract into Reusable Components**:
- When similar UI patterns appear in 2+ locations
- When user explicitly requests component abstraction or reusability
- When complex component logic can be simplified through abstraction
- When component state and behavior can be generalized

**Component Placement Strategy**:
- **`src/components/ui/`**: For general-purpose, highly reusable components (form controls, selectors, etc.)
- **`src/components/`**: For domain-specific or application-specific components
- **Shadcn Integration**: Extend Shadcn components rather than replacing them

**Component API Design Principles**:
- Design flexible APIs that handle multiple use cases without becoming overly complex
- Use discriminated unions for components with multiple modes/variants
- Provide sensible defaults while allowing customization
- Maintain type safety throughout component props and callbacks
- Follow controlled/uncontrolled component patterns for state management

**Implementation Workflow for New Reusable Components**:
1. **Analyze Usage Patterns**: Identify common props, state, and behavior across existing implementations
2. **Design Component API**: Define props interface with proper TypeScript types
3. **Create in Appropriate Location**: Place in `ui/` for general use, `components/` for domain-specific
4. **Implement with Composition**: Build on existing Shadcn/project components where possible
5. **Update Existing Usage**: Replace duplicated implementations with new reusable component

### Examples:
- ✅ Use `<Tabs>` component instead of custom toggle buttons
- ✅ Use `<Button>` variants instead of custom styled buttons  
- ✅ Use `<Card>` components instead of custom divs with styling
- ✅ Abstract common form patterns (LocationSelector, DatePicker) into `ui/` components
- ✅ Create flexible component APIs that handle multiple use cases
- ❌ Don't create custom toggle logic when Tabs exist
- ❌ Don't hardcode colors when design system variables exist
- ❌ Don't create overly specific components that can't be reused
