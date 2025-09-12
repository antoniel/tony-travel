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

#### oRPC Architecture: Routes vs Services Pattern

**CRITICAL ARCHITECTURAL PRINCIPLE**: "Não deve existir lógica no .routes apenas no service o routes é só resposável por chamar os services e lidar com os Results<T> retornados pelo .service"

**Translation**: There should be no logic in .routes, only in service. Routes are only responsible for calling services and handling Results<T> returned by .service

**MANDATORY SEPARATION**:

- **Routes Layer** (`*.routes.ts`):
  - ONLY handle oRPC procedure definitions and input validation
  - ONLY call corresponding service functions
  - ONLY handle `AppResult<T>` success/error responses
  - NEVER contain business logic, database operations, or complex transformations

- **Service Layer** (`*.service.ts`):
  - Contains ALL business logic and validation rules
  - Handles database operations via DAO layer
  - Returns `AppResult<T>` with proper error handling
  - Implements complex data transformations and business rules

#### Creating New API Functionality:

1. **Define Service Functions**: Create business logic in `src/orpc/modules/[domain]/[domain].service.ts`
2. **Define Route Handlers**: Create thin oRPC handlers in `src/orpc/modules/[domain]/[domain].routes.ts` that only call services
3. **Add Schemas**: Define Zod schemas for input/output validation
4. **Export from Index**: Ensure functions are exported from router index
5. **Client Usage**: Import and use via oRPC client, not direct HTTP calls

#### Correct Route/Service Pattern:

```typescript
// ✅ CORRECT: src/orpc/modules/example/example.service.ts
export async function getExampleService(input: GetExampleInput): Promise<AppResult<Example>> {
  try {
    // ALL business logic goes here
    const result = await exampleDao.findById(input.id)
    if (!result) {
      return error("EXAMPLE_NOT_FOUND", "Example not found")
    }
    return success(result)
  } catch (err) {
    return error("INTERNAL_ERROR", "Failed to get example")
  }
}

// ✅ CORRECT: src/orpc/modules/example/example.routes.ts
export const getExample = os.input(GetExampleSchema).handler(async ({ input }) => {
  // ONLY call service and handle Result<T>
  const result = await getExampleService(input)
  if (!result.success) {
    throw new AppError(result.error.code, result.error.message)
  }
  return result.data
})

// ❌ WRONG: Business logic in routes
export const getExample = os.input(GetExampleSchema).handler(async ({ input }) => {
  // ❌ DON'T: Database operations in routes
  const result = await db.select().from(Example).where(eq(Example.id, input.id))
  // ❌ DON'T: Business validation in routes
  if (!result) {
    throw new AppError("NOT_FOUND", "Example not found")
  }
  return result
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

#### oRPC Mutation Patterns:

**MANDATORY RULE**: ALWAYS use `.mutate()` with onSuccess/onError callbacks. NEVER use `.mutateAsync()`.

**User Feedback Integration**: "É sempre SEMPRE mutate, nunca mutate async com os triggers de onError e onSuccess pra adicionar o toaster do sonner"

**Translation**: "It's always ALWAYS mutate, never mutate async with the onError and onSuccess triggers to add the sonner toaster"

```typescript
// ✅ CORRECT: Using mutationOptions() with .mutate() and Sonner toast integration
function CreateEventForm() {
  const createEventMutation = useMutation(orpc.createEvent.mutationOptions())

  const handleSubmit = (data: CreateEventInput) => {
    createEventMutation.mutate(data, {
      onSuccess: (result) => {
        toast.success("Event created successfully")
        // Additional success handling (navigation, form reset, etc.)
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create event")
        // Additional error handling if needed
      },
    })
  }
}

// ❌ ABSOLUTELY FORBIDDEN: Using mutateAsync
function CreateEventForm() {
  const createEventMutation = useMutation(orpc.createEvent.mutationOptions())

  const handleSubmit = async (data: CreateEventInput) => {
    try {
      await createEventMutation.mutateAsync(data) // ❌ NEVER USE mutateAsync
    } catch (error) {
      // ❌ This pattern is forbidden
    }
  }
}
```

**Hook Guidelines**:

- Return the entire useQuery result, let callers handle the response
- Use orpc.functionName.queryOptions() for advanced query configuration
- **MANDATORY**: Use orpc.functionName.mutationOptions() with `.mutate()` ONLY - `.mutateAsync()` is FORBIDDEN
- **ALWAYS** implement Sonner toast notifications via onSuccess/onError callbacks
- **CRITICAL**: Never use try/catch with mutateAsync - use callback pattern exclusively
- Never implement business logic or database operations in hooks
- Avoid custom queryKey abstractions - use orpc's built-in patterns

**Sonner Toast Integration Pattern**:
```typescript
// ✅ MANDATORY pattern for all mutations
const mutation = useMutation(orpc.someAction.mutationOptions())

const handleAction = (data: ActionInput) => {
  mutation.mutate(data, {
    onSuccess: () => {
      toast.success("Action completed successfully")
    },
    onError: (error) => {
      toast.error(error.message || "Action failed")
    },
  })
}
```

#### Integration Architecture:

- **External APIs**: Create service classes with caching and rate limiting
- **Database Operations**: Use DAO pattern with proper type safety in service layer
- **Business Logic**: Implement in service functions, never in route handlers
- **Error Handling**: Use `AppResult<T>` pattern consistently in services
- **Route Handlers**: Thin wrappers that only call services and handle `AppResult<T>`

#### Backend Error Responsibility - CRITICAL ARCHITECTURAL RULE

**FUNDAMENTAL PRINCIPLE**: "Não faz sentido o erro deve ser enviado SEMPRE do backend, NUNCA tratado no front, o front só tem a função de exibir a message ou lidar com algum data do erro mas nesse caso o endpoint tem que retornar um erro"

**Translation**: "It doesn't make sense, the error should ALWAYS be sent from the backend, NEVER handled in the front, the front only has the function of displaying the message or handling some error data but in this case the endpoint has to return an error"

**MANDATORY ERROR SEPARATION**:

- **Backend Services**: MUST return `AppResult.error()` for ALL error conditions (validation failures, business rule violations, conflicts)
- **Frontend Components**: ONLY display error messages via `onError` callbacks - NEVER implement business logic error handling
- **Route Handlers**: MUST throw `AppError` for all service error responses
- **Validation Errors**: ALWAYS returned as proper errors from backend, never as success responses with error flags

**ABSOLUTELY FORBIDDEN PATTERNS**:

```typescript
// ❌ CRITICAL ERROR: "Success with error flags" pattern - NEVER DO THIS
export async function createAccommodationService(input: CreateAccommodationInput): Promise<AppResult<AccommodationResponse>> {
  if (overlapCheck.hasOverlap) {
    return AppResult.success({
      id: "",
      hasOverlap: true, // ❌ ERROR FLAG IN SUCCESS RESPONSE
      conflictingAccommodation: overlapCheck.conflictingAccommodation,
      validationError: "Existe conflito com uma acomodação existente", // ❌ ERROR IN SUCCESS
    });
  }
}

// ❌ CRITICAL ERROR: Frontend handling business logic errors
const handleSubmit = (data) => {
  mutation.mutate(data, {
    onSuccess: (result) => {
      if (result.validationError) { // ❌ FRONTEND CHECKING ERROR FLAGS
        toast.error(result.validationError);
        return;
      }
      if (result.conflictingAccommodation) { // ❌ FRONTEND BUSINESS LOGIC
        toast.error(`Existe conflito com a acomodação "${result.conflictingAccommodation.name}"`);
        return;
      }
    }
  });
}
```

**MANDATORY CORRECT PATTERNS**:

```typescript
// ✅ CORRECT: Backend returns proper errors for ALL error conditions
export async function createAccommodationService(input: CreateAccommodationInput): Promise<AppResult<Accommodation>> {
  if (overlapCheck.hasOverlap) {
    return AppResult.error(
      "ACCOMMODATION_OVERLAP", 
      `Existe conflito com a acomodação "${overlapCheck.conflictingAccommodation?.name}"`,
      { conflictingAccommodation: overlapCheck.conflictingAccommodation } // Optional error data
    );
  }
  
  const accommodation = await accommodationDao.create(input);
  return AppResult.success(accommodation); // Clean success response
}

// ✅ CORRECT: Route throws proper errors
export const createAccommodation = os.input(CreateAccommodationSchema).handler(async ({ input }) => {
  const result = await createAccommodationService(input);
  if (!result.success) {
    throw new AppError(result.error.code, result.error.message, result.error.data);
  }
  return result.data; // Clean data only
});

// ✅ CORRECT: Frontend only displays errors, no business logic
const handleSubmit = (data) => {
  mutation.mutate(data, {
    onSuccess: (result) => {
      toast.success("Acomodação criada com sucesso");
      // Only success handling - no error checking
    },
    onError: (error) => {
      toast.error(error.message); // Only display error message
      // Backend handles all business logic and validation
    },
  });
}
```

#### AppResult<T> Handling Pattern:

**MANDATORY**: All service functions MUST return `AppResult<T>` for consistent error handling.

**CRITICAL**: Services MUST return `AppResult.error()` for ALL error conditions - never `AppResult.success()` with error flags.

```typescript
// ✅ CORRECT: Service with proper AppResult<T> error handling
export async function createExampleService(input: CreateExampleInput): Promise<AppResult<Example>> {
  // Validation errors = AppResult.error()
  if (!isValid(input)) {
    return AppResult.error("VALIDATION_FAILED", "Invalid input data");
  }
  
  // Business rule violations = AppResult.error()
  if (violatesBusinessRule(input)) {
    return AppResult.error("BUSINESS_RULE_VIOLATION", "Business rule violated");
  }
  
  try {
    const example = await exampleDao.create(input);
    return AppResult.success(example); // Clean success with data only
  } catch (err) {
    return AppResult.error("CREATE_FAILED", "Failed to create example");
  }
}

// ✅ CORRECT: Route handling AppResult<T>
export const createExample = os.input(CreateExampleSchema).handler(async ({ input }) => {
  const result = await createExampleService(input);
  if (!result.success) {
    throw new AppError(result.error.code, result.error.message);
  }
  return result.data;
})
```

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
│   ├── modules/        # Domain-organized API modules
│   │   └── [domain]/   # Each domain contains:
│   │       ├── [domain].dao.ts      # Database operations
│   │       ├── [domain].service.ts  # Business logic
│   │       ├── [domain].routes.ts   # oRPC route handlers
│   │       ├── [domain].errors.ts   # Domain-specific errors
│   │       └── [domain].test.ts     # Domain tests
│   ├── router/         # Legacy API route definitions (to be migrated to modules)
│   ├── client.ts       # oRPC client configuration
│   └── schema.ts       # Shared Zod schemas
├── integrations/       # Third-party integrations
│   └── tanstack-query/ # Query client setup
├── lib/                # Utility functions
└── env.ts              # Environment variable configuration
```

### oRPC Module Organization Pattern

**MANDATORY STRUCTURE**: All new API functionality MUST follow the domain module pattern:

```
src/orpc/modules/[domain]/
├── [domain].dao.ts      # Database operations and queries
├── [domain].service.ts  # Business logic and validation
├── [domain].routes.ts   # Thin oRPC handlers that call services
├── [domain].errors.ts   # Domain-specific error definitions
└── [domain].test.ts     # Comprehensive domain testing
```

**Benefits of Module Organization**:
- **Clear Separation**: Each layer has distinct responsibilities
- **Domain Cohesion**: Related functionality grouped together  
- **Testing Isolation**: Each module can be tested independently
- **Architectural Clarity**: Service layer separated from route handlers
- **Maintainability**: Changes confined to specific domain modules

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

## Modern UI Design Patterns

### Stunning Interface Requirements

**PLATFORM EXPECTATION**: Modern and stunning design that the platform requires.

**Implementation Guidelines**:

1. **Visual Enhancement Techniques**:
   - **Backdrop Effects**: Apply `backdrop-blur-sm` for modern glass-morphism effects
   - **Elevation Shadows**: Use multiple shadow layers for depth (`shadow-sm shadow-primary/10`)
   - **Hover Transformations**: Implement subtle scale and glow effects on interactive elements

2. **Animation and Interaction Patterns**:
   - **Smooth Transitions**: Apply `transition-all duration-200 ease-in-out` for polished interactions
   - **Progressive Enhancement**: Start with base functionality, layer visual enhancements
   - **Loading States**: Implement skeleton loaders and progressive content reveal
   - **Micro-interactions**: Add subtle animations that provide feedback without distraction

3. **Color and Typography Application**:
   - **Semantic Color Usage**: Use `destructive`, `warning`, `success` colors meaningfully
   - **Contrast Management**: Ensure accessibility while maintaining visual impact
   - **Typography Hierarchy**: Apply font weights and sizes to create clear information structure
   - **Muted Text Patterns**: Use `text-muted-foreground` for secondary information

4. **Component Enhancement Strategy**:
   - **Base Component Extension**: Enhance existing Shadcn components rather than replacing
   - **Variant Creation**: Add new variants to existing components for different contexts
   - **Composition Patterns**: Combine multiple components for complex interfaces
   - **Design System Compliance**: Always use design tokens, never hardcode values

### Design Implementation Checklist:

- [ ] Uses only design system tokens (no hardcoded colors/spacing)
- [ ] Implements modern visual effects (, shadows, blur)
- [ ] Includes smooth transitions and hover states
- [ ] Maintains accessibility standards
- [ ] Follows component decomposition patterns (no comment sections)
- [ ] Creates stunning visual impact appropriate for the platform

## Code Style Guidelines

**CRITICAL COMMENTING RULES**:

- **IMPORTANT: DO NOT ADD ***ANY*** COMMENTS unless explicitly asked by the user**
- **NEVER add redundant comments that simply restate function or variable names**
  - ❌ WRONG: `// Handle delete flight` before `const handleDeleteFlight`
  - ❌ WRONG: `// Update user profile` before `const updateUserProfile`
  - ❌ WRONG: `// Fetch travel data` before `const fetchTravelData`
- **Code should be self-documenting through clear naming conventions**
- **Only add comments when**:
  - Explaining complex business logic that isn't obvious from the code
  - Documenting non-obvious algorithms or workarounds
  - When explicitly requested by the user
  - For JSDoc documentation on public APIs (when requested)

**Self-Documenting Code Principles**:

- Use descriptive function and variable names that explain intent
- Prefer `const handleDeleteFlight = ...` over `const handler = ... // Delete flight`
- Function names should clearly indicate what they do
- Variable names should clearly indicate what they contain
- Component names should reflect their single responsibility

## Important Notes

- Demo files prefixed with `demo` can be safely deleted
- Route tree is auto-generated in `src/routeTree.gen.ts` (ignored by Biome)
- Uses Bun as the preferred package manager and runtime
- Server functions are TanStack Start's killer feature for full-stack development
- Always use type-safe patterns with Zod validation
- File-based routing generates TypeScript definitions automatically
- **Design Philosophy**: Create interfaces that are both functionally excellent and visually stunning

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

#### Drizzle-Zod Schema Location Guidelines

**CRITICAL**: Follow strict location patterns for schema definitions and validation:

- **Schema Definitions**: Define all Drizzle table schemas in `src/lib/db/schema.ts`
- **Validation Schemas**: Use `createInsertSchema()` and `createSelectSchema()` in `src/lib/db/schema.ts` alongside table definitions
- **oRPC Integration**: Import validation schemas from `src/lib/db/schema.ts` into oRPC router files
- **Model Files**: Avoid creating separate `*.model.ts` files for schema validation - consolidate in schema.ts

```typescript
// ✅ CORRECT: src/lib/db/schema.ts
export const Event = pgTable("event", {
  /* table definition */
})
export const EventSchema = createSelectSchema(Event)
export const createEventSchema = createInsertSchema(Event)

// ✅ CORRECT: src/orpc/router/travel.ts
import { createEventSchema } from "@/lib/db/schema"
export const createEvent = os.input(createEventSchema).handler(/* ... */)

// ❌ WRONG: src/lib/travel.model.ts
export const createEventSchema = createInsertSchema(eventsTable) // Don't separate validation from schema
```

#### Best Practices

- Always consider UX implications of technical IDs (readability, copy-paste friendliness)
- Use declarative database-level solutions over application-level ID generation
- Implement consistent patterns across all entity schemas

### Type Safety with ORMs

- Leverage TypeScript inference from schema definitions
- Use proper type mapping between database models and API responses
- Implement validation at the DAO level for data integrity
- Ensure return types match API contract expectations

## Diretrizes de Testes (Vitest + oRPC/Drizzle)

**OBJETIVO**: Garantir testes significativos e legíveis, focados nas regras de negócio, seguindo o padrão de `src/orpc/modules/flight/flight.test.ts` e utilitários em `src/tests/utils.ts`.

**REGRAS CRÍTICAS (obrigatórias)**

- **Propósito claro**: Cada teste deve validar um aspecto essencial do domínio ou uma regra de negócio. Nunca escreva testes “só por escrever”.
- **Chamar a aplicação pelo oRPC**: Exercite os casos de uso via procedimentos oRPC (com `createAppCall`/`createAppCallAuthenticated`) — evite operar o estado apenas via DB quando o objetivo é validar comportamento da aplicação.
- **FK primeiro**: Sempre crie as entidades “mãe” (chaves estrangeiras) antes das entidades de ponta. Ex.: `User` → `Travel` → `Flight` → `FlightParticipant`.
- **Isolamento**: Use um banco em memória por suíte com `getFakeDb()` (Vitest `beforeAll`). Não dependa da ordem de execução dos testes.
- **Autenticação**: Para rotas protegidas, use `createAppCallAuthenticated` com `AUTH_TEST_HEADERS`/`ALWAYS_USER_TEST`.
- **CRÍTICO - Tratamento de TODOs**: Quando encontrar comentários TODO no código durante escrita de testes, PARE de modificar os testes para acomodar implementações incompletas. Em vez disso:
  - **SINALIZAR**: Identifique claramente que existe código incompleto (TODO) impedindo os testes
  - **NÃO ADAPTAR**: Não altere expectativas de teste para passar com implementações parciais
  - **IMPLEMENTAR PRIMEIRO**: Sugira implementar a funcionalidade faltante antes de continuar com os testes
  - **TESTES CORRETOS**: Os testes devem refletir o comportamento PRETENDIDO, não o comportamento atual quebrado

**Padrões recomendados (incentivados)**

- **Stubs/fábricas**: Use os stubs do `zocker` já prontos em `testStub` (`testStub.flight`, `testStub.travel`, etc.) e sobrescreva apenas campos relevantes. Isso reduz boilerplate e melhora a legibilidade.
- **Builders utilitários**: Crie funções utilitárias para compor entidades e cadeias com FK (ex.: `createTravel(db, overrides)`, `createFlightWithParticipants(db, { travelId, flight, participants })`). Essas funções podem executar várias operações no banco com stubs para facilitar a leitura dos testes.
- **AAA (Arrange-Act-Assert)**: Estruture cada teste destacando preparação, ação e asserções. Nomes de `describe/it` devem comunicar claramente o comportamento esperado.
- **Asserções robustas**: Prefira `toMatchObject`/`toEqual` para validar estado e `toThrowError` para regras de erro. Valide contagens/relacionamentos quando fizer sentido (ex.: “deve criar 1 voo para a viagem”).
- **Determinismo**: Quando necessário, fixe dados/horários nos stubs e evite aleatoriedade não controlada.

**Fluxo de teste sugerido (modelo)**

1) Arrange
- `const db = await getFakeDb()` em `beforeAll`
- Gerar stubs com `testStub.*`
- Inserir pais de FK diretamente (ex.: `db.insert(Travel).values(travelStub).returning({ id })`)

2) Act
- Invocar o procedimento oRPC sob teste com `createAppCall`/`createAppCallAuthenticated`

3) Assert
- Recuperar estado via oRPC (ou consultar o DB quando a verificação é puramente estrutural)
- Validar regras de negócio principais e relações

**Exemplo mínimo (baseado em flight.test.ts)**

```ts
import { Travel } from "@/lib/db/schema"
import router from "@/orpc/router"
import { ALWAYS_USER_TEST, createAppCallAuthenticated, getFakeDb, testStub } from "@/tests/utils"
import { beforeAll, describe, expect, it } from "vitest"

describe("flight", () => {
  let db
  beforeAll(async () => {
    db = await getFakeDb()
  })

  it("createFlight: cria voo e lista por viagem", async () => {
    const appCall = createAppCallAuthenticated(db)

    // FK primeiro: User (seed em getFakeDb) -> Travel -> Flight
    const travelStub = testStub.travel()
    const [travel] = await db.insert(Travel).values(travelStub).returning({ id: Travel.id })

    const flightStub = testStub.flight.generate()

    await appCall(router.flightRoutes.createFlight, {
      flight: flightStub,
      travelId: travel.id,
      participantIds: [ALWAYS_USER_TEST.id],
    })

    const flights = await appCall(router.flightRoutes.getFlightsByTravel, { travelId: travel.id })
    expect(flights.length).toEqual(1)
  })
})
```

**Checklist rápida antes de enviar PR**

- Foca em regra de negócio e invariantes do domínio
- Cria pais de FK antes das entidades filhas
- Usa `getFakeDb()` e utilitários (`createAppCall*`, `testStub`)
- Invoca comportamentos via oRPC; usa DB direto apenas para seed/validação estrutural
- Testes legíveis com AAA e nomes descritivos
- Evita testes triviais/duplicados e dependência de ordem
- Executa `bunx --bun run test` e `bunx --bun run check`

**Anti‑padrões a evitar**

- Chamar DAOs diretamente para validar comportamento de alto nível quando existe procedimento oRPC equivalente
- Criar dados "no braço" repetidamente; prefira stubs e builders utilitários
- Testes que apenas espelham implementação sem checar regras de negócio
- Dependência implícita de outros testes para preparar estado
- **CRÍTICO**: Modificar testes para acomodar código incompleto (TODOs) - sempre sinalizar e implementar funcionalidade faltante primeiro
- Criar expectativas de teste baseadas em comportamento quebrado ao invés do comportamento pretendido
- Ignorar ou contornar validações que estão marcadas como TODO na implementação

**Test Adaptation for Architectural Changes**

When refactoring from routes containing business logic to proper service layer separation:

- **Error Handling Changes**: Tests expecting structured error responses may need updates to expect thrown `AppError` instances
- **Service Layer Testing**: Focus tests on service functions returning `AppResult<T>`, then test route handlers separately
- **TODO Implementation Impact**: After completing TODO implementations, verify test expectations align with new complete functionality
- **Architecture Validation**: Ensure tests validate service layer business logic separately from route layer error handling

```typescript
// ✅ BEFORE: Testing route with business logic
expect(result).toMatchObject({ success: false, error: { code: "INVALID_DATE" } })

// ✅ AFTER: Testing service layer with AppResult<T>
const serviceResult = await accommodationService.createAccommodation(input)
expect(serviceResult.success).toBe(false)
expect(serviceResult.error?.code).toBe("INVALID_DATE")

// ✅ AFTER: Testing route handler error throwing
await expect(appCall(router.createAccommodation, input)).rejects.toThrow("INVALID_DATE")
```

**Observações de prompt‑engineering (para agentes)**

- Seja explícito sobre FK‑first, uso de `getFakeDb`, `testStub` e `createAppCall*` ao gerar testes
- Prefira instruções imperativas e exemplos mínimos, como acima
- Produza nomes de casos de teste que comuniquem comportamento e regra validada
- Não gere testes redundantes; cada caso deve ter motivo claro
- **FUNDAMENTAL**: Ao encontrar TODOs no código, INTERROMPER imediatamente a escrita de testes e sinalizar necessidade de implementação
- Sempre priorizar completude da implementação sobre contornos nos testes
- Testes devem ser escritos assumindo implementação correta e completa das funcionalidades

## TODO Handling and Implementation Prioritization

**CRITICAL DEVELOPMENT PRINCIPLE**: When encountering TODO comments during any development task, prioritize completing the implementation over working around incomplete functionality.

**ARCHITECTURAL REFACTORING SUCCESS PATTERN**: The accommodation refactoring task demonstrates the correct approach - when TODO issues block proper architecture implementation, COMPLETE the TODO implementation first, then proceed with architectural improvements.

### TODO Discovery Protocol

**MANDATORY PROCESS** when TODO comments are encountered:

1. **IMMEDIATE HALT**: Stop current development task (testing, feature implementation, refactoring)
2. **CLEAR IDENTIFICATION**: Document exactly what TODO functionality is missing
3. **IMPACT ASSESSMENT**: Identify how the incomplete implementation affects the current task
4. **IMPLEMENTATION PRIORITY**: Complete the TODO implementation as part of the current task
5. **ARCHITECTURAL ALIGNMENT**: After TODO completion, proceed with original architectural improvements

### TODO Implementation Success Patterns

**Example from Accommodation Refactoring**:
- **Discovered**: Hardcoded travel dates in service validation (TODO comment)
- **Impact**: Blocked proper service layer implementation and testing
- **Resolution**: Implemented proper `getTravelById` function to retrieve actual travel dates
- **Result**: Enabled complete service layer separation and proper `AppResult<T>` handling

### TODO Context Examples

**Service Layer Implementation Scenarios** (High Priority):
- **Hardcoded Values in Business Logic**: Replace placeholder values with proper data retrieval (e.g., travel date validation)
- **Missing DAO Operations**: When services need proper database integration
- **Incomplete Result<T> Handling**: When error handling patterns are not fully implemented

**Testing Scenarios**:
- **Incomplete Validation**: When validation logic uses hardcoded values instead of proper business logic
- **Missing Service Integration**: When services use placeholder data instead of real integrations  
- **Incomplete Error Handling**: When error paths are marked as TODO

**Implementation Scenarios**:
- **Partial Feature Logic**: When core functionality is marked with implementation TODOs
- **Missing Business Rules**: When validation or business logic is incomplete
- **Incomplete Data Flow**: When data transformations or persistence logic has TODOs

**Route/Service Separation Scenarios**:
- **Business Logic in Routes**: When route handlers contain logic that should be in services
- **Missing Service Functions**: When routes need corresponding service implementations
- **Incomplete AppResult<T> Integration**: When error handling needs proper Result pattern implementation

### Professional Development Standards

**User Feedback Integration**: "quando tiver um TODO no código você deve parar de alterar os testes e sinalizar que devemos implementar ao invés de modificar o teste pra passar de qualquer formar"

**Translation**: When there's a TODO in the code, stop changing tests and signal that we should implement instead of modifying tests to pass in any way.

**Application**:
- Tests should reflect **intended behavior**, not accommodate broken implementations
- Implementation completeness takes precedence over working around limitations
- Quality assurance requires complete functionality, not workarounds

### TODO Resolution Workflow

1. **Identify**: Clearly document the TODO and its impact
2. **Assess**: Determine if the TODO blocks current task completion
3. **Prioritize**: Recommend implementing the TODO before proceeding
4. **Implement**: Complete the missing functionality properly
5. **Validate**: Ensure the implementation meets all requirements
6. **Continue**: Proceed with original task using complete implementation

**Exception**: Only proceed with incomplete implementations if explicitly instructed and with full acknowledgment of technical debt.

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

### Modern Design System Integration:

**MANDATORY**: Create stunning, modern interfaces that align with platform requirements:

- **Design Tokens Only**: Use ONLY design system tokens (colors, spacing, typography)
- **Modern Visual Elements**: subtle animations, and hover effects
- **Sophisticated Styling**: Apply backdrop blur, border gradients, and elevated shadows
- **Responsive Design**: Ensure all interfaces work across device sizes
- **Accessibility**: Maintain proper contrast ratios and interactive states

### Before Creating Any UI Element:

- Search for existing Tabs, Button, Dialog, Card, Input components
- Use Grep/Glob tools to find similar implementations in the codebase
- Prefer composition of existing components over creating new ones
- Follow established patterns and design system variables (primary, muted-foreground, etc.)
- Apply modern styling techniques (gradients, animations, hover effects) within design system constraints

### Component Decomposition and Architecture

**CRITICAL USER FEEDBACK INTEGRATION**: "Sempre que você for definir sections assim com comentários entenda que é melhor você criar um novo componente no mesmo arquivo e descer todos os states que possível pra o nível mais baixo fica mais fácil de entender"

**MANDATORY PATTERN**: NEVER use comment sections to organize large components. ALWAYS decompose into smaller, focused components.

**Component Decomposition Rules**:

- **Immediate Decomposition**: When you find yourself adding comment sections like `// Header Section`, `// Stats Section`, etc., STOP and create separate components instead
- **Same-File Components**: Create new components in the same file when they're tightly coupled
- **State Descent**: Move ALL possible states down to the lowest component level where they're actually needed
- **Single Responsibility**: Each component should have one clear purpose and responsibility
- **Readability First**: Component decomposition makes code easier to understand and maintain

**Anti-Patterns to Avoid**:

```tsx
// ❌ WRONG: Large component with comment sections
function LargePage() {
  const [state1, setState1] = useState()
  const [state2, setState2] = useState()

  return (
    <div>
      {/* Header Section */}
      <div>...</div>

      {/* Stats Section */}
      <div>...</div>

      {/* Content Section */}
      <div>...</div>
    </div>
  )
}
```

**Correct Patterns**:

```tsx
// ✅ CORRECT: Decomposed into focused components
function PageHeader() {
  // Only state needed for header
  return <div>...</div>
}

function StatsSection() {
  // Only state needed for stats
  return <div>...</div>
}

function MainPage() {
  return (
    <div>
      <PageHeader />
      <StatsSection />
      <ContentSection />
    </div>
  )
}
```

**State Management Principles**:

- **State Colocation**: Keep state as close to where it's used as possible
- **Lift State Up**: Only lift state when multiple components need to share it
- **Avoid Prop Drilling**: If passing props through multiple levels, consider component composition or context
- **Component Boundaries**: Each component should manage its own internal state when possible

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

### UI Refactoring Best Practices

**CRITICAL REFACTORING WORKFLOW**: When refactoring existing UI components, always follow this decomposition approach:

1. **Identify Comment Sections**: Look for comment-based organization (e.g., `// Header`, `// Stats`)
2. **Extract Components First**: Before styling changes, decompose large components into focused units
3. **State Analysis**: Identify which state belongs at which component level
4. **Move State Down**: Relocate state to the lowest component that needs it
5. **Apply Design Changes**: Only after proper component architecture is in place

**Component Naming Conventions**:

- Use descriptive names that reflect the component's single responsibility
- For page sections: `PageHeader`, `StatsCards`, `ContentList` (not `HeaderSection`, `StatsSection`)
- For specialized components: `EmptyFlightState`, `FlightGroupHeader` (domain-specific naming)
- Avoid generic names like `Section`, `Container`, `Wrapper` unless they're truly generic utilities

**Refactoring Validation Checklist**:

- [ ] No comment sections organizing JSX code
- [ ] Each component has a single, clear responsibility
- [ ] State is colocated with components that actually use it
- [ ] No unnecessary prop drilling
- [ ] Components are reusable and well-named
- [ ] TypeScript interfaces are properly defined (no `any` types)

### Design Enhancement Patterns

**Modern Interface Creation Guidelines**:

- **Visual Hierarchy**: Use size, color, and spacing to create clear information hierarchy
- **Interactive Feedback**: Implement hover states, loading states, and micro-animations
- **Surface Design**: Apply subtle shadows, border gradients, and backdrop effects
- **Color Psychology**: Use design system colors meaningfully (success, warning, destructive)
- **Typography Scale**: Leverage font sizes and weights from design system appropriately
- **Spacing Consistency**: Use design system spacing tokens for consistent rhythm

### Examples:

**Component Usage**:

- ✅ Use `<Tabs>` component instead of custom toggle buttons
- ✅ Use `<Button>` variants instead of custom styled buttons
- ✅ Use `<Card>` components instead of custom divs with styling
- ✅ Abstract common form patterns (LocationSelector, DatePicker) into `ui/` components
- ✅ Create flexible component APIs that handle multiple use cases
- ✅ Enhance existing components with modern styling (gradients, animations)
- ✅ Apply design system tokens for consistent visual language
- ❌ Don't create custom toggle logic when Tabs exist
- ❌ Don't hardcode colors when design system variables exist
- ❌ Don't create overly specific components that can't be reused
- ❌ Don't use comment sections to organize component structure

**Component Architecture**:

- ✅ Break down `FlightsPage` into `FlightStatsCards`, `FlightWarnings`, `FlightsList` components
- ✅ Move flight filtering state to `FlightsList` where it's actually used
- ✅ Keep dialog state in `PageHeader` component where the dialog exists
- ✅ Create `EmptyFlightState` for specialized empty state handling
- ❌ Don't use `// Stats Section`, `// Header Section` comments to organize code
- ❌ Don't keep all state at the page level when components can manage their own
- ❌ Don't create monolithic components that handle multiple responsibilities
