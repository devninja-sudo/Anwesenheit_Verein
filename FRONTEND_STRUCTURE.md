# Frontend Code Structure

## Overview

The frontend has been refactored from a monolithic `App.tsx` (1625 lines) into a modular component-based architecture for better maintainability.

## Component Structure

```
src/
├── components/
│   ├── AuthScreen.tsx       - Login, password request, and password setup views
│   ├── StartTab.tsx         - Welcome screen with info tiles
│   ├── SickCallTab.tsx      - Sick/absence reporting interface
│   ├── AttendanceTab.tsx    - Trainer attendance tracking UI
│   └── AdminTab.tsx         - Admin user management and absence feed
├── api/
│   ├── backendApi.ts        - API client functions
│   └── client.ts            - Base HTTP client configuration
├── constants/
│   └── groups.ts            - Training group definitions
├── types.ts                 - TypeScript type definitions
└── utils/
    └── schedule.ts          - Date formatting and session generation
```

## Components

### AuthScreen
**Purpose:** Authentication flow (login/setup/request)  
**Props:** Auth state, handlers, form values, clipboard function  
**Used when:** User is not logged in

### StartTab  
**Purpose:** Dashboard with training schedule and absence summary  
**Props:** currentUser, sessions, todaysAbsences  
**Used when:** activeTab === 'start'

### SickCallTab
**Purpose:** Report absences for current/child athletes  
**Props:** User info, family links, calendar, sick call handlers  
**Used when:** activeTab === 'meldung' (child/parent users only)

### AttendanceTab
**Purpose:** Trainer interface for marking attendance per session  
**Props:** Sessions, attendance data, handlers for creating/updating  
**Used when:** activeTab === 'attendance' (trainer/admin only)

### AdminTab
**Purpose:** Create users, link families, view all absences  
**Props:** User list, absence list, form state, handlers  
**Used when:** activeTab === 'admin' (trainer/admin only)

## State Management

All state remains in `App.tsx` and is passed down as props:
- **Auth state:** email, password, tokens, currentUser
- **Sick call state:** athleteName, reporterName, selectedSession, etc.
- **Admin state:** users list, form inputs, setup links
- **Attendance state:** sessions, entries, excusedChildren, CSV export

## Key Patterns

1. **Computed values:** useMemo for derived state (sessions, calendarDays, isLateCancellation)
2. **Data loading:** useCallback for API calls, useEffect for lifecycle
3. **Role-based UI:** Different tabs shown based on user role (trainer vs child/parent)
4. **Controlled components:** All form inputs controlled via App.tsx state

## Benefits

- **Maintainability:** Each tab is ~200-300 lines instead of 1600+ in one file
- **Reusability:** Components can be independently tested/modified
- **Type safety:** Strong typing for all props interfaces
- **Readability:** Clear separation of concerns
