# Regression Testing Guide

This document explains the regression testing strategy for the TaskBounty project to prevent previously fixed bugs from reappearing in future releases.

## Overview

Regression tests are a critical safety net that ensures fixes for resolved issues remain functional as the codebase evolves. When a bug is fixed, we add tests that verify the fix stays in place, preventing regressions.

## Structure

Regression tests are located in:
- **Primary suite**: `frontend/src/test/regression.test.ts` - Centralized regression test file
- **Dedicated suites**: Individual test files for complex regressions (e.g., `security-headers.test.ts` for issue #82)

## Currently Tracked Issues

### Issue #82: Security Headers Implementation
- **Bug**: Security headers (CSP, HSTS, X-Frame-Options, etc.) were not properly configured
- **Fix**: Implemented comprehensive security headers in `next.config.ts`
- **Test location**: `frontend/src/lib/security-headers.test.ts`
- **Regression check**: `frontend/src/test/regression.test.ts` (verifies module exists)

### Issue #83: Form Accessibility Improvements
- **Bug**: Forms lacked proper accessibility attributes (label associations, aria-required, etc.)
- **Fix**: Added comprehensive accessibility attributes to all forms
- **Test locations**: 
  - `frontend/src/components/TaskFilter.test.tsx`
  - `frontend/src/app/(marketing)/landing/components/WaitlistHeroSection.test.tsx`
- **Regression check**: `frontend/src/test/regression.test.ts` (verifies accessibility tests exist)

### Issue #84: Lint Check Enforcement in CI
- **Bug**: Lint failures were not blocking CI, allowing code with linting errors to merge
- **Fix**: Updated `.github/workflows/frontend-ci.yml` to enforce lint checks
- **Test location**: `.github/workflows/frontend-ci.yml`
- **Regression check**: `frontend/src/test/regression.test.ts` (verifies lint script exists)

## Adding New Regression Tests

When you fix a bug, follow these steps to add regression coverage:

### 1. Document the Issue
In the regression test file, add a new `describe` block with:
```typescript
describe("Regression: Issue #XXX - [Issue Title]", () => {
  // Bug description
  // Fix description
  // Related files/PRs
});
```

### 2. Write Regression Tests
Add tests that verify the fix remains in place:
```typescript
it("should prevent [specific bug from reoccurring]", () => {
  // Test implementation
});

it("should maintain [specific fix behavior]", () => {
  // Test implementation
});
```

### 3. Consider Dedicated Test Files
For complex fixes, create a dedicated test file instead of adding to the main regression suite:
- If the fix involves multiple components or complex logic
- If the test suite would be large (>50 lines)
- If the fix is security-critical or high-risk

### 4. Update CI Configuration
If the regression test is in a separate file, ensure it's covered by the existing test command. The main regression suite is explicitly run in CI via:
```yaml
- name: Run regression tests
  run: pnpm test -- src/test/regression.test.ts
```

### 5. Update Documentation
- Add the issue to the "Currently Tracked Issues" section in this file
- Reference any related documentation files
- Note the test locations

## Running Regression Tests

### Run all regression tests:
```bash
cd frontend
pnpm test -- src/test/regression.test.ts
```

### Run specific regression suite:
```bash
cd frontend
pnpm test -- src/test/regression.test.ts -t "Issue #82"
```

### Run all tests (includes regression):
```bash
cd frontend
pnpm test
```

## CI Integration

Regression tests are automatically run in CI via `.github/workflows/frontend-ci.yml`:
1. **Unit and E2E tests**: Runs all tests including regression tests
2. **Regression tests**: Explicitly runs the main regression suite for visibility

Both steps must pass for a PR to merge (assuming branch protection is configured).

## Best Practices

### DO:
- Add regression tests for every bug fix
- Reference the specific issue number in test descriptions
- Document what the bug was and how it was fixed
- Keep regression tests focused on preventing the specific bug
- Update this documentation when adding new regression tests

### DON'T:
- Add regression tests for features that haven't had bugs
- Remove regression tests without a compelling reason
- Make regression tests overly complex
- Forget to update CI if adding new regression test files

## Maintenance

### When to Remove Regression Tests
Regression tests should generally remain indefinitely. However, consider removal if:
- The feature being tested is completely removed
- The test is obsolete due to a major architectural change
- The test is duplicating newer, more comprehensive tests

### When to Update Regression Tests
Update regression tests when:
- The fix implementation changes but the behavior should remain the same
- The test is flaky or unreliable
- Better testing patterns emerge that improve the regression check

## Related Documentation

- [SECURITY_HEADERS.md](SECURITY_HEADERS.md) - Security header specifications
- [FRONTEND_CI_GUIDE.md](FRONTEND_CI_GUIDE.md) - CI/CD processes
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions

## Questions?

If you have questions about regression testing or need guidance on adding regression tests for a specific issue, refer to the existing test suites in `frontend/src/test/regression.test.ts` as examples.
