# AIRA backend alignment audit and repair report

## Confirmed issues in the uploaded ZIP

1. **Assessment DELETE route blocked by dependencies**: `app/api/water-assessments/[id]/route.js` previously refused deletion if recommendations or Assistant interactions existed. This prevented the history Delete control from working for linked records. The repair now invokes a transactional ownership-checked RPC.
2. **Admin final availability was not passed into the review RPC**: route and action supplied `availabilityStatus`, but service previously ignored it and called the 3-argument RPC. Repair adds the 4-argument wrapper and service call. The wrapper uses the existing review RPC as the core decision workflow.
3. **Admin water-point DELETE contradicted soft-delete docs**: service and Server Action physically deleted rows, while docs/UI described deactivation. Repair changes these paths to `is_active=false`.
4. **ERD contribution-review table was stale**: DBML referenced the legacy `contribution_reviews` table. Repair replaces it with `water_point_contribution_reviews` and fields present in the recent review schema.
5. **Docs had inconsistencies**: links and file naming in README were stale; API docs needed to describe the assessment delete semantics and admin water-point deactivation.

## Files patched

- `app/api/water-assessments/[id]/route.js` — DELETE now calls transactional RPC.
- `components/dashboard/kondisi-air/RiwayatPerhitungan.jsx` — confirmation text explains associated data deletion.
- `services/contributionService.js` — passes admin final availability to the 4-argument RPC.
- `app/actions/admin-verifikasi.js` — revalidates review-related paths after success.
- `services/waterPointAdminService.js` — water point DELETE becomes soft deactivation.
- `app/actions/admin-titik-air.js` — aligns action delete with deactivation.
- `app/api/admin/water-points/[id]/route.js` — response message reflects deactivation.
- `docs/aira-core.erd.dbml` — uses the active review-history table.
- `database/AIRA_BACKEND_ALIGNMENT.sql` — database functions.
- `docs/DB_MIGRATION_GUIDE.md` — preflight, migration, and verification steps.
- `README.md`, `docs/API.md`, `docs/BACKEND_TECHNICAL.md`, `docs/DB_SCHEMA_AUDIT.md`, `docs/UAT_CHACKELIST.md` — documentation updates.

## Validation performed on the supplied ZIP

- `npm test`: 34 tests passed, 4 tests failed before repair in the existing suite. Failures are in recommendation/AI test cases: missing rainfall test fixture, mocked AI fallback expectation, sentence validation expectation, and cache-count expectation. These are not presented as fixed by this patch.
- `npm run lint`: could not run because ESLint executable/dependencies were not installed in the extracted ZIP environment (`eslint: not found`).
- Build was not verified for the same dependency-install limitation.
- No live Supabase database was accessed. SQL was authored from the supplied code/schema documentation and needs preflight and live UAT before production.

## UAT required

1. Run migration preflight queries.
2. Apply SQL migration.
3. Test deleting assessment without dependents and with recommendations/Assistant interactions.
4. Verify deletion affects only the authenticated user's assessment and directly linked dependent records.
5. Test review approval with availability choices `available`, `limited`, `unavailable`, `unknown`.
6. Test rejected and needs_revision paths; availability override is not sent for these statuses.
7. Test Admin point deactivation and verify it no longer appears in public active listing, but remains in database.
8. Run `npm install`, `npm test`, `npm run lint`, `npm run build` locally.
