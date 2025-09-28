<!--
Sync Impact Report: v0.0.0 → v1.0.0

VERSION CHANGE: Initial constitution ratification
PRINCIPLES ADDED:
- I. Type-Safe Architecture
- II. Human-in-the-Loop AI 
- III. Specialist Agent Delegation (NON-NEGOTIABLE)
- IV. Test-Driven Development
- V. Modern Design System Compliance

SECTIONS ADDED:
- Security & Privacy Requirements
- Development Standards

TEMPLATES REQUIRING UPDATES:
✅ .specify/templates/plan-template.md - Constitution check section aligned
✅ .specify/templates/spec-template.md - Scope requirements aligned  
✅ .specify/templates/tasks-template.md - Task categorization aligned
✅ .specify/templates/agent-file-template.md - Specialist patterns aligned

FOLLOW-UP TODOs: None - All requirements met for initial constitution
-->

# Tony Travel Constitution

## Core Principles

### I. Type-Safe Architecture
All components must maintain end-to-end type safety through the full-stack TypeScript ecosystem. oRPC provides type-safe API contracts between frontend and backend. Database interactions through Drizzle ORM ensure schema consistency. No runtime type errors are acceptable in production.

**Rationale**: Type safety eliminates entire classes of bugs, improves developer experience, and enables confident refactoring in a complex travel management domain with multiple data relationships.

### II. Human-in-the-Loop AI (NON-NEGOTIABLE) 
AI tool calls NEVER execute automatically. All AI-suggested actions must render as confirmation cards requiring explicit human approval before execution. No direct database mutations or external API calls without user consent.

**Rationale**: Travel planning involves personal data, financial decisions, and important life events. Users must maintain complete control over all changes to their travel plans, ensuring trust and preventing costly AI mistakes.

### III. Specialist Agent Delegation (NON-NEGOTIABLE)
Backend work (oRPC, DAOs, services, database, validation) MUST be delegated to `@backend-specialist`. Frontend work (React components, UI logic, styling, client-side state) MUST be delegated to `@frontend-specialist`. The orchestrator performs only read-only analysis and documentation tasks.

**Rationale**: Specialist agents enforce domain-specific architectural patterns, preventing violations of separation of concerns and ensuring consistent implementation quality across complex frontend and backend domains.

### IV. Test-Driven Development
Tests written before implementation. Backend tests use Vitest with `getFakeDb()` and `createAppCall*` patterns. Frontend tests follow component testing best practices. All new features require accompanying test coverage demonstrating the feature works correctly.

**Rationale**: Travel management requires high reliability - users depend on accurate data for real-world travel decisions. TDD ensures robust validation of business logic, especially for complex domains like financial tracking, itinerary management, and AI tool integration.

### V. Modern Design System Compliance
UI components MUST use Shadcn design system tokens exclusively. No custom colors (bg-green-500, text-blue-600) allowed - only semantic tokens (primary, secondary, muted, destructive, accent). Component decomposition required when comment-based organization appears (// Header Section → separate HeaderSection component).

**Rationale**: Consistent design systems improve user experience, reduce maintenance overhead, and ensure accessibility compliance. Component decomposition improves code maintainability and enables better state management in complex travel UI workflows.

## Security & Privacy Requirements

**Authentication & Authorization**: Better-auth integration with proper session management and route protection. User data isolation by travel membership. No cross-travel data leakage.

**AI Safety**: OpenRouter API key protection, input sanitization for all AI interactions, context isolation per travel session. Token usage monitoring and rate limiting to prevent abuse.

**Data Protection**: Sensitive travel data (financial information, personal details, location data) encrypted at rest and in transit. GDPR-compliant data handling for international travelers.

## Development Standards

**Package Management**: Bun as the primary runtime and package manager for optimal performance and compatibility with modern TypeScript tooling.

**Code Quality**: Biome for formatting and linting with tab indentation and double quotes. TypeScript strict mode enforced across all modules.

**State Management**: TanStack Query for server state with mutation hooks (never mutateAsync with try/catch). TanStack Store for client state. Form management via react-hook-form with Zod validation.

**Database Patterns**: Drizzle ORM with typed prefixes for IDs (trv_, usr_, evt_). FK-first seeding in tests. AppResult<T> pattern for error handling with typed business errors.

## Governance

**Constitution Authority**: This constitution supersedes all other development practices. Any deviation requires explicit justification and documentation in project artifacts.

**Amendment Process**: Changes require documentation of impact, approval from stakeholders, and migration plan for existing code. Version increments follow semantic versioning: MAJOR for principle removals/redefinitions, MINOR for new principles, PATCH for clarifications.

**Compliance Review**: All pull requests must verify constitutional compliance. Complexity deviations must be documented and justified. Agent delegation violations trigger immediate reflection and process improvement.

**Enforcement**: Use CLAUDE.md for Claude Code runtime development guidance. Specialist agents enforce domain-specific constitutional requirements during implementation.

**Version**: 1.0.0 | **Ratified**: 2025-09-28 | **Last Amended**: 2025-09-28