# Dependency security override policy

This repository uses npm `overrides` only when a vulnerable transitive dependency cannot be remediated safely by upgrading the direct dependency within the current release scope.

## Current overrides

- `postcss` → `8.5.28`: keeps the existing PostCSS major line while moving the resolved transitive package beyond the vulnerable versions identified by dependency auditing.
- `deepmerge-ts` → `8.0.2`: moves the transitive package to a patched release. This is a major-version override and therefore requires compatibility validation in CI before release.

## Required controls

1. Identify the advisory and affected dependency path before adding an override.
2. Prefer an upstream direct-dependency release that removes the vulnerable transitive dependency. An override is a containment measure, not a substitute for normal dependency maintenance.
3. Keep the override as narrow as possible: pin a specific patched version rather than a broad range.
4. Commit `package.json` and the regenerated `package-lock.json` together. CI must use `npm ci` and must not silently rewrite or commit the lockfile.
5. Run dependency audit, lint, typecheck, unit tests, production build, and E2E tests after the override.
6. Verify that the lockfile resolves the intended patched versions and does not leave another vulnerable copy elsewhere in the dependency graph.
7. Record compatibility risk, affected dependency path, validation evidence, and the condition for removal in this document or the associated change record.
8. Reassess the override whenever the direct dependency is upgraded; remove the override once the upstream dependency graph is patched.
9. Do not treat a clean `npm audit` result as proof that the application is secure. Runtime reachability, application behavior, configuration, deployment controls, and code scanning remain separate release gates.

## Release rule

Security overrides are acceptable only when they are reproducible from the committed lockfile and the complete CI validation passes. Production release still requires independent verification of infrastructure, datastore residency, backups/restores, legal approvals, accessibility, and production smoke tests where those controls are part of the release checklist.
