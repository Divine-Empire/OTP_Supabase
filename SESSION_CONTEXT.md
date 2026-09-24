# OTP_Supabase — Session Context Log

Ye file is poori conversation ka summary hai — kya build hua, kaise, aur kyun. Naye session me context load karne ke liye reference ke taur par use karo.

## Project Overview

- **Stack**: Next.js App Router + Supabase Postgres (shared prod DB via Supavisor pooler `aws-0-ap-southeast-1.pooler.supabase.com`, project `nfwtbrmqvsejwwvraanf`).
- **Shared DB rules**: `lto_*` tables (Lead-To-Order system) never touch as side effect; `sss_*` tables (legacy) never touch without explicit authorization; sab naye objects `otp_` prefix se.
- **Workflow per stage**: SQL migration in `Database/`, REST API route `app/api/otp-supabase/<stage>/route.ts`, mapper function in `lib/otp-utils.ts`, Next.js page `app/<stage>/page.tsx`.
- **Verification discipline**: har schema/logic change live prod DB ke against `DO-TEST-*` naamed rows se verify hota hai, phir turant delete.
- **DB access**: `PGPASSWORD='MhPa83U4GgwYQ4aL' psql -h aws-0-ap-southeast-1.pooler.supabase.com -p 5432 -d postgres -U postgres.nfwtbrmqvsejwwvraanf`

## Core Architectural Pattern (har stage ke liye)

**Pending/History invariant**: `<parent>.<next_stage>_planned` column conditionally set hota hai (usually `now() + TAT`). Pending = planned IS NOT NULL AND koi matching child row nahi. History = matching child row exist karta hai.

**TAT system**: `otp_stage_tat` table (stage_key, stage_label, tat_minutes, description) — Settings > TAT Management se manage hota hai. `lib/tat.ts` ka `getStageTatMinutes()`/`addTatMinutes()` har API route me use hota hai planned dates calculate karne ke liye.

**Radix Tabs + Tailwind cascade bug** (important gotcha): Radix inactive `TabsContent` ko `hidden` attribute deta hai, jo User-Agent stylesheet me hota hai — Tailwind ka `.flex{display:flex}` (author-origin) usko override kar deta hai bina `!important` ke bhi (specificity rules). Fix: `data-[state=inactive]:hidden` compound selector add karo har `TabsContent` pe jo flex-fill-height pattern use karta hai.

## Full Pipeline (as of end of session), in order

1. Order Acceptable
2. Pro-Forma Invoice
3. Check Inventory
4. Material Received
5. Pre-Invoice
6. Debit Note (Inv.)
7. Make Invoice
8. Calibration Certificate
9. Packaging and Transport
10. Bilty Upload
11. Client Confirmation
12. Debit Note (terminal, payment_mode=na only)
13. Order Cancel (cross-cutting utility, not a pipeline stage)
14. Settings

---

## Chronological Work Log

### 1. UI polish (early session)
- Debit Note (Inv.) page: single-card layout, Pending/History tabs + Search + Refresh + Column Visibility sab ek row me header me, `p-2` padding.
- Card height fix (`h-[calc(100vh-5rem)]` pattern), search placeholder dynamic (active tab ke searchable columns se), "Powered by Botivate" sidebar block → global fixed `components/layout/footer.tsx` (har page pe dikhta hai, `main-layout.tsx` me render).
- Sidebar Logout button → gradient red (`bg-gradient-to-r from-red-500 to-rose-600`).

### 2. Settings overhaul
- User Management: professional card+tabs redesign; admin role select karne pe auto-all-pages assign (`handleRoleChange`).
- TAT Management: Add/Edit modal me Days/Hours/Minutes inputs, helper functions `app/settings/tat-helpers.ts` (`minutesToDHM`, `dhmToMinutes`, `formatDHM`).
- Columns reorder: Users → Actions, Full Name, Username, Password (masked+eye toggle), Role, Page Access. TAT → S No., Stage Name, TAT Duration, Description (raw minutes field completely hata diya, sirf formatted duration).
- **TAT ko actual planned-date calculations me wire kiya** — pehle sab hardcoded fixed-day offsets the, ab `otp_stage_tat` se dynamically lookup hota hai (`lib/tat.ts` + do Postgres trigger functions `Database/34_wire_tat_into_planned_dates.sql`).
- `otp_stage_tat` table discover hua ki **kabhi bani hi nahi thi** production me (dead/abandoned earlier schema design) — fresh create ki `Database/33_otp_stage_tat.sql` real 9 stages ke saath.

### 3. Order Acceptable bug fix + rollout to all stages
- Bug: Pending tab me card "half" dikhta tha, History me "lower half" — root cause: Radix Tabs `hidden` attribute Tailwind `.flex` se overridden ho raha tha (dono panels simultaneously visible, height split ho rahi thi).
- Fix: `data-[state=inactive]:hidden` add kiya, plus "Google Sheets" text references generic "loading"/"fetching" me badal diye.
- Same dono fixes **9 stages** me rollout kiya (Dashboard/Settings chhod ke).

### 4. Settings Dropdown tab
- `otp_dropdown` table (category, value, sort_order) frontend se manage karne ke liye naya tab add kiya. Category format `word1_word2` → display `Word1-Word2` (`formatCategoryLabel()`).
- Rule: naye categories create nahi kar sakte, sirf existing categories me values add/edit/delete.
- Redesign: flat table → per-category card-grid (reference image ke hisaab se), Sort Order field completely remove kiya ("sort order ka use ni hai").

### 5. Quotation Copy + Dashboard linking
- `mapOrderAcceptableRowToUI` me `quotationCopy: order.quotation_copy || ""` missing tha — add kiya.
- Dashboard poori tarah dead legacy views (`otp_v_order_full`, `otp_v_dispatch_full`) pe based tha jo exist hi nahi karti thi — poora rebuild kiya: naya `app/api/otp-supabase/dashboard/route.ts` (10 real tables se aggregate), naya `hooks/use-dashboard-data.ts`, naya `app/dashboard/page.tsx` (KPI cards, pipeline funnel, recharts charts).

### 6. Naya stage: Packaging and Transport
- `Database/35_otp_packaging_transport.sql` — pehle Calibration Certificate ke baad chained tha.
- **Redesign**: user ne bola ki Make Invoice se hi directly parallel branch honi chahiye (Calibration ke saath saath, sequential nahi) — `Database/36_packaging_transport_off_make_invoice.sql` se repoint kiya `otp_make_invoice.packaging_transport_planned` pe, FK bhi `make_invoice_id` pe.
- **Draft-save feature** (`Database/39_packaging_transport_draft_save.sql`): form me pehle sirf Before Photo upload kar ke "Save Photos" kar sakte ho (order Pending me hi rehta hai, `status='draft'`), baad me dubara khol ke baaki details bhar ke "Submit" karo to hi History me jaata hai (`status='submitted'`) aur tabhi `bilty_upload_planned` set hota hai.
- **Transportation Details simplify** (`Database/40_...sql`): sirf 4 fields — Assigned Driver (dropdown, `otp_dropdown` category=`assign_driver_for_dispatch`), Driver Contact, Expense Amount, Transporter's Remark. Bilty/Freight/Hamali/Parking fields hata diye (ab sirf Bilty Upload stage me capture hote hain, duplicate nahi).

### 7. Naya stage: Bilty Upload
- `Database/38_otp_bilty_upload.sql` — Packaging and Transport ke baad, TAT 1 day.
- Fields: Transporter Contact, Bilty No., Freight Charge*, Hamali/Parking Charge, Bilty Upload*, Transporter's Remark.

### 8. Pre-Invoice: Debit Note (Inv.) Yes/No choice
- `Database/37_pre_invoice_debit_note_choice.sql` — Pre-Invoice form me naya dropdown "Debit Note (Inv.) Required". YES → `debit_note_planned` set (Debit Note (Inv.) stage se hoke jaata hai). NO → seedha `make_invoice_planned` set (Debit Note (Inv.) skip).
- Make Invoice ke Pending me is choice ka color-coded "Debit Note" column bhi add kiya (amber=YES, green=NO).

### 9. Naya stage: Client Confirmation
- `Database/42_otp_client_confirmation.sql` — Bilty Upload ke baad, TAT 1 day.
- Fields: Material Received (Yes/No dropdown)*, Site-Person Name*, Contact Number* — sab required, `*` mark ke saath.

### 10. Order Cancel — plan analysis se implementation tak
- User ne ek purana `implementation_plan.md` diya tha analyze karne ke liye — usme kai factual galtiyan mili (`otp_order_cancel` table exist hi nahi karti thi jabki plan "Already exists" bol raha tha; Order Acceptable/Check Inventory ka "pending" logic galat samjha gaya tha; `otp_dispatches` table legacy warehouse app se copy thi jo is project me exist hi nahi karti).
- **Corrected approach**: "planned date IS NULL → stage ki Pending se gayab" invariant hi reuse kiya, koi cascade logic ki zarurat nahi padi (pipeline strictly sequential hai per-wave).
- `Database/41_otp_order_cancel.sql` — naya `otp_order_cancel` log table, `otp_material_shortage`/`otp_pre_invoice_queue` CHECK constraints me `'cancelled'` status add kiya.
- `app/api/otp-supabase/cancel/route.ts` — GET order-scoped har 11 stage ka pending-check karta hai, POST selected stages cancel karta hai (planned-column null ya row-status cancelled, Packaging & Transport draft-row special-case delete).
- **UI redesign**: pehle 2-tab tha (Cancel Order form + Cancel Log), user ne bola sirf ek view (Cancel Log table + search filter) rakho, top-right "Cancel Order" button se Modal khule.
- **Form table redesign**: "Select stage(s)" checkbox-list → proper table (Checkbox | Stage Name | Item List button), modal width `max-w-lg` → `max-w-2xl`. Item List button uss specific wave ka item/qty dikhata hai (backend `normalizeItems()` helper).
- **Important finding**: ek hi order ke multiple independent "waves" (partial shipments) ek saath alag-alag stages me pending ho sakte hain — ye bug nahi, genuine business behavior hai.

### 11. Order Acceptable / Check Inventory column cleanup
- Reference Name, Email, Freight Type — completely remove kiye (dono Pending aur History se, spread ki wajah se automatic).
- Offer Show, Conveyed For Registration Form — list me rakhe lekin default-hidden (`DEFAULT_HIDDEN_COLUMNS` Set).

### 12. User Roles + CRM Name system (biggest single task)
User ne poocha "user roles kya hain, kis role ko kitna access, crm_name ka use kya hai" — uske baad 3 changes maange:

1. **`super_admin` role remove** — `Database/43_users_crm_name_access.sql` se CHECK constraint se hataya (koi existing user use nahi kar raha tha). Code se (`auth-provider.tsx`, `settings/page.tsx`, `order-acceptable`, `check-inventory`) sab references hataye.

2. **CRE Name → CRM Name bug fix + rename** — root cause: `mapOrderAcceptableRowToUI` mapper me `crmName` field hi missing tha (sirf isi mapper me, baaki sab me tha) — isliye Order Acceptable pe hamesha blank dikhta tha. `lib/otp-utils.ts` ke **sabhi 21 mapper functions** me consistently `crmName: order.crm_name || ""` add kiya (companyName line ke baad, replace_all se). "CRE Name" label → "CRM Name" rename kiya.

3. **CRM Name filter + access-control — sabhi 12 stages me**:
   - Naya `lib/crm-access.ts` — `filterByCrmAccess()` (admin unrestricted, user sirf assigned crm names), `crmNameOptionsFrom()`.
   - Naya `/api/otp-supabase/crm-names/route.ts` — distinct `otp_orders.crm_name` values.
   - Har stage page me "CRM Name" filter dropdown + column add kiya (Order Acceptable, Pro-Forma Invoice, Check Inventory, Material Received, Pre-Invoice, Debit Note (Inv.), Make Invoice, Calibration, Packaging & Transport, Bilty Upload, Client Confirmation, Debit Note).
   - Settings User Management me naya **"CRM Name Access" multi-select checkbox section** (Page Access jaisa hi pattern, admin ke liye auto-locked-all) — `otp_users.assigned_crm_names text[]` column.
   - Purana ad-hoc username-matching access-control (jo sirf Order Acceptable/Check Inventory me tha) replace kar diya isi naye consistent CRM-Name-based system se.
   - **Live verify kiya**: test restricted user (role=user, sirf 'KHUSHI' assigned) bana ke login kiya — sirf 31 KHUSHI-wale orders dikhe (89 me se), baaki sidebar pages bhi sirf assigned wale dikhe.

---

## Key Files Reference

| Purpose | File |
|---|---|
| Stage TAT config (frontend) | `app/settings/tat-helpers.ts` |
| Stage TAT lookup (backend) | `lib/tat.ts` |
| Row → UI mappers | `lib/otp-utils.ts` |
| CRM access control | `lib/crm-access.ts` |
| Sidebar nav | `components/layout/sidebar.tsx` |
| Auth context | `components/auth-provider.tsx` |
| Settings (Users/TAT/Dropdown) | `app/settings/page.tsx` |
| Dropdown category label helper | `app/settings/dropdown-helpers.ts` |
| Global footer | `components/layout/footer.tsx` |
| Migrations | `Database/*.sql` (01 se 43 tak, sequential) |

## Known Dead/Out-of-Scope Pages (touch mat karna bina explicit ask ke)

`app/senior-approval/page.tsx`, `app/warehouse-material/page.tsx` — sidebar me nahi hain, purane abandoned schema design se leftover (dead views/tables reference karte hain), `mapOrderRowToUI`/`mapDispatchRowToUI` inhi ke liye hain.

## Standing Conventions

- Har naya stage: migration (planned column on parent + naya child table + otp_stage_tat seed row) → API route (`getStageTatMinutes`/`addTatMinutes` pattern) → mapper (Pending + History) → page.tsx (Card+Tabs single-view pattern, `data-[state=inactive]:hidden`) → sidebar entry → Settings `allSteps` entry.
- Har change ke baad: `npx tsc --noEmit` clean confirm karo, live DB pe `DO-TEST-*` rows se end-to-end verify karo, phir turant cleanup.
- User se Hinglish me baat hoti hai, responses bhi usi tarah dene hain.
