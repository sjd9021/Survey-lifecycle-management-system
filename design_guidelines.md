# Design Guidelines: Claim Lifecycle Management System (CLMS)

## Design Approach

**Selected Framework**: Fluent Design System (Microsoft)
**Rationale**: Enterprise productivity application requiring information-dense layouts, data table excellence, and clear visual hierarchy for claim tracking workflows. Fluent's depth system and component patterns are purpose-built for business intelligence dashboards.

**Core Principles**:
1. **Efficiency First**: Minimize clicks, maximize information density without clutter
2. **Scannable Data**: Enable quick visual parsing of claim statuses and overdue items
3. **Context Retention**: Persistent navigation and filters, minimizing context switching
4. **Progressive Disclosure**: Show summaries by default, expand for details on demand

---

## Typography

**Font Stack**: Segoe UI, system-ui, -apple-system, sans-serif

**Hierarchy**:
- **Page Titles**: 32px/2rem, semibold (600)
- **Section Headers**: 24px/1.5rem, semibold (600)
- **Card/Panel Titles**: 18px/1.125rem, semibold (600)
- **Data Labels**: 14px/0.875rem, medium (500), uppercase tracking
- **Body/Table Text**: 14px/0.875rem, normal (400)
- **Metadata/Timestamps**: 12px/0.75rem, normal (400)
- **Buttons/CTAs**: 14px/0.875rem, medium (500)

**Line Heights**: 1.5 for body text, 1.2 for headings

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, and 8** consistently
- Component padding: `p-4`, `p-6`
- Section spacing: `gap-6`, `gap-8`
- Tight groupings: `gap-2`, `space-y-2`
- Page margins: `px-6 py-8` or `px-8 py-8`

**Grid System**:
- **Dashboard Layout**: Sidebar (240px fixed) + Main content (flex-1)
- **Content Max-Width**: `max-w-7xl` for main canvas
- **Card Grids**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for stats/metrics
- **Data Tables**: Full-width within content area

**Responsive Breakpoints**:
- Mobile: Single column stacking, collapsible sidebar
- Tablet (md:): 2-column layouts where appropriate
- Desktop (lg:+): Full multi-column productivity layouts

---

## Component Library

### Navigation
**Top Bar** (Fixed):
- Logo/brand (left)
- Global search bar (center, expandable)
- User profile, notifications (right)
- Height: `h-16`

**Side Navigation** (Persistent):
- Collapsible panel (240px → 64px icon-only)
- Links: Dashboard, All Claims, Overdue, Settings
- Active state: Subtle background treatment, left border accent
- Icon + label pattern using Heroicons

### Dashboard Components

**Stats Cards** (3-column grid):
- Prominent number (32px/2rem, bold)
- Label below (12px, uppercase)
- Trend indicator (↑/↓ with percentage)
- Padding: `p-6`

**Claims Table** (Primary UI):
- Sticky header row
- Columns: Gladstone Ref, Client Refs, Notification Date, Survey Date, PLA Date, Status, Actions
- Row hover state for interactivity
- Expandable rows for email thread preview
- Status badges: Pill-shaped with uppercase text (12px)
- Pagination footer: Results count + page controls
- Cell padding: `px-4 py-3`

**Status Badge System**:
- NOTIFIED: Neutral treatment
- SURVEY_SCHEDULED: In-progress treatment  
- PLA_SENT: Success treatment
- OVERDUE: Warning/alert treatment
- Uppercase 11px text, medium weight, rounded-full

**Filter Panel** (Collapsible sidebar or drawer):
- Grouped filter sections: Date Range, Branch, Insurer, Status
- Checkboxes for multi-select
- Date pickers for ranges
- "Apply Filters" + "Clear All" buttons
- Section spacing: `space-y-4`

**Claim Detail View** (Modal or slide-over):
- Header: Gladstone Ref (large), status badge
- Key dates section: Grid layout showing all timestamps
- Email threads accordion: Expandable messages with from/to/date
- Reference numbers list
- Action buttons: Edit, Export, Close
- Padding: `p-8`

### Forms & Inputs

**Input Fields**:
- Height: `h-10` (40px)
- Padding: `px-3 py-2`
- Border radius: `rounded-md`
- Labels above inputs: 14px, medium weight, `mb-2`
- Help text below: 12px

**Buttons**:
- Primary: Solid, medium weight, `px-4 py-2`, `rounded-md`
- Secondary: Outlined version
- Tertiary/Ghost: Text-only with hover background
- Icon buttons: Square `w-10 h-10`, centered icon

**Select Dropdowns**:
- Match input field sizing
- Chevron icon indicator
- Max height with scroll for long lists

### Data Visualization

**Timeline Component** (for claim lifecycle):
- Horizontal stepper showing events
- Connected dots/circles for each milestone
- Timestamps below each event
- Completed states filled, pending outlined

**Empty States**:
- Icon (64px) centered
- Heading + description text
- CTA button if actionable
- Centered within container

---

## Animations

**Minimal, Purposeful Only**:
- Table row hover: Instant background change (no transition)
- Modal/drawer entry: 200ms slide-in from right
- Dropdown menus: 150ms fade + slight slide-down
- Loading states: Subtle spinner, no skeleton screens unless >2s load
- **Avoid**: Page transitions, scroll animations, decorative motion

---

## Accessibility

- All interactive elements: Keyboard navigable (tab order)
- Focus indicators: Visible outline on all inputs/buttons
- Form labels: Properly associated with inputs
- Table headers: Proper `<th>` scope
- Status information: Not color-dependent (use icons/text)
- ARIA labels for icon-only buttons
- Minimum touch target: 44x44px

---

## Images

**No images required** for this enterprise dashboard application. All visual communication achieved through:
- Data tables and charts
- Status indicators and badges  
- Icons from Heroicons library
- Typography hierarchy

---

## Key Layout Patterns

**Dashboard Home**:
1. Stats cards row (3 columns)
2. Quick filters bar (horizontal pills)
3. Claims table (full-width, sortable, filterable)
4. Pagination controls

**Claim Detail**:
1. Header with Gladstone Ref + status
2. Two-column layout: Left = Key dates/metadata, Right = Email thread accordion
3. Bottom action bar with Edit/Export

**Filters**:
- Slide-over drawer from right (320px width)
- Stacked filter groups with clear sections
- Always visible "X results" counter updating live

This system prioritizes data clarity, scanning efficiency, and enterprise-grade reliability over visual flourish.