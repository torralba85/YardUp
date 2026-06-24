# Specification: Builder Dashboard Ledger-Table View

**Spec Date:** 2026-06-20  
**Status:** Approved  
**Feature:** Builder Dashboard Ledger-Table View + Certificate Inspection Pane

---

## 1. Overview
The LotFoundry builder dashboard currently displays matched homeowner leads as a vertical stack of individual card components (`LeadCard`). While effective at low volumes, cards become hard to compare and scan once a builder regularly receives 10+ leads per week. 

This specification introduces an alternative **Ledger-Table View** that displays leads in a dense table (left pane) alongside an interactive **Certificate of Feasibility Inspection Pane** (right pane). Builders can toggle between the traditional Card View and the new Ledger-Table View, with an automatic fallback to Card View on narrow mobile screens.

---

## 2. User Experience & Design

### A. Layout Toggle Control
- A toggle button group using Lucide icons `LayoutGrid` (Cards) and `List` (Ledger) will be rendered next to the status tab filters in [BuilderInbox.tsx](file:///C:/Users/torra/Downloads/Repos/AR%20ADU/urbanlens-landing/components/builder/BuilderInbox.tsx).
- The toggle control is hidden on mobile (`hidden md:inline-flex`) and only appears on screens larger than `768px` (`md:`).

### B. View Mode Persistence
- The selected `viewMode` (`"cards"` or `"ledger"`) is stored in `localStorage` under the key `lf-builder-view-mode`.
- Upon mounting, `BuilderInbox` hydrates this setting to ensure the builder's preference is remembered across page reloads.

### C. Desktop Split View (>= 768px)
- Rendered in a two-column grid (`md:grid-cols-[1.2fr_1fr] md:gap-6`).
- **Left Column (Table)**: 
  - Displays columns: **ID** (Serial no. e.g. `LF-83719`), **City**, **Size** (Proposed footprint sqft), **Est. Rent** (Monthly income potential), **Status** (Triage status badge), and **Access** (Locked / Unlocked).
  - Selected row receives a highlighted background (`bg-lf-taupe-soft/25`) and a left accent border.
- **Right Column (Inspection Pane)**:
  - If the selected lead is **Unlocked**: Displays the homeowner's contact information (Name, Email, Phone) and the full `Certificate of Feasibility` report (APN, zoning checks, setbacks, and payback figures).
  - If the selected lead is **Locked**: Obfuscates the property APN/address and displays a prominent card prompting the builder to unlock the lead for its details.

### D. Mobile Fallback (< 768px)
- The Ledger-Table view is forced to the traditional cards list (`block md:hidden`) on mobile screens to maintain mobile responsiveness and touch-friendly targets.

---

## 3. Data Flow & Interaction

1. **Triage Status Filter**:
   - The user selects a status tab (All, New, Interested, Archived).
   - If the currently selected lead (`selectedLeadId`) is filtered out of the new list, the active selection is reset to the first lead in the updated list.
2. **Lead Selection**:
   - Tapping any row in the table updates the `selectedLeadId` state, causing the right-hand inspection pane to re-render with the selected lead's data.
3. **Unlocking Workflow**:
   - Clicking "Unlock Lead" inside the inspection pane for a locked lead launches the normal Stripe/demo unlock workflow.
   - Once unlocked, the state resolves inline, revealing the owner details and full certificate data inside the pane.

---

## 4. Verification Plan

### Automated Tests
- Extend `components/builder/BuilderInbox.test.tsx` to verify:
  - Toggling view mode changes rendering state.
  - Clicking table rows updates active selection.
  - Filtering status tabs updates active selection appropriately.

### Manual Verification
- Deploy local dev server and test:
  - Layout toggle persists state in `localStorage` on page refresh.
  - Table columns align correctly and use `tabular-nums` for numeric alignment.
  - Resizing browser below 768px automatically triggers fallback to card view and hides the toggle.
