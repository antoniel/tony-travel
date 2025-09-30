# Tasks: Internationalization (i18n) Support

**Input**: Design documents from `/specs/006-eu-quero-adicionar/`
**Prerequisites**: plan.md ✅, spec.md ✅
**Branch**: `006-eu-quero-adicionar`
**Tech Stack**: TypeScript 5.x, React 19, TanStack Start, Paraglide JS, date-fns

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- All file paths are absolute from repository root

---

## Phase 1: Setup & Dependencies

- [x] **T001** Install Paraglide JS dependencies
  - **Action**: Add `@inlang/paraglide-js`, `@inlang/paraglide-js-adapter-vite`
  - **Command**: `bun add @inlang/paraglide-js @inlang/paraglide-js-adapter-vite`
  - **Dependencies**: None

- [x] **T002** Create Inlang project configuration
  - **Path**: `project.inlang/settings.json`
  - **Action**: Configure sourceLanguageTag (pt-BR), languageTags, message paths
  - **Dependencies**: T001

- [x] **T003** Configure Paraglide Vite plugin
  - **Path**: `vite.config.ts`
  - **Action**: Add Paraglide Vite plugin to watch and compile messages
  - **Dependencies**: T001

- [x] **T004** Create message files structure
  - **Path**: `messages/pt-BR.json`, `messages/en.json`
  - **Action**: Create initial message files with basic keys
  - **Dependencies**: T002

---

## Phase 2: Core i18n Infrastructure

- [x] **T005** Create language type definitions
  - **Path**: `src/lib/i18n/types.ts`
  - **Action**: Define Language type, LANGUAGES constant, DEFAULT_LANGUAGE
  - **Dependencies**: None

- [x] **T006** Implement language detection and persistence
  - **Path**: `src/lib/i18n/language-utils.ts`
  - **Action**: Browser language detection, localStorage persistence, URL parsing
  - **Dependencies**: T005

- [x] **T007** Create locale formatting utilities
  - **Path**: `src/lib/i18n/locale-formatting.ts`
  - **Action**: Date/time/currency formatting with Intl API, extend currency.ts
  - **Dependencies**: T005

- [x] **T008** Create language context provider
  - **Path**: `src/lib/i18n/LanguageProvider.tsx`
  - **Action**: React context for current language, language switcher logic
  - **Dependencies**: T005, T006

---

## Phase 3: Router Integration

- [x] **T009** Create language router middleware
  - **Path**: Integrated in language-utils.ts
  - **Action**: Detect language from URL, redirect invalid codes, preserve params
  - **Dependencies**: T006

- [x] **T010** Update root route with language support
  - **Path**: `src/routes/__root.tsx`
  - **Action**: Add LanguageProvider, update html lang attribute dynamically
  - **Dependencies**: T008

- [ ] **T011** Create optional language prefix route structure
  - **Path**: `src/routes/([$lang])/...`
  - **Action**: Restructure routes to support optional $lang parameter
  - **Dependencies**: T009, T010

- [x] **T012** Implement language-aware navigation utilities
  - **Path**: Integrated in language-utils.ts
  - **Action**: Helper functions to build URLs with language prefixes
  - **Dependencies**: T006, T009

---

## Phase 4: UI Components

- [x] **T013** Create language switcher component
  - **Path**: `src/components/ui/language-switcher.tsx`
  - **Action**: Dropdown using Shadcn UI, accessible, keyboard navigation
  - **Dependencies**: T008

- [x] **T014** Add language switcher to TopbarMenu
  - **Path**: `src/components/ui/topbar-menu.tsx`
  - **Action**: Integrate language switcher in header
  - **Dependencies**: T013

- [x] **T015** Create translation hook
  - **Path**: Integrated in LanguageProvider (useLanguage hook)
  - **Action**: Wrapper hook for Paraglide messages with context
  - **Dependencies**: T008

---

## Phase 5: Message Extraction & Translation

- [x] **T016** Extract common UI strings to messages
  - **Path**: `messages/pt-BR.json`, `messages/en.json`
  - **Action**: Common buttons (submit, cancel, save, delete, etc.)
  - **Dependencies**: T004

- [x] **T017** Extract and translate authentication UI
  - **Path**: `messages/pt-BR.json`, `messages/en.json`
  - **Action**: Login, signup, logout messages
  - **Dependencies**: T016

- [x] **T018** Extract and translate trip/travel UI
  - **Path**: `messages/pt-BR.json`, `messages/en.json`
  - **Action**: Trip creation, editing, calendar, itinerary strings
  - **Dependencies**: T016

- [x] **T019** Extract and translate form validation messages
  - **Path**: `messages/pt-BR.json`, `messages/en.json`
  - **Action**: Field errors, validation messages
  - **Dependencies**: T016

- [x] **T020** Extract and translate calendar/event UI
  - **Path**: `messages/pt-BR.json`, `messages/en.json`
  - **Action**: Calendar navigation, event types, actions
  - **Dependencies**: T016

- [ ] **T021** Update all components to use translations
  - **Path**: Various component files
  - **Action**: Replace hardcoded strings with message functions
  - **Dependencies**: T015, T020

---

## Phase 6: Locale Formatting Integration

- [ ] **T022** Implement locale-aware date formatting
  - **Path**: Update date display components
  - **Action**: Use Intl.DateTimeFormat with current locale
  - **Dependencies**: T007

- [ ] **T023** Implement locale-aware currency formatting
  - **Path**: Update currency display components
  - **Action**: Extend formatCurrencyBRL to support locale
  - **Dependencies**: T007

- [ ] **T024** Implement locale-aware relative time
  - **Path**: Create relative time component/utility
  - **Action**: Format relative times ("2 days ago" vs "há 2 dias")
  - **Dependencies**: T007

---

## Phase 7: SEO & Metadata

- [ ] **T025** Add hreflang tags to root document
  - **Path**: `src/routes/__root.tsx`
  - **Action**: Generate hreflang tags for all supported languages
  - **Dependencies**: T010

- [ ] **T026** Implement translated meta tags
  - **Path**: Route meta configurations
  - **Action**: Translate page titles and descriptions
  - **Dependencies**: T015

- [ ] **T027** Add canonical URL management
  - **Path**: `src/routes/__root.tsx`
  - **Action**: Set canonical URLs correctly for language variants
  - **Dependencies**: T025

---

## Phase 8: Testing & Validation

- [ ] **T028** Test language detection and persistence
  - **Action**: Verify browser detection, localStorage, URL precedence
  - **Dependencies**: T006

- [ ] **T029** Test language switching flow
  - **Action**: Verify UI updates, URL changes, persistence
  - **Dependencies**: T021

- [ ] **T030** Test locale formatting
  - **Action**: Verify dates, times, currency format correctly
  - **Dependencies**: T024

- [ ] **T031** Test SEO metadata
  - **Action**: Verify hreflang tags, canonical URLs, translated meta
  - **Dependencies**: T027

- [ ] **T032** Validate all functional requirements
  - **Action**: Check all FRs from spec.md are met
  - **Dependencies**: T031

---

## Execution Order

**Sequential blocks**:

1. Setup (T001-T004)
2. Core infrastructure (T005-T008)
3. Router integration (T009-T012)
4. UI components (T013-T015)
5. Message extraction (T016-T021)
6. Formatting (T022-T024)
7. SEO (T025-T027)
8. Testing (T028-T032)

**Parallel opportunities**:

- T016-T020 [P] (different message namespaces)
- T022-T024 [P] (different formatting utilities)
- T025-T027 [P] (different SEO aspects)
