# Facebook Ads Analytics Module - Design Guidelines

## Design Approach: Material Design System
**Justification:** This enterprise analytics platform requires consistent, accessible UI patterns for data-heavy interfaces. Material Design 3 principles provide the foundation, optimized for information density and professional workflows.

**Key Design Principles:**
- Data clarity over decoration
- Consistent hierarchy across complex views
- Efficient information architecture
- Professional, trustworthy aesthetic

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary):**
- Background Primary: `222 14% 12%` (deep slate)
- Background Secondary: `222 14% 16%` (elevated surfaces)
- Background Tertiary: `222 14% 20%` (cards, panels)
- Primary Brand: `210 100% 56%` (Facebook blue)
- Primary Hover: `210 100% 62%`
- Accent Success: `142 71% 45%` (positive metrics)
- Accent Warning: `38 92% 50%` (alerts)
- Accent Error: `0 84% 60%` (negative metrics)
- Text Primary: `0 0% 98%`
- Text Secondary: `220 9% 65%`
- Border Subtle: `222 14% 24%`

**Light Mode (Optional Toggle):**
- Background Primary: `0 0% 100%`
- Background Secondary: `220 14% 96%`
- Background Tertiary: `220 14% 93%`
- Use same brand/accent colors with adjusted opacity

### B. Typography

**Font Family:** Roboto (Material Design standard, loaded via Google Fonts)

**Type Scale:**
- Display Large: 32px/40px, weight 500 (dashboard headers)
- Heading 1: 24px/32px, weight 500 (section titles)
- Heading 2: 20px/28px, weight 500 (card headers)
- Body Large: 16px/24px, weight 400 (primary content)
- Body Medium: 14px/20px, weight 400 (table cells, labels)
- Body Small: 12px/16px, weight 400 (metadata, captions)
- Label Medium: 14px/20px, weight 500 (buttons, tabs)
- Metric Display: 28px/36px, weight 700 (KPI numbers)

### C. Layout System

**Spacing Primitives (Tailwind units):**
- Use **4, 8, 16, 24, 32** for consistent rhythm
- Component padding: `p-4` to `p-8`
- Section spacing: `gap-6` to `gap-8`
- Card margins: `m-4`
- Dense data views: `gap-2` to `gap-4`

**Grid Structure:**
- Main content: 12-column grid
- Left sidebar: Fixed 240px width (collapsed: 64px)
- Content area: `max-w-screen-2xl` with `px-8`
- Dashboard widgets: react-grid-layout 12 columns, 60px row height

### D. Component Library

**Navigation (Left Sidebar):**
- Background: `bg-slate-900` (222 14% 12%)
- Active item: Primary blue background with subtle glow
- Hover state: `bg-slate-800` with smooth transition
- Icons: Tabler Icons, 20px size
- Nested levels: Indented 16px per level
- Collapse toggle: Icon-only at top

**Data Tables (MUI X DataGrid Pro):**
- Header: `bg-slate-800`, uppercase 12px text, weight 600
- Row height: 48px (dense mode: 40px)
- Alternating rows: Subtle `bg-slate-850` stripe
- Selected row: Primary blue with 10% opacity
- Hover: Subtle brightness increase
- Borders: `border-slate-700` 1px
- Column resize handles: 2px wide, primary blue on hover

**Cards & Panels:**
- Background: `bg-slate-800`
- Border: 1px `border-slate-700`
- Border radius: 8px
- Shadow: Subtle elevation (0 4px 12px rgba(0,0,0,0.3))
- Padding: `p-6` standard, `p-4` for dense data

**Metrics/KPIs:**
- Container: Card with vertical layout
- Number: 28px, weight 700, primary text color
- Delta positive: Green with ↑ arrow
- Delta negative: Red with ↓ arrow
- Label: 12px, secondary text color
- Period comparison: Side-by-side with vs. label

**Charts (Recharts/ECharts):**
- Background: Transparent or `bg-slate-800`
- Grid lines: `stroke-slate-700` with 0.5 opacity
- Tooltip: `bg-slate-900` with white text, 8px border radius
- Color scheme: Primary blue, teal, purple, orange (accessible contrast)
- Line thickness: 2-3px
- Point size: 6px on hover

**Form Controls:**
- Input fields: `bg-slate-900`, 1px border `border-slate-600`
- Focus state: Primary blue border, 2px
- Labels: 14px, weight 500, secondary color
- Checkboxes: Material Design style, primary blue when checked
- Date pickers: Integrated Material UI components
- Dropdowns: `bg-slate-800` menu, 8px border radius

**Buttons:**
- Primary: `bg-blue-600` with hover `bg-blue-700`
- Secondary: Outlined with `border-blue-600`, text blue
- Tertiary: Text only with hover `bg-slate-800`
- Heights: 36px (medium), 32px (small), 40px (large)
- Border radius: 6px
- Icon + text: 8px gap

**Dashboard Widgets:**
- Title bar: 14px weight 500, with drag handle (⋮⋮)
- Content area: Appropriate chart/metric component
- Resize handles: 8px, visible on hover
- Grid snap: 12 columns with 16px gutters
- Minimum size: 2 columns × 2 rows

**Column Constructor (Drag & Drop):**
- Available columns: List with checkboxes + drag handles (right side)
- Selected columns: Highlighted `bg-slate-700`, ordered list
- Drag indicator: Primary blue line showing drop position
- Checkbox: Material Design, primary blue
- No remove buttons - uncheck to remove

**Export Dialogs:**
- Modal overlay: 40% opacity black
- Dialog: `bg-slate-800`, centered, 600px max width
- Format options: Radio buttons (CSV/XLSX/PNG/PDF)
- Progress bar: Primary blue with percentage
- Cancel button: Secondary style

**Top Bar/Header:**
- Height: 64px
- Background: `bg-slate-900`
- Border bottom: 1px `border-slate-700`
- User avatar: 32px circle, right aligned
- Workspace selector: Dropdown, left side after logo
- Search: 240px width, `bg-slate-800` input

### E. Animations

**Minimal, Purposeful Motion:**
- Sidebar collapse/expand: 200ms ease-in-out
- Table row hover: Instant background change
- Chart tooltips: 150ms fade-in
- Dashboard widget drag: Real-time position updates, no delay
- Loading states: Material Design circular progress
- **Avoid:** Scroll animations, parallax, decorative motion

## Accessibility Requirements

- Maintain WCAG AA contrast ratios (4.5:1 for text)
- Dark mode throughout with consistent input styling
- Keyboard navigation for all interactive elements
- Focus indicators: 2px primary blue outline with 2px offset
- Screen reader labels for data visualizations
- Aria-labels for icon-only buttons

## Images

**No hero images required** - this is a data-focused application. Use illustrations only where they add clarity:
- Empty states: Simple line illustrations (e.g., empty chart icon for no data)
- Onboarding: Step-by-step screenshots showing workflow
- Error states: Minimal iconography