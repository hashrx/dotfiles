import { tool } from "@opencode-ai/plugin";
import { $ } from "bun";

/**
 * Get the default branch name (main or master)
 *
 * Determines the default branch by:
 * 1. Querying the remote origin
 * 2. Checking symbolic refs
 * 3. Falling back to "main"
 *
 * @example
 * ```typescript
 * const branch = await getDefaultBranch.execute({});
 * // Returns: "main" or "master"
 * ```
 *
 * @returns Default branch name as a plain string
 */
export const getDefaultBranch = tool({
  description: "Get the default branch name for the repository",
  args: {},
  async execute() {
    try {
      // Try to get default branch from remote
      const result = await $`git remote show origin`.text();
      const match = result.match(/HEAD branch: (.+)/);
      if (match) {
        return match[1].trim();
      }
    } catch (error) {
      // Fall back to checking symbolic ref
      try {
        const result =
          await $`git symbolic-ref refs/remotes/origin/HEAD`.text();
        const branch = result.replace("refs/remotes/origin/", "").trim();
        if (branch) {
          return branch;
        }
      } catch {}
    }

    // Default fallback
    return "main";
  },
});

/**
 * Get commits not in default branch
 *
 * Lists all commits on the current branch that are not in the default branch.
 * Useful for finding commits that are candidates for rewriting or cleanup.
 *
 * @example
 * ```typescript
 * const result = await getCommitsToRewrite.execute({
 *   defaultBranch: "main",
 *   currentBranch: "feature/new-api"
 * });
 * // Returns: {
 * //   defaultBranch: "main",
 * //   currentBranch: "feature/new-api",
 * //   commitCount: 5,
 * //   commits: ["abc123", "def456", ...]
 * // }
 * ```
 *
 * @returns JSON string with commit list and metadata
 */
export const getCommitsToRewrite = tool({
  description: "Get list of commits that are not in the default branch",
  args: {
    defaultBranch: tool.schema
      .string()
      .optional()
      .describe("Default branch name (will be detected if not provided)"),
    currentBranch: tool.schema
      .string()
      .optional()
      .describe("Current branch name (will be detected if not provided)"),
  },
  async execute(args) {
    const defaultBranch =
      args.defaultBranch || (await getDefaultBranch.execute({}, {} as any));
    const currentBranch =
      args.currentBranch || (await $`git branch --show-current`.text()).trim();

    // Get commit hashes
    const commits =
      await $`git log ${defaultBranch}..${currentBranch} --format=%H`.text();
    const commitList = commits.trim().split("\n").filter(Boolean);

    return JSON.stringify(
      {
        defaultBranch,
        currentBranch,
        commitCount: commitList.length,
        commits: commitList,
      },
      null,
      2,
    );
  },
});

/**
 * Check if commits exist on multiple branches
 *
 * Verifies whether any of the provided commits exist on more than one branch.
 * This is a safety check before rewriting history to prevent accidentally
 * modifying commits that are shared across branches.
 *
 * @example
 * ```typescript
 * const result = await checkMultiBranchCommits.execute({
 *   commits: ["abc123", "def456"]
 * });
 * // Returns: {
 * //   hasMultiBranchCommits: true,
 * //   multiBranchCommits: [
 * //     { commit: "abc123", branches: ["main", "develop"] }
 * //   ]
 * // }
 * ```
 *
 * @returns JSON string with multi-branch commit information
 */
export const checkMultiBranchCommits = tool({
  description: "Check if any commits exist on multiple branches",
  args: {
    commits: tool.schema
      .array(tool.schema.string())
      .describe("Array of commit SHAs to check"),
  },
  async execute(args) {
    const multiBranchCommits: Array<{
      commit: string;
      branches: string[];
    }> = [];

    for (const commit of args.commits) {
      try {
        const branchList = await $`git branch --contains ${commit}`.text();
        const branches = branchList
          .split("\n")
          .map((b) => b.replace("*", "").trim())
          .filter(Boolean);

        if (branches.length > 1) {
          multiBranchCommits.push({
            commit,
            branches,
          });
        }
      } catch (error) {
        // Commit might not exist, skip
      }
    }

    return JSON.stringify(
      {
        hasMultiBranchCommits: multiBranchCommits.length > 0,
        multiBranchCommits,
      },
      null,
      2,
    );
  },
});

/**
 * Get detailed commit information
 *
 * Retrieves comprehensive information about commits in a range, including:
 * - Author, date, subject
 * - Files changed with their status (A/M/D)
 * - Statistics (files changed, insertions, deletions)
 *
 * @example
 * ```typescript
 * const result = await getCommitDetails.execute({
 *   commitRange: "main..HEAD"
 * });
 * // Returns: {
 * //   totalCommits: 3,
 * //   commits: [
 * //     {
 * //       hash: "abc123",
 * //       author: "John Doe",
 * //       subject: "Add feature",
 * //       files: [{ status: "M", path: "src/index.ts" }],
 * //       stats: { filesChanged: 1, insertions: 10, deletions: 2 }
 * //     }
 * //   ]
 * // }
 * ```
 *
 * @returns JSON string with detailed commit information
 */
export const getCommitDetails = tool({
  description: "Get detailed information about commits including files changed",
  args: {
    commitRange: tool.schema
      .string()
      .describe("Commit range (e.g., 'abc123..HEAD' or 'HEAD~5..HEAD')"),
  },
  async execute(args) {
    // Get commit list with metadata
    const commitLog =
      await $`git log ${args.commitRange} --format='%H|%an|%ae|%ad|%s' --date=iso`.text();
    const commits = commitLog
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, author, email, date, ...subjectParts] = line.split("|");
        return {
          hash,
          author,
          email,
          date,
          subject: subjectParts.join("|"),
        };
      });

    // Get file changes for each commit
    const commitsWithFiles = await Promise.all(
      commits.map(async (commit) => {
        const fileStatus =
          await $`git show ${commit.hash} --name-status --format=''`.text();
        const files = fileStatus
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => {
            const [status, ...pathParts] = line.split("\t");
            return {
              status: status.trim(),
              path: pathParts.join("\t"),
            };
          });

        const stats =
          await $`git show ${commit.hash} --stat --format=''`.text();
        const statsMatch = stats.match(
          /(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/,
        );

        return {
          ...commit,
          files,
          stats: {
            filesChanged: statsMatch ? parseInt(statsMatch[1]) : 0,
            insertions:
              statsMatch && statsMatch[2] ? parseInt(statsMatch[2]) : 0,
            deletions:
              statsMatch && statsMatch[3] ? parseInt(statsMatch[3]) : 0,
          },
        };
      }),
    );

    return JSON.stringify(
      {
        commitRange: args.commitRange,
        totalCommits: commits.length,
        commits: commitsWithFiles,
      },
      null,
      2,
    );
  },
});

/**
 * Create a backup branch
 *
 * Creates a timestamped backup branch at the current HEAD.
 * Essential safety measure before performing commit history rewrites.
 *
 * @example
 * ```typescript
 * const result = await createBackupBranch.execute({
 *   prefix: "backup"
 * });
 * // Returns: {
 * //   branchName: "backup-2024-01-15-143022",
 * //   message: "Created backup branch: backup-2024-01-15-143022"
 * // }
 * ```
 *
 * @returns JSON string with created branch name
 */
export const createBackupBranch = tool({
  description: "Create a backup branch with timestamp",
  args: {
    prefix: tool.schema
      .string()
      .optional()
      .default("backup")
      .describe("Prefix for backup branch name"),
  },
  async execute(args) {
    const timestamp =
      new Date().toISOString().replace(/[:.]/g, "-").split("T")[0] +
      "-" +
      new Date().toTimeString().split(" ")[0].replace(/:/g, "");
    const branchName = `${args.prefix}-${timestamp}`;

    await $`git branch ${branchName}`;

    return JSON.stringify(
      {
        branchName,
        message: `Created backup branch: ${branchName}`,
      },
      null,
      2,
    );
  },
});

/**
 * Detect monorepo structure
 *
 * Analyzes the project to determine if it's a monorepo and identifies:
 * - Monorepo tool in use (turbo, nx, lerna, pnpm, npm)
 * - All packages with their names and paths
 *
 * Checks for:
 * - turbo.json, nx.json, lerna.json
 * - pnpm-workspace.yaml
 * - workspaces in package.json
 *
 * @example
 * ```typescript
 * const result = await detectMonorepo.execute({});
 * // Returns: {
 * //   isMonorepo: true,
 * //   tool: "turbo",
 * //   packageCount: 5,
 * //   packages: [
 * //     { name: "@myorg/core", path: "./packages/core" }
 * //   ]
 * // }
 * ```
 *
 * @returns JSON string with monorepo information
 */
export const detectMonorepo = tool({
  description: "Detect if project is a monorepo and identify package structure",
  args: {},
  async execute() {
    let isMonorepo = false;
    let tool: string | null = null;
    const packages: Array<{ name: string; path: string }> = [];

    // Check for monorepo tools first (prioritize Turbo as it handles dependencies)
    if (await Bun.file("turbo.json").exists()) {
      isMonorepo = true;
      tool = "turbo";
    }

    if (await Bun.file("nx.json").exists()) {
      isMonorepo = true;
      tool = tool || "nx";
    }

    if (await Bun.file("lerna.json").exists()) {
      isMonorepo = true;
      tool = tool || "lerna";
    }

    // Check for package manager workspaces
    if (await Bun.file("pnpm-workspace.yaml").exists()) {
      isMonorepo = true;
      tool = tool || "pnpm";
    }

    // Check for monorepo indicators in package.json
    try {
      const packageJson = await Bun.file("package.json").text();
      const pkg = JSON.parse(packageJson);

      if (pkg.workspaces) {
        isMonorepo = true;
        tool = tool || "npm";

        // Get workspace packages
        const workspaces = Array.isArray(pkg.workspaces)
          ? pkg.workspaces
          : pkg.workspaces.packages || [];
        for (const pattern of workspaces) {
          // Simple glob expansion for common patterns
          if (pattern.includes("*")) {
            const baseDir = pattern.replace("/*", "");
            try {
              const dirs = await $`find ${baseDir} -maxdepth 1 -type d`.text();
              for (const dir of dirs.split("\n").filter(Boolean)) {
                if (
                  dir !== baseDir &&
                  (await Bun.file(`${dir}/package.json`).exists())
                ) {
                  const pkgData = JSON.parse(
                    await Bun.file(`${dir}/package.json`).text(),
                  );
                  packages.push({ name: pkgData.name || dir, path: dir });
                }
              }
            } catch {}
          } else {
            if (await Bun.file(`${pattern}/package.json`).exists()) {
              const pkgData = JSON.parse(
                await Bun.file(`${pattern}/package.json`).text(),
              );
              packages.push({ name: pkgData.name || pattern, path: pattern });
            }
          }
        }
      }
    } catch {}

    return JSON.stringify(
      {
        isMonorepo,
        tool,
        packageCount: packages.length,
        packages,
      },
      null,
      2,
    );
  },
});

/**
 * Get package for file path
 *
 * Determines which package a file belongs to in a monorepo by walking up
 * the directory tree to find the nearest package.json.
 *
 * Useful for:
 * - Organizing commits by package
 * - Determining which package to test after changes
 * - Analyzing impact of file changes
 *
 * @example
 * ```typescript
 * const result = await getPackageForFile.execute({
 *   filePath: "packages/core/src/index.ts"
 * });
 * // Returns: {
 * //   found: true,
 * //   packageName: "@myorg/core",
 * //   packagePath: "packages/core",
 * //   packageJson: { ... }
 * // }
 * ```
 *
 * @returns JSON string with package information
 */
export const getPackageForFile = tool({
  description: "Determine which package a file belongs to in a monorepo",
  args: {
    filePath: tool.schema.string().describe("File path to check"),
  },
  async execute(args) {
    let currentDir = args.filePath.includes("/")
      ? args.filePath.substring(0, args.filePath.lastIndexOf("/"))
      : ".";

    // Walk up directory tree, including root (.)
    while (true) {
      const packageJsonPath =
        currentDir === "." ? "package.json" : `${currentDir}/package.json`;
      if (await Bun.file(packageJsonPath).exists()) {
        const pkgData = JSON.parse(await Bun.file(packageJsonPath).text());
        return JSON.stringify(
          {
            found: true,
            packageName: pkgData.name,
            packagePath: currentDir,
            packageJson: pkgData,
          },
          null,
          2,
        );
      }

      // Stop if we're at root
      if (currentDir === "." || currentDir === "") break;

      // Go up one directory
      const parentDir = currentDir.substring(0, currentDir.lastIndexOf("/"));
      if (parentDir === currentDir) break;
      currentDir = parentDir || ".";
    }

    return JSON.stringify(
      {
        found: false,
        packageName: null,
        packagePath: null,
      },
      null,
      2,
    );
  },
});

/**
 * Reword a commit using git-branchless
 *
 * Changes the commit message of a specific commit using git-branchless,
 * which automatically rebases all descendant commits.
 *
 * Requires git-branchless to be installed.
 *
 * @example
 * ```typescript
 * const result = await rewordCommit.execute({
 *   commitSha: "abc123",
 *   newMessage: "feat: add new feature\n\nDetailed description here"
 * });
 * // Returns: {
 * //   success: true,
 * //   commitSha: "abc123",
 * //   message: "Successfully reworded commit abc123"
 * // }
 * ```
 *
 * @returns JSON string with success status and message
 */
export const rewordCommit = tool({
  description:
    "Reword a commit message using git-branchless (automatically rebases descendants)",
  args: {
    commitSha: tool.schema.string().describe("Commit SHA to reword"),
    newMessage: tool.schema
      .string()
      .describe("New commit message (title and optional body)"),
  },
  async execute(args) {
    try {
      // Verify commit exists
      await $`git rev-parse --verify ${args.commitSha}`;

      // Use git-branchless reword with the new message
      // git-branchless automatically handles rebasing descendant commits
      // -f flag allows rewriting commits (user should be aware of the implications)
      await $`git-branchless reword ${args.commitSha} -m ${args.newMessage} -f`.quiet();

      return JSON.stringify(
        {
          success: true,
          commitSha: args.commitSha,
          message: `Successfully reworded commit ${args.commitSha.substring(0, 7)}`,
        },
        null,
        2,
      );
    } catch (error: any) {
      return JSON.stringify(
        {
          success: false,
          commitSha: args.commitSha,
          error: error.message || String(error),
        },
        null,
        2,
      );
    }
  },
});
