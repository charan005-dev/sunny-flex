# Sunny App Builder — Complete Technical Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Data Flow](#data-flow)
3. [Database Schema](#database-schema)
4. [The layoutJson — Heart of Everything](#the-layoutjson)
5. [API Endpoints](#api-endpoints)
6. [Console Preview — How It Works](#console-preview)
7. [Consumer App — Layout Resolution](#consumer-layout-resolution)
8. [Component Registry](#component-registry)
9. [Theme System](#theme-system)
10. [Auth0 Integration](#auth0-integration)
11. [Adding a New Page from Figma](#adding-a-new-page)
12. [Team Checklist](#team-checklist)

---

## Architecture Overview

```
┌──────────────────────────┐         ┌───────────────────────────────┐
│  App Builder Console     │         │  Consumer App                 │
│  (React, port 5173)      │         │                               │
│                          │         │  Client (React, port 5174)    │
│  - Black/white admin UI  │  API    │  - Tenant-themed UI           │
│  - Tenant/Cohort/Route   │◄──────►│  - Dynamic layout rendering   │
│    selectors             │         │  - Auth0 login                │
│  - Iframe preview        │         │                               │
│  - Variant picker        │         │  Server (Express, port 3001)  │
│  - Drag & drop           │         │  - Prisma + SQLite            │
│  - Zoom controls         │         │  - Auth0 JWT validation       │
│  - Mobile device picker  │         │  - Layout CRUD                │
│  - Publish flow          │         │  - Preview API (no auth)      │
│                          │         │  - Consumer API (auth)        │
└──────────────────────────┘         └───────────────────────────────┘
```

### Key Principle

The **console never renders components itself**. It embeds the consumer app via an iframe at `/preview?params`. All component code lives only in the consumer app. The console is purely a configuration UI.

---

## Data Flow

### Admin Editing Flow

```
1. Admin opens console (localhost:5173)
2. Selects: Tenant → Cohort → Route → Viewport
3. Console fetches draft layout from GET /api/layouts?params
4. Console builds iframe URL:
   localhost:5174/preview?route=/rewards&viewport=desktop
     &tenantCode=kaiser&cohortCode=default&status=draft
5. iframe loads → consumer app fetches GET /api/preview/layout
6. Consumer app renders the layout with real components
7. Admin clicks a component in iframe → postMessage → Console
8. Console sidebar shows variant options for that slot
9. Admin applies a variant → saveSlotChange() →
   PUT /api/layouts/:id (saves draft)
10. Console tells iframe to refresh via postMessage
11. Admin clicks Publish → POST /api/layouts/:id/publish
12. Draft is copied to published status
```

### End-User Flow

```
1. User logs in at localhost:5174
2. Auth0 returns JWT with custom claims:
   - tenant_code: "kaiser"
   - cohort_code: "genz"
3. App decodes JWT → sets ThemeProvider(tenantCode="kaiser")
4. DynamicPage calls GET /api/consumer/layout?route=/rewards&viewport=desktop
5. Server extracts tenant/cohort from JWT
6. Resolution chain:
   a. Find published layout for kaiser + genz → found? return it
   b. Fallback: find layout for kaiser + default → return it
   c. Neither → 404
7. LayoutRenderer renders CSS grid
8. SlotRenderer lazy-loads each component from registry
9. Components render with tenant theme colors
```

---

## Database Schema

### Tables

#### `tenants`
| Column | Type | Example |
|--------|------|---------|
| id | UUID | `4197900c-...` |
| code | String (unique) | `kaiser` |
| name | String | `Kaiser` |
| isActive | Boolean | `true` |

#### `cohorts`
| Column | Type | Example |
|--------|------|---------|
| id | UUID | `a516a95c-...` |
| code | String | `genz` |
| name | String | `Gen Z` |
| tenantId | FK → tenants | |

Unique constraint: `(tenantId, code)`

#### `routes`
| Column | Type | Example |
|--------|------|---------|
| id | UUID | |
| path | String (unique) | `/rewards` |
| name | String | `My Rewards` |
| description | String | `Rewards dashboard page` |

#### `slot_definitions`
| Column | Type | Example |
|--------|------|---------|
| id | UUID | |
| routeId | FK → routes | |
| slotKey | String | `dial` |
| name | String | `Rewards Dial` |
| allowedSlotTypes | JSON string | `["dial"]` |
| sortOrder | Integer | `1` |
| viewports | JSON string | `["desktop","mobile"]` |

Unique constraint: `(routeId, slotKey)`

#### `component_registry`
| Column | Type | Example |
|--------|------|---------|
| id | UUID | |
| code | String (unique) | `dial_variant_a` |
| name | String | `Gauge Dial` |
| slotType | String | `dial` |
| description | String | `Arc gauge showing...` |
| defaultProps | JSON string | `{"earned":75,"max":150}` |

#### `page_layouts` — The main table
| Column | Type | Example |
|--------|------|---------|
| id | UUID | |
| routeId | FK → routes | |
| tenantId | FK → tenants | |
| cohortId | FK → cohorts | |
| viewport | String | `desktop` |
| **layoutJson** | **JSON string** | **See below** |
| status | String | `draft` or `published` |
| version | Integer | `1` |
| publishedAt | DateTime | |
| publishedBy | String | |

Unique constraint: `(routeId, tenantId, cohortId, viewport, status)`

This means each combination of tenant + cohort + route + viewport has exactly ONE draft and ONE published layout.

---

## The layoutJson

This is the single most important piece of data. It defines what a page looks like:

```json
{
  "routePath": "/rewards",
  "viewport": "desktop",
  "gridTemplate": {
    "columns": "240px 1fr 340px",
    "rows": "200px 180px 280px 300px",
    "gap": "16px",
    "areas": [
      "sidebar dial actions",
      "sidebar info_card actions",
      "sidebar streak_calendar actions",
      "sidebar recent_activity recent_activity"
    ]
  },
  "slots": {
    "sidebar": {
      "componentCode": "sidebar_variant_a",
      "gridArea": "sidebar",
      "props": {
        "items": ["My card", "Shop", "My rewards", "Health adventures"]
      }
    },
    "dial": {
      "componentCode": "dial_variant_a",
      "gridArea": "dial",
      "props": { "earned": 75, "max": 150 }
    },
    "info_card": {
      "componentCode": "info_card_variant_a",
      "gridArea": "info_card",
      "props": {
        "title": "Your chance to win $100 each month",
        "entries": 3,
        "nextDrawing": "3/15/25"
      }
    },
    "streak_calendar": {
      "componentCode": "streak_calendar_variant_a",
      "gridArea": "streak_calendar",
      "props": { "streak": 5, "completedDays": [0,1,2,3,4] }
    },
    "actions_list": {
      "componentCode": "actions_list_variant_a",
      "gridArea": "actions",
      "props": { "showCategories": true }
    },
    "recent_activity": {
      "componentCode": "recent_activity_variant_a",
      "gridArea": "recent_activity",
      "props": { "maxItems": 5, "showViewAll": true }
    }
  }
}
```

### How it maps to CSS Grid

```
gridTemplate.areas becomes:

  "sidebar dial actions"
  "sidebar info_card actions"
  "sidebar streak_calendar actions"
  "sidebar recent_activity recent_activity"

Which renders as:

┌──────────┬───────────────┬──────────────┐
│          │     dial      │              │  200px
│          ├───────────────┤   actions    │  
│ sidebar  │   info_card   │              │  180px
│          ├───────────────┤              │
│          │streak_calendar│              │  280px
│          ├───────────────┴──────────────┤
│          │      recent_activity         │  300px
└──────────┴──────────────────────────────┘
  240px         1fr             340px
```

### The Contract

- **Grid defines the structure** — fixed row heights, column widths, named areas
- **Slots map components to areas** — which variant goes where, with what props
- **Components fill their cell** — `h-full` to take the full grid cell height
- **Swapping variants never changes the grid** — only the content inside a cell changes

---

## API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/api/tenants` | JWT | List all tenants |
| `GET` | `/api/tenants/:id/cohorts` | JWT | List cohorts for a tenant |
| `GET` | `/api/routes` | JWT | List all routes with slot definitions |
| `GET` | `/api/components` | JWT | List all registered components |
| `GET` | `/api/layouts?params` | JWT | Query layouts by filters |
| `POST` | `/api/layouts` | JWT + Admin | Create new draft layout |
| `PUT` | `/api/layouts/:id` | JWT + Admin | Update draft layoutJson |
| `POST` | `/api/layouts/:id/publish` | JWT + Admin | Publish a draft |
| `GET` | `/api/preview/layout` | **No auth** | Preview endpoint (console iframe) |
| `GET` | `/api/consumer/layout` | JWT | Consumer endpoint (reads claims) |
| `GET` | `/api/health` | None | Health check |

### Preview vs Consumer endpoint

| | Preview | Consumer |
|---|---|---|
| Auth | None | JWT required |
| Tenant source | `?tenantCode=kaiser` query param | JWT claim `tenant_code` |
| Cohort source | `?cohortCode=genz` query param | JWT claim `cohort_code` |
| Status | `?status=draft` (can view drafts) | Always `published` only |
| Used by | Console iframe | End-user app |

---

## Console Preview

### postMessage Communication

The console and iframe communicate bidirectionally:

**Console → iframe:**
```javascript
// Select a slot (highlights it in iframe)
iframe.postMessage({ type: "select-slot", slotKey: "dial" })

// Refresh layout data
iframe.postMessage({ type: "refresh" })

// Request slot positions for drag & drop
iframe.postMessage({ type: "get-slot-rects" })

// Highlight a slot during drag hover
iframe.postMessage({ type: "drag-hover", slotKey: "dial" })

// Clear drag state
iframe.postMessage({ type: "drag-end" })
```

**iframe → Console:**
```javascript
// User clicked a slot
parent.postMessage({ type: "slot-clicked", slotKey: "dial" })

// Slot positions for drop zone overlay
parent.postMessage({ type: "slot-rects", rects: {
  dial: { top: 80, left: 260, width: 400, height: 200 },
  sidebar: { top: 0, left: 0, width: 240, height: 780 },
  ...
}})
```

### Drag & Drop Flow

```
1. User starts dragging a variant card from sidebar
2. Console sends "get-slot-rects" to iframe
3. iframe measures each [data-slot-key] element's bounding rect
4. iframe sends back "slot-rects" with positions
5. Console creates invisible drop zones at those exact positions
6. As user drags over a zone → "drag-hover" sent to iframe
7. iframe highlights that specific component with a ring
8. User drops → Console calls saveSlotChange()
9. API saves → "refresh" sent to iframe → re-renders
```

### Zoom Controls

The zoom simulates real browser zoom:

```
At 100%: iframe width = 1440px (normal)
At 150%: iframe width = 960px  (content reflows as if narrower window)
At 50%:  iframe width = 2880px (content has more room)

Formula: effectiveWidth = baseWidth / zoom
Display: scale(zoom) to fit container
```

---

## Consumer Layout Resolution

When `/api/consumer/layout` is called:

```
1. Extract tenantCode and cohortCode from JWT claims
2. Lowercase both (case insensitive matching)
3. Find tenant by code
4. Resolution chain for cohort:
   a. Try exact cohortCode (e.g. "genz")
   b. If no layout found, try "default"
5. Find published layout for tenant + cohort + route + viewport
6. Return layoutJson
```

This means:
- Every cohort inherits from `default` until it has its own layout
- An admin can customize Gen Z's layout independently
- If Gen Z's layout is deleted, it falls back to default automatically

---

## Component Registry

```
consumer-app/client/src/
  registry/
    componentRegistry.ts       ← Maps code → lazy-loaded component
  components/slots/
    dial/
      DialVariantA.tsx         ← Gauge arc
      DialVariantB.tsx         ← Progress bar
      DialVariantC.tsx         ← Big number
    info-card/
      InfoCardVariantA.tsx     ← Sweepstakes card
      InfoCardVariantB.tsx     ← Gradient card
      InfoCardVariantC.tsx     ← Text-only card
    streak-calendar/
      StreakCalendarVariantA.tsx ← Monthly grid
      StreakCalendarVariantB.tsx ← Weekly circles
      StreakCalendarVariantC.tsx ← Bar chart
    actions-list/
      ActionsListVariantA.tsx  ← Vertical list with filter
      ActionsListVariantB.tsx  ← Card grid
      ActionsListVariantC.tsx  ← Horizontal scroll
    recent-activity/
      RecentActivityVariantA.tsx ← Timeline with milestones
      RecentActivityVariantB.tsx ← Timeline dots
      RecentActivityVariantC.tsx ← Compact list
    sidebar/
      SidebarVariantA.tsx      ← Full sidebar with labels
      SidebarVariantB.tsx      ← Icon-only sidebar
      SidebarVariantC.tsx      ← Bottom navigation (mobile)
    card-info/
      CardInfoVariantA.tsx     ← Balance with tabs
      CardInfoVariantB.tsx     ← Visual card
    transactions/
      TransactionsVariantA.tsx ← Healthy living list
      TransactionsVariantB.tsx ← Simple transactions
    adventures/
      AdventuresVariantA.tsx   ← Horizontal cards
      AdventuresVariantB.tsx   ← Vertical list
```

### Component Contract

Every slot component must follow this pattern:

```typescript
import { useTheme } from "../../../contexts/ThemeContext";

interface Props {
  props: Record<string, unknown>;
}

export default function MyComponent({ props }: Props) {
  const theme = useTheme();
  const someValue = (props.someKey as number) ?? defaultValue;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
      {/* h-full = fill grid cell */}
      {/* flex flex-col = internal layout */}
      {/* useTheme() = tenant colors */}
    </div>
  );
}
```

**Rules:**
- Root div must have `h-full` to fill the grid cell
- Use `flex flex-col` with `flex-1` for expandable sections
- Use `overflow-y-auto` for scrollable content within fixed cells
- Call `useTheme()` for colors — never hardcode tenant-specific colors
- Props come from `layoutJson.slots[slotKey].props`

---

## Theme System

```typescript
// consumer-app/client/src/contexts/ThemeContext.tsx

const THEMES = {
  kaiser: {
    headerBg: "#1a2744",       // Dark navy
    primary: "#2563eb",         // Blue
    primaryLight: "#dbeafe",    // Light blue
    primaryDark: "#1e3a5f",     // Dark blue
    dialStroke: "#16a34a",      // Green (gauge)
    cardBg: "#1e3a5f",         // Card backgrounds
    badgeBg: "#1e3a5f",        // Action badges ($20, $10)
    linkColor: "#2563eb",       // Links
    activeBg: "#eff6ff",        // Active sidebar bg
    activeText: "#1d4ed8",      // Active sidebar text
    successColor: "#16a34a",    // Green amounts
  },
  sunny: {
    headerBg: "#78350f",       // Dark amber
    primary: "#d97706",         // Yellow/amber
    primaryLight: "#fef3c7",    // Light yellow
    primaryDark: "#92400e",     // Dark brown
    dialStroke: "#d97706",      // Amber (gauge)
    cardBg: "#92400e",         // Card backgrounds
    badgeBg: "#92400e",        // Action badges
    linkColor: "#d97706",       // Links
    activeBg: "#fef3c7",        // Active sidebar bg
    activeText: "#92400e",      // Active sidebar text
    successColor: "#16a34a",    // Green amounts
  },
};
```

Components use `useTheme()`:
```typescript
const theme = useTheme();
<div style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}>
  $20
</div>
```

---

## Auth0 Integration

### Setup

- **Domain**: `sunny-app-builder-dev.us.auth0.com`
- **API Identifier**: `https://api.layout-builder.local`
- **Namespace**: `https://layout-builder.local`

### Applications

| App | Type | Client ID | Port |
|-----|------|-----------|------|
| App Builder Console | SPA | `8qvU1CwhikTmmcVU3OvucO4rWJniwRbi` | 5173 |
| Consumer App | SPA | `PjahWbJNG8Ed2EsXwuN6rILKKSZ64q6y` | 5174 |

### Post-Login Action

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://layout-builder.local';
  if (event.user.user_metadata) {
    const { tenant_code, cohort_code } = event.user.user_metadata;
    if (tenant_code) {
      api.accessToken.setCustomClaim(`${namespace}/tenant_code`, tenant_code);
    }
    if (cohort_code) {
      api.accessToken.setCustomClaim(`${namespace}/cohort_code`, cohort_code);
    }
  }
  const roles = event.authorization?.roles || [];
  if (roles.includes('admin')) {
    api.accessToken.setCustomClaim(`${namespace}/role`, 'admin');
  }
};
```

### User Metadata

Each user has `user_metadata` in Auth0:

```json
{
  "tenant_code": "kaiser",
  "cohort_code": "genz"
}
```

### Users

| Email | Tenant | Cohort | Role |
|-------|--------|--------|------|
| admin-app-builder@yopmail.com | — | — | admin |
| kp_consumer1@yopmail.com | kaiser | default | user |
| kp_genz@yopmail.com | kaiser | genz | user |
| kp_millennial@yopmail.com | kaiser | millennial | user |
| sunny_consumer1@yopmail.com | sunny | default | user |
| sunny_genz@yopmail.com | sunny | genz | user |
| sunny_millennial@yopmail.com | sunny | millennial | user |

---

## Adding a New Page from Figma

### Phase 1: Analyze the Figma (Product/Design)

1. Identify the **grid structure** — how many columns, rows, what spans what
2. Identify each **block/slot** — name them (e.g. `products`, `filters`, `cart`)
3. For each slot, decide how many **variants** are needed
4. Define fixed **row heights** for each block from the Figma measurements

### Phase 2: Define the Grid (Backend Dev)

In `consumer-app/server/prisma/seed.ts`:

```javascript
// 1. Add the route
const shopRoute = await prisma.route.upsert({
  where: { path: "/shop" },
  update: {},
  create: { path: "/shop", name: "Shop", description: "Product catalog" },
});

// 2. Add slot definitions
const shopSlots = [
  { slotKey: "sidebar", name: "Sidebar", allowedSlotTypes: '["sidebar"]', sortOrder: 0, viewports: '["desktop"]' },
  { slotKey: "products", name: "Products", allowedSlotTypes: '["products"]', sortOrder: 1, viewports: '["desktop","mobile"]' },
  { slotKey: "filters", name: "Filters", allowedSlotTypes: '["filters"]', sortOrder: 2, viewports: '["desktop","mobile"]' },
  { slotKey: "cart", name: "Cart", allowedSlotTypes: '["cart"]', sortOrder: 3, viewports: '["desktop","mobile"]' },
];

// 3. Add component registry entries
{ code: "products_variant_a", name: "Grid View", slotType: "products", description: "...", defaultProps: '{}' }
{ code: "products_variant_b", name: "List View", slotType: "products", description: "...", defaultProps: '{}' }

// 4. Define the grid template
const shopDesktopGrid = {
  columns: "240px 1fr 340px",
  rows: "300px 250px 200px",
  gap: "16px",
  areas: [
    "sidebar products filters",
    "sidebar products cart",
    "sidebar featured featured",
  ],
};

// 5. Create layout configs for each tenant
const kaiserShopDesktop = {
  routePath: "/shop",
  viewport: "desktop",
  gridTemplate: shopDesktopGrid,
  slots: {
    sidebar: { componentCode: "sidebar_variant_a", gridArea: "sidebar", props: {...} },
    products: { componentCode: "products_variant_a", gridArea: "products", props: {...} },
    filters: { componentCode: "filters_variant_a", gridArea: "filters", props: {...} },
    cart: { componentCode: "cart_variant_a", gridArea: "cart", props: {...} },
  },
};
```

### Phase 3: Build Components (Frontend Dev)

Create component files:

```
src/components/slots/
  products/
    ProductsVariantA.tsx    ← grid view
    ProductsVariantB.tsx    ← list view
  filters/
    FiltersVariantA.tsx
  cart/
    CartVariantA.tsx
    CartVariantB.tsx
```

Each component:

```typescript
import { useTheme } from "../../../contexts/ThemeContext";

interface Props {
  props: Record<string, unknown>;
}

export default function ProductsVariantA({ props }: Props) {
  const theme = useTheme();

  return (
    // h-full = fill grid cell
    // flex flex-col = layout
    // overflow-y-auto = scroll if content exceeds cell
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col">
      <div className="p-4 shrink-0">
        <h3 className="font-bold text-gray-900">Products</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {/* Content here */}
      </div>
    </div>
  );
}
```

### Phase 4: Register Components

In `consumer-app/client/src/registry/componentRegistry.ts`:

```typescript
products_variant_a: {
  component: lazy(() => import("../components/slots/products/ProductsVariantA")),
  slotType: "products",
  name: "Grid View",
},
products_variant_b: {
  component: lazy(() => import("../components/slots/products/ProductsVariantB")),
  slotType: "products",
  name: "List View",
},
```

### Phase 5: Add Route to Consumer App

In `consumer-app/client/src/App.tsx`:

```typescript
<Route path="/shop" element={<DynamicPage />} />
```

In sidebar components, add route mapping:

```typescript
const ROUTES = {
  "Shop": "/shop",
  "My card": "/my-card",
  "My rewards": "/rewards",
};
```

### Phase 6: Seed & Test

```bash
cd consumer-app
npm run db:seed        # Populate new data
# Restart server if needed
# Open console → select route → preview
```

---

## Team Checklist

When adding a new page from Figma:

```
[ ] Figma analyzed → grid structure defined (columns, rows, areas)
[ ] Fixed row heights decided for each slot
[ ] Slot types named (e.g. "products", "filters", "cart")
[ ] Variant count decided per slot
[ ] Route added to seed (prisma/seed.ts)
[ ] Slot definitions added to seed
[ ] Component registry entries added to seed
[ ] Layout configs added for all tenants (desktop + mobile)
[ ] Component variant files created (src/components/slots/...)
[ ] Components follow contract (h-full, useTheme, flex layout)
[ ] Components registered in componentRegistry.ts
[ ] Route added to consumer app router (App.tsx)
[ ] Sidebar route mapping updated
[ ] Database re-seeded (npm run db:seed)
[ ] Server restarted
[ ] Console preview verified (all tenants, both viewports)
[ ] Published and consumer app verified
[ ] Mobile devices tested in console device picker
```

---

## File Structure

```
app-builder-console/                    ← Admin console
  src/
    auth/Auth0Provider.tsx              ← Auth0 wrapper
    auth/ProtectedRoute.tsx             ← Route guard
    contexts/EditorContext.tsx           ← Central state (selections, save, publish)
    hooks/useEditorData.ts              ← React Query hooks for API
    services/api.ts                     ← Axios client
    pages/LayoutEditorPage.tsx          ← Main page (DnD context, layout)
    components/layout-editor/
      TenantCohortSelector.tsx          ← Dropdowns + unsaved changes guard
      ViewportToggle.tsx                ← Desktop/Mobile switch
      PublishBar.tsx                    ← Save Draft + Publish + confirm modal
      ComponentPalette.tsx              ← Variant picker sidebar
      LayoutCanvas.tsx                  ← Iframe + zoom + drop zones + toast

consumer-app/
  client/
    src/
      auth/Auth0Provider.tsx
      auth/ProtectedRoute.tsx
      contexts/ThemeContext.tsx          ← Tenant color theming
      hooks/useLayout.ts                ← Fetch layout for current route
      hooks/useViewport.ts              ← Detect mobile/desktop
      registry/componentRegistry.ts     ← Code → Component mapping
      services/api.ts
      pages/
        DynamicPage.tsx                 ← Authenticated route renderer
        PreviewPage.tsx                 ← Console iframe renderer (no auth)
        PreviewComponentPage.tsx        ← Single component preview (no auth)
      components/
        common/Header.tsx               ← Tenant-themed header
        renderer/
          LayoutRenderer.tsx            ← CSS Grid from layoutJson
          SlotRenderer.tsx              ← Lazy-load component by code
        slots/                          ← All 24 component variants
          dial/
          info-card/
          streak-calendar/
          actions-list/
          recent-activity/
          sidebar/
          card-info/
          transactions/
          adventures/
  server/
    src/
      index.ts                          ← Express app setup
      config/env.ts                     ← Environment variables
      middleware/auth.ts                ← JWT validation + tenant extraction
      routes/
        tenants.routes.ts               ← Tenant CRUD
        routes.routes.ts                ← Route CRUD
        components.routes.ts            ← Component registry CRUD
        layouts.routes.ts               ← Layout CRUD + consumer endpoint
        preview.routes.ts               ← Preview endpoint (no auth)
    prisma/
      schema.prisma                     ← Database schema
      seed.ts                           ← Seed data (tenants, components, layouts)
      dev.db                            ← SQLite database file
```
