# Feature Specification: Flight Segments in Itinerary Calendar

**Feature Branch**: `002-so-what-i`  
**Created**: 2025-09-28  
**Status**: Draft  
**Input**: User description: "So, what I wanted is for the itinerary calendar to also display the flight segments. And by segment, I mean, for example, in the flight that is Salvador, Guarulhos, Salvador, segment means Salvador, Congonhas. In the flight that is Palmas, Guarulhos, Palmas, where the segments have segments, which is Palmas, Brasília, Brasília, Gru, the other segment is Gru, Palmas. What should be displayed in this case is not the individual segments, but rather the segment Palmas, Gru, omitting Palmas, Brasília, Brasília, Gru. In the Salvador, Guarulhos, Salvador flight, the first flight is dated January 11th. The last flight, which is the second segment, is dated January 26th. It's not to create an event from the 11th to the 26th. It's to create an event on the 11th, from 12:55 PM to 3:30 PM, for example. And another event, not an event, but something else on the itinerary calendar, with the date January 26th, 9 AM to January 26th, 1:20 PM. And so on. These were examples of what I want to see on the itinerary calendar. And note that a flight can start up to two days before the first day of the trip. So, for example, a trip that starts from January 13th to January 25th, I can take a flight on the 11th. And that's still part of the trip, without changing the initial day of the trip. So,"

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identified: flight segments, itinerary calendar display, segment consolidation logic, time-based events
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → User flow: view flight segments on calendar as individual time-based entries
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-09-28
- Q: For multi-stop flights with 3+ intermediate stops (like A→B→C→D→E), how should the system determine which segments to consolidate? → A: Show only origin to final destination (A→E)
- Q: How should flight segments be visually distinguished from other calendar events? → A: Purple/blue background colors + airplane icons
- Q: For time zone handling in flight segments, how should departure and arrival times be displayed? → A: Show times in user's current timezone
- Q: When flight data is incomplete (missing departure/arrival times), how should the system handle these segments? → A: Hide incomplete segments from calendar
- Q: For flights that span across midnight (cross-date flights), how should they be displayed on the calendar? → A: Use existing multi-day event format

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a travel planner, I want to see flight segments displayed as individual time-based entries in my itinerary calendar so that I can visualize the exact departure and arrival times for each leg of my journey, allowing me to better plan ground transportation, connections, and activities around my flight schedule.

### Acceptance Scenarios
1. **Given** I have a round-trip flight from Salvador to Guarulhos to Salvador with departure on January 11th at 12:55 PM and return on January 26th at 9:00 AM, **When** I view my itinerary calendar, **Then** I should see two separate flight entries: one on January 11th from 12:55 PM to 3:30 PM and another on January 26th from 9:00 AM to 1:20 PM

2. **Given** I have a complex flight with multiple segments (Palmas → Brasília → Guarulhos → Palmas), **When** the system processes my flight data, **Then** it should consolidate intermediate stops and display only the meaningful segments (Palmas → Guarulhos and Guarulhos → Palmas) as separate calendar entries

3. **Given** my trip officially starts on January 13th but I have a flight departing on January 11th, **When** I view my itinerary calendar, **Then** the January 11th flight should appear on the calendar as part of the trip without changing the official trip start date

4. **Given** I have multiple flight segments on the same day, **When** I view my calendar, **Then** each segment should appear as a distinct time-based entry with accurate departure and arrival times

### Edge Cases
- What happens when a flight spans multiple days due to time zones or long travel duration?
- How does the system handle cancelled or rescheduled flight segments?
- What if flight data is incomplete or missing departure/arrival times?
- How are connecting flights with very short layovers displayed?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST display flight segments as individual time-based entries in the itinerary calendar
- **FR-002**: System MUST consolidate multi-segment flights by removing intermediate stops and showing only meaningful origin-to-destination segments
- **FR-003**: System MUST display each flight segment with accurate departure and arrival times as calendar events
- **FR-004**: System MUST include flights that occur up to two days before the official trip start date without modifying the trip dates
- **FR-005**: System MUST distinguish flight segments from other calendar events using purple/blue background colors and airplane icons
- **FR-006**: System MUST handle round-trip flights by creating separate calendar entries for outbound and return segments
- **FR-007**: System MUST process complex multi-stop flights by consolidating all intermediate stops and displaying only origin-to-final-destination segments
- **FR-008**: System MUST display all flight departure and arrival times converted to the user's current timezone
- **FR-009**: System MUST exclude flight segments with incomplete timing data from calendar display
- **FR-010**: System MUST display cross-date flight segments using the existing multi-day event format structure

### Key Entities *(include if feature involves data)*
- **Flight Segment**: A single leg of air travel with origin, destination, departure time, and arrival time
- **Flight Journey**: A collection of related flight segments that represent a complete travel route (e.g., outbound or return journey)
- **Calendar Event**: A time-based entry in the itinerary calendar representing a flight segment with start and end times
- **Trip**: The overall travel plan that can include flights starting before the official trip dates

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous  
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

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