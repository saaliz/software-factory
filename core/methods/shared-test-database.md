# One shared test database for every lane

For the orchestrator and a tooling session, when several lanes each start, migrate, seed and drop their own database for every test run, and the machine spends its minutes and memory there. Source: the School ERP trial, 25–26 November 2026.

**In trial: being built, not yet measured.** The owner approved the design on 25 November and it was not yet on the main branch when this was written. Do not adopt its gains; measure them (last section).

## The design

1. **One Postgres and one Redis** serve every lane's test runs and the walk environments. The app containers stay one for each walk environment. The owner's own development database stays apart.
2. **One shared test database at the main branch's schema.** Every lane's tests use it while their branch's migrations equal the main branch's.
3. **A shared seed, read only.** The catalogues and a base set of synthetic tenants are loaded once. The seed carries a checksum, checked before each run; a test that changed it, or a seed that drifts, fails the check.
4. **Each test writes in a tenant of its own.** It creates its own synthetic tenant and touches nothing else. This works only where tenancy is already a rule of the product; without it the design does not apply.
5. **A lane database only while its branch's migrations differ.** A branch that adds or edits a migration runs on its lane's own database, at its own schema, until the migration merges. Then the lane returns to the shared one.
6. **Migrations applied incrementally, never recreated.** A database keeps what it has; only the migrations it lacks are applied, through the migration tool's own history. A schema change is added or modified in place, never by dropping the database. **A rebuild only on divergence:** the database's history holds a migration the branch does not have (a removed or renamed one), and only that one database is rebuilt.
7. **Redis blocks per lane.** Each lane takes its own Redis database number, so keys never meet.
8. **A walk's reset clears only the walk's own tenant, plus the outbox and inbox tables.** It never truncates the database. The outbox and inbox are cleared because they hold work queued by earlier runs that another walk would otherwise send or skip.

## What stays as it was

- Sealed test files change only by a reseal, one package at a time after its work item merges; a work item in flight keeps its own setup until then.
- Every `always` proof row keeps its test and its control.

## Check and measure

- Before and after, on one module first: a test run's seconds and peak memory, and its sealed results. Extend to other modules only if the run is faster and the results are identical.
- Check: two lanes run tests at once on the shared database, and every failure they show also shows on a database of its own.
