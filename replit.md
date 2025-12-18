# Facebook Ads Analytics Module

## Overview

This project is a single-page application (SPA) for comprehensive analytics and reporting of Facebook Ads. It allows users to manage and analyze advertising campaigns across various entities (ad accounts, campaigns, ad sets, ads, creative assets) within a project-based structure. The platform aims to optimize Facebook advertising spend and performance through robust dashboards and reporting capabilities. It integrates deeply with Facebook Business Manager features, including Datasets (CAPI), Events, System Users, and Tokens, and provides a sophisticated metrics system that significantly expands upon the Facebook Marketing API's offerings.

## Recent Changes (November 7, 2025)

### Object Selection Filters
- Added comprehensive filter functionality to ObjectSelectionPanel for all levels (Ad Accounts, Campaigns, Ad Sets, Ads, Creatives)
- Implemented FilterMenu component with sorting (Z→A, A→Z) and text conditions (Contains, Does not contain, Equal to)
- Added proper data-testid attributes to all interactive elements for testing compliance
- Filter icon highlights when active and counter updates based on filtered items

### Breakdowns Panel
- **TEMPORARILY HIDDEN**: Breakdowns Panel on Analytics Page has been commented out (not deleted) in AnalyticsPage.tsx (lines 1508-1512)
- Code remains intact for future re-enablement
- Panel can be restored by uncommenting the JSX block

### Creatives Tab & Panel
- **DISABLED**: Creatives tab on Analytics Page is temporarily disabled with "soon" label
- Tab is visually dimmed (opacity-50) and not clickable (cursor-not-allowed)
- Styled with elegant "soon" text in superscript format
- **DISABLED**: Ad Creatives menu item in sidebar is disabled (opacity-50, cursor-not-allowed) with "soon" label
- **HIDDEN**: Creatives panel on Selection Page is temporarily hidden (commented out in SelectionPage.tsx, lines 569-579)
- "soon" label in superscript added to all Creatives mentions

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend is built with React 18, TypeScript 5, and Vite 5. It uses Wouter for routing, Redux Toolkit 2 for state management (with localStorage sync), and TanStack React Query for server state. UI components are built with Shadcn UI (Radix UI) and Tailwind CSS, adhering to Material Design 3 with custom theming. Key features include project management, multi-level asset selection, hierarchical navigation, report creation/management, and analytics dashboards with data visualization via Recharts and ECharts. Advanced data tables are handled by MUI X DataGrid Pro. Dashboards include a breakdowns panel for multi-dimensional data segmentation and persistent layout. Charts feature internal zoom/pan controls, a Brush zoom slider for time-series data, and a custom legend component.

### Backend

The backend uses Express.js with TypeScript on Node.js, providing a RESTful API. It follows a controller-based architecture for CRUD operations using TypeORM. Input validation for all POST/PUT endpoints is enforced via Zod schemas and `validateRequest` middleware. It includes centralized error handling that provides clean responses and sanitizes SQL details.

### Data Storage

The application uses TypeORM as the ORM for an external PostgreSQL 15 database. Core entities include users, projects, reports, notes, metric presets, calculated metrics, ad accounts, permissions, pixels, audiences, datasets (CAPI), events, system users, and tokens. Client-side state persistence is managed by Redux with localStorage.

### Redux State Management

Redux Toolkit 2 manages application state across 10 slices, all persisted to localStorage, covering projects, reports, metric presets, calculated metrics, notes, ad accounts, permissions, pixels, audiences, and user profiles.

### Metrics & Analytics System

The platform features a comprehensive metrics system with 161 total metrics, significantly exceeding the Facebook Marketing API. It employs smart metric aggregation, distinguishing between summable base metrics (e.g., impressions, clicks) and derived metrics (e.g., CTR, ROAS) that require recalculation from aggregated base metrics using defined formulas. This ensures accurate aggregation across various dimensions and timeframes.

### UI/UX Decisions

The UI follows Material Design 3 principles, optimized for data-heavy interfaces with responsive layouts, icon/main sidebars, and content areas. It includes a comprehensive color palette with dark mode, custom CSS variables, inline editing, and modern dialog UIs. The report creation workflow supports date-based analytics tables with expandable rows. Dashboards feature flexible chart grids with various chart types, comparison visualizations, and a robust chart metric validation system. Notes, recommendations, and settings pages feature full-width tables with sticky headers, column-level filtering/sorting, drag-and-drop reordering, and rich text editing capabilities.

## External Dependencies

-   **PostgreSQL 15**: Primary database.
-   **TypeORM**: ORM for database management.
-   **Wouter**: Client-side routing.
-   **Shadcn UI / Radix UI**: Core UI component library.
-   **Redux Toolkit 2**: State management.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **React Hook Form**: Form handling.
-   **@dnd-kit**: Drag & drop functionality.
-   **Meta/Facebook Graph API**: For fetching ad data.
-   **Redis 7**: For caching and job queues.
-   **Recharts / ECharts**: Data visualization.
-   **MUI X DataGrid Pro**: Advanced data tables.
-   **react-zoom-pan-pinch**: Chart zoom and pan functionality.