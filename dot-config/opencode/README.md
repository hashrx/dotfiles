# OpenCode Custom Tools & Agents

Custom tools and specialized agents for OpenCode to enhance commit management, build automation, and monorepo workflows.

## Overview

This repository provides two main categories of functionality:

1. **Custom Tools**: Reusable functions exposed to OpenCode for build system detection, git operations, and monorepo management
2. **Specialized Agents**: Orchestrators and workers for complex workflows like commit history cleanup and legacy file migration

## Features

### Build & Test Tools
- Auto-detect build systems (npm, pnpm, yarn, bun, turbo, nx)
- Run builds, tests, and type checking with proper dependency handling
- Monorepo-aware command generation
- Package dependency analysis

### Git & Commit Tools
- Commit history analysis and manipulation
- Safe commit rewording with git-branchless integration
- Multi-branch commit detection
- Backup branch creation
- Monorepo package detection from file paths

### Specialized Agents
- **commit-cleanup**: Orchestrates atomic commit history rewrites
- **commit-analysis**: Analyzes commits and detects breaking changes
- **legacy-migration**: Non-breaking file migrations using /legacy pattern
- **commit-verifier**: Validates builds/tests after changes
- **commit-message**: Generates conventional commit messages
- **commit-rewriter**: Applies file changes atomically

## Installation

This is an OpenCode configuration directory. Place it in your OpenCode config location:

```bash
# Default location
~/.config/opencode/
```

Install dependencies:

```bash
bun install
```

## Usage

### Custom Tools in OpenCode

The tools are automatically available in OpenCode sessions. Examples:

#### Detect Build System
```typescript
// OpenCode will call this tool
build-test_detectBuildSystem({ packagePath: "./packages/core" })
```

#### Run Tests
```typescript
build-test_runTest({ packagePath: "./packages/app" })
```

#### Get Package Dependencies
```typescript
build-test_getPackageDependencies({ packageName: "@myorg/core" })
```

#### Git Operations
```typescript
// Get commits to rewrite
git-commit_getCommitsToRewrite({ defaultBranch: "main" })

// Detect monorepo structure
git-commit_detectMonorepo()

// Find package for a file
git-commit_getPackageForFile({ filePath: "packages/core/src/index.ts" })

// Reword a commit
git-commit_rewordCommit({ 
  commitSha: "abc123", 
  newMessage: "feat: add new feature" 
})
```

### Specialized Agents

Agents are invoked through OpenCode's Task tool:

#### Clean Up Commit History
```
User: "Clean up my commits on feature/new-api"
OpenCode: Uses @commit-cleanup agent
```

The agent will:
1. Analyze commits and detect breaking changes
2. Present a plan (with /legacy migration if needed)
3. Execute atomic commits with verification
4. Clean up legacy directories
5. Verify final state

#### Migrate Breaking Changes
```
User: "Migrate src/api/client.ts with breaking changes"
OpenCode: Uses @legacy-migration agent
```

The agent will:
1. Move file to `/legacy` subdirectory
2. Update all imports, mocks, re-exports
3. Stage changes for atomic commit

## Development

### Project Structure

```
.
├── tool/                  # Custom tools
│   ├── build-test.ts     # Build system & test tools
│   └── git-commit.ts     # Git operation tools
├── agent/                 # Specialized agents
│   ├── commit-cleanup.md # Orchestrator agent
│   ├── commit-analysis.md
│   ├── legacy-migration.md
│   ├── commit-verifier.md
│   ├── commit-message.md
│   └── commit-rewriter.md
├── tests/                 # Test suites
│   ├── build-test.test.ts
│   ├── git-commit.test.ts
│   └── types.ts
└── package.json
```

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/build-test.test.ts

# Watch mode
bun test --watch

# Type check
bun run typecheck
```

### Writing New Tools

Tools use the `@opencode-ai/plugin` API:

```typescript
import { tool } from "@opencode-ai/plugin";

export const myTool = tool({
  description: "What this tool does",
  args: {
    myArg: tool.schema.string().describe("Argument description"),
  },
  async execute(args) {
    // Implementation
    return JSON.stringify({ result: "success" });
  },
});
```

### Writing New Agents

Agents are markdown files with frontmatter:

```markdown
---
description: What the agent does
temperature: 0.3
tools:
  bash: true
  edit: true
permissions:
  bash:
    "git *": allow
    "*": deny
---

# Agent Instructions

Your instructions here...
```

## Architecture

### Build System Detection

The build system detector uses a cache to avoid repeated filesystem checks. It:
1. Detects package managers (npm, pnpm, yarn, bun)
2. Identifies monorepo tools (turbo, nx, lerna)
3. Generates appropriate commands with workspace/filter syntax
4. Prioritizes Turbo for automatic dependency building

### Commit Cleanup Workflow

The commit cleanup orchestrator follows a strict phase-based approach:

1. **Setup**: Get commit range, create backup branch
2. **Planning**: Analyze commits, detect breaking changes, get approval
3. **Execution**: Apply changes atomically with verification
4. **Cleanup**: Remove /legacy directories if pattern was used
5. **Verification**: Compare with backup, final build/test check

### Legacy Migration Pattern

For files with breaking changes and existing importers:

1. Move file to `/legacy` subdirectory (preserves git history)
2. Update all references (imports, mocks, re-exports, package.json)
3. Add new file with breaking changes
4. Migrate consumers incrementally (one per commit)
5. Remove `/legacy` directory

This ensures each commit builds and tests successfully.

## Configuration

### Cache Management

Build system detection is cached. To clear:

```typescript
import { clearBuildSystemCache } from "./tool/build-test";
clearBuildSystemCache();
```

### Custom Build Commands

Override auto-detected commands:

```typescript
build-test_runBuild({ 
  packagePath: "./packages/core",
  buildCommand: "bun run custom-build"
})
```

## Troubleshooting

### Tests Failing

```bash
# Clear test repos
rm -rf tests/__test-*

# Run with verbose output
bun test --verbose
```

### Build Detection Issues

The detector looks for:
- Package manager lockfiles (pnpm-lock.yaml, yarn.lock, bun.lockb)
- Monorepo config files (turbo.json, nx.json, lerna.json)
- Workspace configuration in package.json

Ensure these files exist at the project root.

### Git-Branchless Integration

For commit rewording, ensure git-branchless is installed:

```bash
# macOS
brew install git-branchless

# Or cargo
cargo install git-branchless
```

## Examples

### Example 1: Detect and Build

```typescript
// Detect build system
const info = await detectBuildSystem.execute({});
console.log(JSON.parse(info));
// { found: true, packageManager: "pnpm", monorepoTool: "turbo", ... }

// Run build
const result = await runBuild.execute({});
console.log(JSON.parse(result));
// { success: true, duration: 1234, ... }
```

### Example 2: Analyze Dependencies

```typescript
const deps = await getPackageDependencies.execute({ 
  packageName: "@myorg/core" 
});
console.log(JSON.parse(deps));
// {
//   found: true,
//   dependencies: ["lodash", "react"],
//   dependents: [
//     { name: "@myorg/app", path: "./packages/app" }
//   ]
// }
```

### Example 3: Clean Up Commits

In OpenCode:
```
User: "Clean up my last 5 commits into atomic changes"

OpenCode: → @commit-cleanup
- Creates backup branch
- Analyzes commits
- Presents plan
- Executes with verification
```

## Contributing

When adding new features:

1. Write tests first (tests/*.test.ts)
2. Implement the tool/agent
3. Update this README
4. Run full test suite
5. Update agent documentation if needed

## License

Part of the OpenCode ecosystem.

## Support

For issues or questions about OpenCode: https://github.com/sst/opencode
