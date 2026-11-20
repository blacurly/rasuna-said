# Navigasi Air contribution review: recommended admin workflow

1. Admin opens the pending queue and selects a contribution.
2. Review only four critical checks before approval: plausible name/source type, precise location/coordinates, evidence/source, and access/availability information.
3. For a **new point**, approve only after verifying the place; the database RPC should insert a `water_points` record and write its ID back to the contribution. For an **update point**, ensure the RPC updates the existing point and does not create a duplicate.
4. Admin selects final availability and then Approve. Reject or request revision when facts are incomplete; do not fill gaps as if they were real.
5. After approval, public listing should show the point only if `is_active=true`, `verification_status='verified'`, and `is_simulation=false` (if that filter is part of the project contract).
6. A deactivation in the admin list is a soft delete: preserve the point row and its contribution/review history.

## Recommended review fields
- contribution type (new/update), target point for update
- proposed name, category, administrative location, address, coordinates
- source link/evidence, submitter notes
- availability and access details (admin final values)
- reviewer, review timestamp, decision, reviewer notes

Use clearly labelled demo/simulation records for testing. Do not make synthetic submissions look like verified real-world reports.
