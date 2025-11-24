# Infinity Sports — Cursor Build Brief

> **Goal**: Generate a production‑ready website and corporate portal for Infinity Sports with a clear TODO plan.  
> **Deliverables**: Public website, Admin panel (to control the intro/landing page), and Corporate Portal (employee intranet) with document sharing, news, calendar integration, directory, and finance modules (budget planning, invoices, cash flow, petty cash).  
> **Stack (suggested)**: Next.js 19 + TypeScript + Tailwind CSS (Web), NestJS (APIs), PostgreSQL. You may scaffold APIs later — for now, focus on front‑end pages and data models with mock data and API stubs.

---

## 1) Project Structure (Monorepo friendly)
- `apps/web` — Public website (Next.js + Tailwind)
- `apps/admin` — Admin dashboard (Next.js App Router, protected routes)
- `apps/portal` — Corporate/Employee Portal (Next.js App Router)
- `packages/ui` — Shared UI components (Navbar, Footer, Card, Table, Modal, Form)
- `packages/types` — Shared TS types & zod schemas
- `packages/config` — Tailwind, ESLint, tsconfig base
- `packages/mock-api` — Mock REST handlers (msw) and sample JSON

> If a single app is preferred: create `/web` with routes: `/`, `/admin`, `/portal` (role-gated).

---

## 2) Roles & Access
- **Public**: anyone
- **Staff**: authenticated employee (portal)
- **Coach**: staff with coaching permissions
- **Accountant**: finance permissions
- **Admin**: full access (incl. landing/intro page controls)

Auth can be mocked with a simple in‑memory user store + role cookie for now.

---

## 3) Public Website (apps/web)

### Required Pages
- `/` **Home (Intro/Landing)**  
  - Hero, value props, sports list, facilities highlights, CTA buttons.
- `/sports` **Sports & Facilities**  
  - Cards for Basketball, Volleyball, Gymnastics, Padel, Badminton, Ballet, Pilates; facility specs grid.
- `/partnerships` **Partnerships & Sponsorships**  
  - Benefits, community impact, contact form.
- `/events` **Events & Programs**  
  - Timeline/list + details page template.
- `/contact` **Contact**  
  - Contact form, map embed, basic info.

### Components
- Navbar, Footer, Hero, Section, Card, Carousel, Timeline, Stats, ContactForm.

### SEO
- Metadata, OG tags, sitemap, robots.txt.

---

## 4) Admin Panel (apps/admin) — **controls Home/Intro content**
**Purpose**: Allow Admin/Head Coach to edit the landing page and site content.

### Admin Pages
- `/admin` Dashboard (quick stats & links)
- `/admin/intro` **Intro/Landing Editor**
  - Edit hero title, subtitle, CTA labels/targets, background media, highlights.
- `/admin/sports` CRUD for sports list & ordering
- `/admin/facilities` CRUD for facilities with photos/specs
- `/admin/events` CRUD for events/programs
- `/admin/partners` Manage partner logos/sections
- `/admin/media` Simple media library (mocked upload list)
- `/admin/users` (optional) manage users & roles

> Use form validation (zod/react-hook-form). All writes can go to a mock JSON store for now.

---

## 5) Corporate Portal (apps/portal) — **Employee Intranet**

### Core Modules
1. **News**
   - `/portal/news` feed with categories & pinning
   - Create/update news (Staff+)
2. **Documents**
   - `/portal/docs` directory with folders & tags
   - Upload (mock), preview links, permissions (Staff/Coach/Admin)
3. **Calendar**
   - `/portal/calendar` team calendar (mock events)
   - Hooks for future Google/Microsoft integration
4. **Directory**
   - `/portal/directory` org list with search & profiles (name, role, phone/email, department)
5. **Finance**
   - `/portal/finance` hub
     - **Budget Planning**: yearly/quarterly/department budgets
     - **Invoices**: table with status (Draft/Sent/Paid/Overdue) & export CSV
     - **Cash Flow**: monthly inflow/outflow chart + net
     - **Petty Cash**: requests, approvals, running balance

### Portal Navigation
- Dashboard (widgets: News, Upcoming Events, Quick Links, Finance snapshot)
- Sidebar links to the modules above

---

## 6) Data Models (TypeScript types — place in `packages/types`)

```ts
export type Role = 'public' | 'staff' | 'coach' | 'accountant' | 'admin';

export interface IntroContent {
  heroTitle: string;
  heroSubtitle: string;
  ctas: { label: string; href: string }[];
  highlights: { title: string; description: string }[];
  heroMediaUrl?: string;
  lastUpdatedBy: string;
  updatedAt: string;
}

export interface Sport {
  id: string;
  name: string; // e.g., Basketball
  description?: string;
  featured?: boolean;
  order?: number;
  mediaUrl?: string;
}

export interface Facility {
  id: string;
  name: string;
  specs?: string[];
  mediaUrl?: string;
}

export interface EventItem {
  id: string;
  title: string;
  date: string; // ISO
  location?: string;
  description?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  body: string;
  author: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
  pinned?: boolean;
}

export interface DocItem {
  id: string;
  name: string;
  url: string;      // storage link or preview URL
  folder?: string;  // category
  tags?: string[];
  access: Role[];   // who can view
  uploadedBy: string;
  uploadedAt: string;
}

export interface DirectoryEntry {
  id: string;
  fullName: string;
  roleTitle: string;
  department?: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
}

export interface BudgetLine {
  id: string;
  department: string;
  period: 'Year' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | string;
  planned: number;
  actual?: number;
}

export interface Invoice {
  id: string;
  number: string;
  vendor: string;
  amount: number;
  currency: 'JOD' | 'USD' | 'EUR';
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  issueDate: string;
  dueDate?: string;
  notes?: string;
}

export interface CashFlowEntry {
  id: string;
  date: string;
  category: 'Income' | 'Expense';
  description: string;
  amount: number;
  currency: 'JOD' | 'USD' | 'EUR';
}

export interface PettyCashTxn {
  id: string;
  date: string;
  requester: string;
  purpose: string;
  amount: number;
  currency: 'JOD' | 'USD' | 'EUR';
  approvedBy?: string;
  status: 'Requested' | 'Approved' | 'Rejected' | 'Reimbursed';
}
```

---

## 7) Mock Data & API Stubs
- Place JSON in `packages/mock-api/data/*.json` for: `intro.json`, `sports.json`, `facilities.json`, `events.json`, `news.json`, `docs.json`, `directory.json`, `budget.json`, `invoices.json`, `cashflow.json`, `pettycash.json`.
- Use `msw` handlers to simulate GET/POST/PUT/DELETE for admin & portal routes.
- Provide helper hooks in each app to fetch/update data.

---

## 8) UI Components To Generate
- **UI**: Button, Input, Select, Textarea, Modal, Drawer, Tabs, Table (sortable/filterable), Badge, Card, EmptyState, Pagination.
- **Charts**: Line (cash flow), Bar (budget vs actual), Pie (expense categories). Use `recharts`.
- **Layout**: Navbar, Footer (web), AppSidebar, AppHeader, Breadcrumbs (admin/portal).

---

## 9) Acceptance Criteria (checklist)
### Public Website
- [ ] Responsive pages: Home, Sports, Partnerships, Events, Contact
- [ ] SEO meta & sitemap
- [ ] Lighthouse ≥ 90 (Performance/Best Practices/SEO)

### Admin
- [ ] Auth gate to `/admin/*`
- [ ] Intro editor updates home page immediately (reads from mock store)
- [ ] CRUD: Sports, Facilities, Events, Partners, Media

### Corporate Portal
- [ ] News feed with create/edit, pinning
- [ ] Document library with tags, foldering, role access
- [ ] Calendar page (mock data), ability to add/edit events
- [ ] Employee directory with search & profile page
- [ ] Finance module: Budget planning table with totals & variance
- [ ] Finance module: Invoices table with status filters + CSV export
- [ ] Finance module: Cash flow chart with monthly net
- [ ] Finance module: Petty cash requests workflow (status changes)

---

## 10) Developer Notes for Cursor
- Use Next.js App Router and Route Groups for clean URLs.
- Put shared design tokens in `packages/ui` with Tailwind.
- Use `zod` for form schemas and validation.
- Create `roleGuard` HOC for protecting routes.
- Keep everything in English; currency default JOD with formatter.
- Provide a `.env.example` with placeholders; no secrets required for mocks.

---

## 11) Prompt to Run in Cursor
> Build the project exactly as specified above. Scaffold the three apps (`web`, `admin`, `portal`) or a single app with role‑gated routes. Implement all pages and modules with mock APIs and seed data. Provide clean, modern UI with Tailwind and Recharts. Ensure Admin can fully control the landing/intro content. Produce instructions in README on how to run each app.
