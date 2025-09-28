# Feature Specification: Floating Concierge Chat Toggle

**Feature Branch**: `001-floating-concierge-toggle`  
**Created**: 2025-09-28  
**Status**: Draft  
**Input**: User description: "the ideia is That there was a floating toggle, like a chat in the lower right corner, where you could have the concierge conversations outside the concierge screen. So, if I'm on the itinerary tab, flights, accommodations, and the like, it appears in the corner here with a little ball that I can click and it expands. Something like what the Messenger chat used to be like. And then the idea is that I can have the possibility to talk to the concierge without being on the concierge tab. So, I can consult information in the application and continue talking to him"

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a traveler planning a trip, I want a floating concierge toggle available on every itinerary-related screen so I can continue chatting with the concierge while reviewing flights, accommodations, and other details.

### Acceptance Scenarios
1. **Given** I am viewing an itinerary detail screen, **When** I click the floating concierge toggle, **Then** the concierge conversation expands in-place without taking me away from the current screen.
2. **Given** I have an ongoing concierge conversation and navigate between itinerary, flights, and accommodations tabs, **When** I re-open the floating toggle, **Then** the same conversation history appears and I can continue messaging without losing context.

### Edge Cases
- On the concierge tab, the floating toggle hides automatically and the ongoing conversation continues in the full concierge view.
- The system shows a visual badge on the collapsed toggle when new concierge responses arrive.
- When no concierge is immediately available, the toggle stays active, allows the user to send messages that queue for the AI concierge, and informs the user about the delayed response.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST present a floating concierge toggle on all itinerary-related screens, positioned so it does not block primary actions on those pages.
- **FR-002**: System MUST allow users to expand the floating toggle into a conversation panel that overlays the current screen while retaining access to the underlying page content.
- **FR-003**: System MUST maintain the same concierge conversation history across tabs, ensuring messages persist when the user navigates between sections.
- **FR-004**: System MUST allow users to send and receive concierge messages from the floating panel without requiring navigation to the dedicated concierge tab.
- **FR-005**: System MUST provide a clear way to collapse or dismiss the conversation panel so the user can quickly return to an unobstructed view.
- **FR-006**: System MUST indicate new concierge messages while the panel is collapsed by showing a visual badge without numeric count on the floating toggle.
- **FR-007**: System MUST accept concierge messages even when no human agent is available by queueing requests to the AI concierge and indicating that responses may be delayed.
- **FR-008**: System MUST hide the floating toggle on the dedicated concierge tab while seamlessly handing off the active conversation to the full concierge experience.

### Key Entities *(include if feature involves data)*
- **Floating Concierge Toggle**: Visual entry point that signals concierge availability, expands into the conversation panel, and reflects unread or offline states.
- **Concierge Conversation Session**: The ongoing dialogue between traveler and AI concierge, including message history, availability state, and any session metadata needed to keep context across tabs and queued responses.


## Non-Functional Requirements (optional)

### Performance & Responsiveness
- Concierge responses may arrive asynchronously; after 30 seconds the UI MUST display a pending indicator informing the user that the AI is still composing a response.
### Non-Functional Attributes

---

## Clarifications
### Session 2025-09-28
- Q: Quais indicadores exibimos quando chegam novas mensagens com o painel flutuante recolhido? → A: Exibir apenas ponto/badge
- Q: Quando o concierge estiver indisponível, como o toggle flutuante reage ao ser acionado? → A: Permitir envio em fila para IA
- Q: Como o toggle se comporta na aba concierge em relação à conversa ativa? → A: Ocultar toggle e manter conversa contínua
- Q: Qual o tempo máximo aceitável para resposta do concierge IA antes de sinalizar atraso? → A: Mais de 30 segundos (assíncrono)


## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous  
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed

---