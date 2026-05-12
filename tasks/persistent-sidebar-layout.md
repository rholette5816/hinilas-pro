# Task: Persistent Sidebar Layout + Nav Rename/Reorder

## Goal
1. Rename "Content Pack" nav item to "Content Creation" and move it after "Audit Department" in the sidebar nav order.
2. Move `<Sidebar />` into `app/layout.tsx` via a new `AppShell` component so it renders once and never blinks or remounts during navigation. Remove `<Sidebar />` from every individual page.

---

## Change 1: Rename + Reorder Nav Item

**File:** `components/Sidebar.tsx`

In the `NAV_ITEMS` array, make two changes:

**a) Rename:**
Change `label: "Content Pack"` to `label: "Content Creation"` and `desc: "7 posts from research"` to `desc: "7 posts from your research"`.

**b) Reorder:**
Move the `/content` item to be the LAST item in the array, after the `/analyze` (Audit Department) entry.

The final NAV_ITEMS order must be:
1. `/` — Setup
2. `/research` — Research Department
3. `/angles` — Strategy Department
4. `/creative` — Creative Department
5. `/copy` — Caption Department
6. `/campaign-setup` — Campaign Setup
7. `/analyze` — Audit Department
8. `/content` — Content Creation (moved here, was index 2)

---

## Change 2: Create `components/AppShell.tsx`

Create a new client component that:
- Reads `usePathname()` to determine if the current route is a public page
- Public routes (no sidebar): `/home`, `/pricing`, `/blog`, `/ref`, `/privacy`, `/terms`, `/data-deletion`
- App routes (show sidebar): everything else
- On app routes: renders `<div className="flex h-screen overflow-hidden"><Sidebar /><div className="flex-1 overflow-y-auto">{children}</div></div>`
- On public routes: renders `<>{children}</>` with no wrapper

```tsx
"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { ReactNode } from "react";

const PUBLIC_ROUTES = ["/home", "/pricing", "/blog", "/privacy", "/terms", "/data-deletion"];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isPublic =
    PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/")) ||
    pathname.startsWith("/ref/");

  if (isPublic) return <>{children}</>;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
```

---

## Change 3: Update `app/layout.tsx`

Import `AppShell` and wrap `{children}` with it. Remove `TopBar` if it is only used on public pages (check first — if TopBar is used on app pages too, keep it inside AppShell or leave it as-is).

The layout body should become:
```tsx
<AppProvider>
  <AppShell>
    <TopBar />
    {children}
  </AppShell>
  <FloatingChatWrapper />
</AppProvider>
```

Wait — TopBar is already in the layout. Keep it exactly where it is. Only wrap `{children}` inside AppShell, not TopBar and FloatingChatWrapper:

```tsx
<AppProvider>
  <TopBar />
  <AppShell>
    {children}
  </AppShell>
  <FloatingChatWrapper />
</AppProvider>
```

---

## Change 4: Remove `<Sidebar />` from all individual pages

For each of these files, make two changes:
1. Remove the line: `import Sidebar from "@/components/Sidebar";`
2. Remove `<Sidebar />` from the JSX
3. Remove the outer `<div className="flex h-screen overflow-hidden">` wrapper that previously contained `<Sidebar />` and `<main>` — keep the `<main>` element but unwrap it from that outer div

**Files to update:**
- `app/page.tsx`
- `app/research/page.tsx`
- `app/angles/page.tsx`
- `app/copy/page.tsx`
- `app/creative/page.tsx`
- `app/analyze/page.tsx`
- `app/campaign-setup/page.tsx`
- `app/content/page.tsx`
- `app/community/page.tsx`
- `app/expert/page.tsx`
- `app/library/page.tsx`
- `app/pricing/page.tsx`

**Important:** Each page currently has a pattern like:
```tsx
return (
  <div className="flex h-screen overflow-hidden">
    <Sidebar />
    <main className="flex-1 overflow-y-auto pt-14 md:pt-12">
      {/* page content */}
    </main>
  </div>
);
```

After the change it should be:
```tsx
return (
  <main className="flex-1 overflow-y-auto pt-14 md:pt-12">
    {/* page content */}
  </main>
);
```

Some pages have TWO return paths (loading state + main state) that both wrap in the flex div with Sidebar. Remove Sidebar from BOTH return paths in those files. Keep all other JSX inside `<main>` exactly as-is.

---

## Acceptance Criteria
- [ ] Sidebar label shows "Content Creation" (not "Content Pack")
- [ ] "Content Creation" appears last in the nav, after "Audit Department"
- [ ] Navigating between `/research`, `/angles`, `/copy`, `/creative`, `/analyze`, `/campaign-setup`, `/content` does NOT cause the sidebar to blink or remount
- [ ] Sidebar credits, nav active state, and user info update correctly without page flash
- [ ] `/home` and `/pricing` pages still show NO sidebar (public pages)
- [ ] No TypeScript errors (`npm run build` passes)
- [ ] No duplicate Sidebar renders anywhere

## Do NOT change
- Any logic inside individual pages (AI generation, credit checks, state)
- API routes
- Auth flow
- The Sidebar component internals (only the NAV_ITEMS array)
- `lib/context.tsx`, `lib/knowledge.ts`, `lib/credits.ts`
- Any CSS or styling inside page components
