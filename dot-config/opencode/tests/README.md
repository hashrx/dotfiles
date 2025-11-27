# Testing Custom Tools

This directory contains comprehensive tests for the custom tools used by the commit cleanup agents.

**Note**: Test files are in a separate `tests/` directory to avoid being loaded by OpenCode as tools.

## Running Tests

From the OpenCode config directory (`~/.config/opencode`):

```bash
# Run all tests
cd ~/.config/opencode
bun run test

# Watch mode
bun run test:watch

# Run specific test suites
bun run test:git
bun run test:build
```

Or directly:

```bash
# Run all tests
bun test tests/*.test.ts

# Run specific test file
bun test tests/git-commit.test.ts
bun test tests/build-test.test.ts

# Watch mode
bun test --watch tests/*.test.ts
```

## Test Coverage

**34 tests total** with **115 assertions** - all passing ✓

### Git Commit Tools (`git-commit.test.ts`)

12 tests for all Git-related operations:

- **getDefaultBranch**: Detects main/master branch correctly
- **getCommitsToRewrite**: Finds commits not in default branch
- **checkMultiBranchCommits**: Detects commits on multiple branches (safety check)
- **getCommitDetails**: Retrieves detailed commit information with file changes
- **createBackupBranch**: Creates timestamped backup branches
- **detectMonorepo**: Detects monorepo structure and prioritizes Turbo
- **getPackageForFile**: Maps files to packages in monorepos

### Build & Test Tools (`build-test.test.ts`)

22 tests for build/test/type-check system detection and execution:

- **detectBuildSystem**: 
  - Detects npm, pnpm, yarn, bun projects
  - Prioritizes Turbo over package managers
  - Detects Nx monorepos
  - Detects TypeScript projects (tsconfig.json)
  - Identifies type check commands
  - Handles missing build scripts
  
- **runBuild**:
  - Executes build commands
  - Handles build failures with proper error reporting
  - Supports custom build commands
  - Measures build duration
  
- **runTest**:
  - Executes test commands
  - Handles test failures
  - Reports test duration

- **runTypeCheck** (NEW):
  - Detects TypeScript projects
  - Runs type checking with tsc or custom commands
  - Skips gracefully for non-TypeScript projects
  - Handles type check failures
  - Supports custom type check commands
  - Detects typecheck/type-check/tsc scripts
  
- **getPackageDependencies**:
  - Finds package dependencies
  - Identifies dependent packages (reverse dependencies)
  - Handles packages with no dependents

## Test Structure

Each test suite:

1. **Setup**: Creates a test repository/project
2. **Tests**: Runs isolated tests with proper cleanup
3. **Teardown**: Removes test artifacts

Tests use Bun's testing framework with:
- `describe` blocks for grouping
- `beforeAll`/`afterAll` for setup/teardown
- `test` for individual test cases
- `expect` for assertions

## Key Test Scenarios

### Safety Checks

- Multi-branch commit detection prevents rewriting shared history
- Backup branch creation ensures recovery is possible
- Error handling for invalid inputs

### Monorepo Support

- Turbo prioritization ensures dependency ordering
- Package detection maps files to packages
- Dependency graph analysis identifies dependents

### Build System Detection

- Correctly identifies package managers
- Prioritizes monorepo tools (Turbo > Nx > package managers)
- Uses proper filter syntax for each tool

### Error Handling

- Graceful failure when files don't exist
- Proper error messages for missing commands
- Exit code capture for failed builds/tests

## Adding New Tests

When adding new tools or modifying existing ones:

1. Add test cases to the appropriate test file
2. Ensure setup/teardown handles test artifacts
3. Test both success and failure cases
4. Verify error messages are helpful
5. Run tests to ensure they pass

Example test structure:

```typescript
describe("newTool", () => {
  test("should handle success case", async () => {
    // Setup
    // Execute
    // Assert
  });

  test("should handle error case", async () => {
    // Setup for error
    // Execute
    // Assert error handling
  });
});
```

## CI/CD Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Test Custom Tools
  run: bun run test
```

## Debugging Tests

To debug failing tests:

1. Check test output for error messages
2. Inspect test repository state (tests clean up, but can be modified)
3. Run single test file: `bun test tool/git-commit.test.ts`
4. Add console.log statements in tests
5. Use `test.only()` to run a single test

## Notes

- Tests create temporary directories (`__test-repo__`, `__test-build-repo__`)
- All tests clean up after themselves
- Tests change `process.cwd()` but restore it after
- Git operations use local test repositories (no remote operations)

## Troubleshooting

### "Command not found: git"
Ensure Git is installed and in PATH

### "Permission denied"
Check file permissions in test directories

### Tests timeout
Some operations (like creating git repos) may be slow on certain systems. Increase timeout if needed.

### Flaky tests
If tests fail intermittently:
1. Check for race conditions
2. Ensure proper cleanup between tests
3. Verify git operations complete before assertions
