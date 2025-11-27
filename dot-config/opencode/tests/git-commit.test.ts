import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { $ } from "bun";
import type { ToolContext } from "@opencode-ai/plugin";
import * as tools from "../tool/git-commit";
import * as path from "path";
import {
  CommitsToRewriteResult,
  MultiBranchCommitsResult,
  CommitDetailsResult,
  BackupBranchResult,
  MonorepoDetectionResult,
  PackageForFileResult,
} from "./types";

// Test repository path
const TEST_REPO = path.join(import.meta.dir, "__test-repo__");

// Mock context for tool execution
const mockContext: ToolContext = {
  agent: "test-agent",
  sessionID: "test-session",
  messageID: "test-message",
  abort: new AbortController().signal,
};

describe("Git Commit Tools", () => {
  beforeEach(async () => {
    // Create fresh git repo with initial commit before each test
    await $`rm -rf ${TEST_REPO}`.quiet();
    await $`mkdir -p ${TEST_REPO}`;
    await $`cd ${TEST_REPO} && git init`;
    await $`cd ${TEST_REPO} && git config user.name "Test User"`;
    await $`cd ${TEST_REPO} && git config user.email "test@example.com"`;
    await $`cd ${TEST_REPO} && echo "initial" > initial.txt`;
    await $`cd ${TEST_REPO} && git add initial.txt`;
    await $`cd ${TEST_REPO} && git commit -m "initial commit"`;
  });

  afterEach(async () => {
    // Clean up test repository after each test
    await $`rm -rf ${TEST_REPO}`.quiet();
  });

  describe("getDefaultBranch", () => {
    test("should return default branch name", async () => {
      const originalCwd = process.cwd();
      process.chdir(TEST_REPO);

      try {
        const branch = await tools.getDefaultBranch.execute({}, mockContext);
        // Returns a plain string, not JSON
        expect(branch).toMatch(/^(main|master)$/);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe("getCommitsToRewrite", () => {
    test("should get commits not in default branch", async () => {
      const originalCwd = process.cwd();
      process.chdir(TEST_REPO);

      try {
        // Create a feature branch with new commits
        await $`git checkout -b feature`;
        await $`echo "feature" > test.txt`;
        await $`git add test.txt`;
        await $`git commit -m "feature commit"`;

        const resultStr = await tools.getCommitsToRewrite.execute(
          { currentBranch: "feature", defaultBranch: "main" },
          mockContext
        );
        const result = CommitsToRewriteResult.decode(resultStr);

        expect(result.defaultBranch).toBe("main");
        expect(result.currentBranch).toBe("feature");
        expect(result.commitCount).toBe(1);
        expect(result.commits).toHaveLength(1);
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("should handle when no commits to rewrite", async () => {
      const originalCwd = process.cwd();
      process.chdir(TEST_REPO);

      try {
        const resultStr = await tools.getCommitsToRewrite.execute(
          { currentBranch: "main", defaultBranch: "main" },
          mockContext
        );
        const result = CommitsToRewriteResult.decode(resultStr);

        expect(result.defaultBranch).toBe("main");
        expect(result.currentBranch).toBe("main");
        expect(result.commitCount).toBe(0);
        expect(result.commits).toHaveLength(0);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });


  describe("checkMultiBranchCommits", () => {
    test("should detect commits on multiple branches", async () => {
      const originalCwd = process.cwd();
      process.chdir(TEST_REPO);

      try {
        // Get the current commit hash
        const commitHash = (await $`git rev-parse HEAD`.text()).trim();

        // Create a new branch pointing to same commit
        await $`git branch test-branch`;

        const resultStr = await tools.checkMultiBranchCommits.execute(
          { commits: [commitHash] },
          mockContext
        );
        const result = MultiBranchCommitsResult.decode(resultStr);

        expect(result.hasMultiBranchCommits).toBe(true);
        expect(result.multiBranchCommits).toHaveLength(1);
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("should handle when no multi-branch commits", async () => {
      const originalCwd = process.cwd();
      process.chdir(TEST_REPO);

      try {
        // Create a commit on a branch
        await $`git checkout -b single-branch`;
        await $`echo "single" >> test.txt`;
        await $`git add test.txt`;
        await $`git commit -m "single branch commit"`;
        const commitHash = (await $`git rev-parse HEAD`.text()).trim();

        const resultStr = await tools.checkMultiBranchCommits.execute(
          { commits: [commitHash] },
          mockContext
        );
        const result = MultiBranchCommitsResult.decode(resultStr);

        expect(result.hasMultiBranchCommits).toBe(false);
        expect(result.multiBranchCommits).toHaveLength(0);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe("getCommitDetails", () => {
    test("should get detailed commit information", async () => {
      const originalCwd = process.cwd();
      process.chdir(TEST_REPO);

      try {
        // Create a second commit so we have a range to test
        await $`echo "details test" > details.txt`;
        await $`git add details.txt`;
        await $`git commit -m "test commit for details"`;

        const resultStr = await tools.getCommitDetails.execute(
          { commitRange: "HEAD~1..HEAD" },
          mockContext
        );
        const result = CommitDetailsResult.decode(resultStr);

        expect(result.commitRange).toBe("HEAD~1..HEAD");
        expect(result.totalCommits).toBeGreaterThan(0);
        expect(result.commits).toBeInstanceOf(Array);

        const commit = result.commits[0];
        expect(commit.hash).toBeTruthy();
        expect(commit.author).toBeTruthy();
        expect(commit.subject).toBeTruthy();
        expect(commit.files).toBeInstanceOf(Array);
        expect(commit.stats).toBeTruthy();
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe("createBackupBranch", () => {
    test("should create a timestamped backup branch", async () => {
      const originalCwd = process.cwd();
      process.chdir(TEST_REPO);

      try {
        const resultStr = await tools.createBackupBranch.execute(
          { prefix: "backup" },
          mockContext
        );
        const result = BackupBranchResult.decode(resultStr);

        expect(result.branchName).toContain("backup-");
        expect(result.message).toContain("Created backup branch");

        // Verify branch was created
        const branches = await $`git branch --list ${result.branchName}`.text();
        expect(branches).toContain(result.branchName);

        // Clean up
        await $`git branch -D ${result.branchName}`;
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe("detectMonorepo", () => {
    test("should detect non-monorepo project", async () => {
      const originalCwd = process.cwd();
      await $`cd ${TEST_REPO} && echo '{"name":"test"}' > package.json`;
      process.chdir(TEST_REPO);

      try {
        const resultStr = await tools.detectMonorepo.execute({}, mockContext);
        const result = MonorepoDetectionResult.decode(resultStr);

        expect(result.isMonorepo).toBe(false);
        expect(result.packageCount).toBe(0);
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("should detect pnpm workspace monorepo", async () => {
      const originalCwd = process.cwd();
      await $`cd ${TEST_REPO} && echo '{"name":"test"}' > package.json`;
      await $`cd ${TEST_REPO} && echo '{"pipeline":{"build":{}}}' > turbo.json`;
      process.chdir(TEST_REPO);

      try {
        const resultStr = await tools.detectMonorepo.execute({}, mockContext);
        const result = MonorepoDetectionResult.decode(resultStr);

        expect(result.isMonorepo).toBe(true);
        expect(result.tool).toBe("turbo");
      } finally {
        process.chdir(originalCwd);
        await $`rm ${TEST_REPO}/package.json ${TEST_REPO}/turbo.json`;
      }
    });

    test("should detect workspaces monorepo", async () => {
      const originalCwd = process.cwd();
      await $`mkdir -p ${TEST_REPO}/packages/pkg-a`;
      await $`cd ${TEST_REPO} && echo '{"name":"root","workspaces":["packages/*"]}' > package.json`;
      await $`cd ${TEST_REPO}/packages/pkg-a && echo '{"name":"@test/pkg-a"}' > package.json`;
      process.chdir(TEST_REPO);

      try {
        const resultStr = await tools.detectMonorepo.execute({}, mockContext);
        const result = MonorepoDetectionResult.decode(resultStr);

        expect(result.isMonorepo).toBe(true);
        expect(result.tool).toBe("npm");
      } finally {
        process.chdir(originalCwd);
        await $`rm -rf ${TEST_REPO}/packages`;
        await $`rm ${TEST_REPO}/package.json`;
      }
    });
  });

  describe("getPackageForFile", () => {
    test("should find package for file in root", async () => {
      const originalCwd = process.cwd();
      await $`cd ${TEST_REPO} && echo '{"name":"root-package"}' > package.json`;
      process.chdir(TEST_REPO);

      try {
        const resultStr = await tools.getPackageForFile.execute(
          { filePath: "test.txt" },
          mockContext
        );
        const result = PackageForFileResult.decode(resultStr);

        expect(result.found).toBe(true);
        expect(result.packageName).toBe("root-package");
        expect(result.packagePath).toBe(".");
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("should find package for nested file", async () => {
      const originalCwd = process.cwd();
      await $`mkdir -p ${TEST_REPO}/packages/pkg-a/src`;
      await $`cd ${TEST_REPO}/packages/pkg-a && echo '{"name":"@test/pkg-a"}' > package.json`;
      process.chdir(TEST_REPO);

      try {
        const resultStr = await tools.getPackageForFile.execute(
          { filePath: "packages/pkg-a/src/index.ts" },
          mockContext
        );
        const result = PackageForFileResult.decode(resultStr);

        expect(result.found).toBe(true);
        expect(result.packageName).toBe("@test/pkg-a");
      } finally {
        process.chdir(originalCwd);
        await $`rm -rf ${TEST_REPO}/packages`;
      }
    });
  });

  describe("rewordCommit", () => {
    test("should reword a commit message", async () => {
      const originalCwd = process.cwd();
      const tempRepo = await $`mktemp -d`.text().then(s => s.trim());
      
      try {
        // Initialize repo and create commits
        await $`cd ${tempRepo} && git init`;
        await $`cd ${tempRepo} && git config user.name "Test User"`;
        await $`cd ${tempRepo} && git config user.email "test@example.com"`;
        
        // Initialize git-branchless
        await $`cd ${tempRepo} && git branchless init --main-branch main`;
        
        // Create first commit (root)
        await $`cd ${tempRepo} && echo "test" > file.txt`;
        await $`cd ${tempRepo} && git add file.txt`;
        await $`cd ${tempRepo} && git commit -m "initial commit"`;
        
        // Create second commit (this is what we'll reword - git-branchless can't reword root commits)
        await $`cd ${tempRepo} && echo "test2" > file2.txt`;
        await $`cd ${tempRepo} && git add file2.txt`;
        await $`cd ${tempRepo} && git commit -m "old message"`;
        
        process.chdir(tempRepo);
        
        // Get commit SHA of the second commit
        const commitSha = await $`git rev-parse HEAD`.text().then(s => s.trim());
        
        // Note: This test will skip if git-branchless is not installed
        try {
          await $`which git-branchless`.quiet();
          
          const resultStr = await tools.rewordCommit.execute(
            {
              commitSha,
              newMessage: "feat: new message",
            },
            mockContext
          );
          
          const result = JSON.parse(resultStr);
          expect(result.success).toBe(true);
          expect(result.commitSha).toBe(commitSha);
          
          // Verify message was changed
          const newMessage = await $`git log -1 --format=%s`.text().then(s => s.trim());
          expect(newMessage).toBe("feat: new message");
        } catch (error: any) {
          if (error.message?.includes("which")) {
            console.log("Skipping rewordCommit test: git-branchless not installed");
          } else {
            throw error;
          }
        }
      } finally {
        process.chdir(originalCwd);
        await $`rm -rf ${tempRepo}`;
      }
    });

    test("should handle invalid commit SHA", async () => {
      const originalCwd = process.cwd();
      const tempRepo = await $`mktemp -d`.text().then(s => s.trim());
      
      try {
        await $`cd ${tempRepo} && git init`;
        process.chdir(tempRepo);
        
        const resultStr = await tools.rewordCommit.execute(
          {
            commitSha: "invalid-sha",
            newMessage: "feat: new message",
          },
          mockContext
        );
        
        const result = JSON.parse(resultStr);
        expect(result.success).toBe(false);
        expect(result.error).toBeTruthy();
      } finally {
        process.chdir(originalCwd);
        await $`rm -rf ${tempRepo}`;
      }
    });
  });
});
