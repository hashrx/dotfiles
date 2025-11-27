import { z } from "zod";

// Generic JSON codec helper (based on Zod docs)
const jsonCodec = <T extends z.ZodType>(schema: T) =>
  z.codec(z.string(), schema, {
    decode: (jsonString, ctx) => {
      try {
        return JSON.parse(jsonString);
      } catch (err: any) {
        ctx.issues.push({
          code: "invalid_format",
          format: "json",
          input: jsonString,
          message: err.message,
        });
        return z.NEVER;
      }
    },
    encode: (value) => JSON.stringify(value),
  });

// Git Commit Tool Result Schemas
const CommitsToRewriteSchema = z.object({
  defaultBranch: z.string(),
  currentBranch: z.string(),
  commitCount: z.number(),
  commits: z.array(z.string()),
});

const MultiBranchCommitsSchema = z.object({
  hasMultiBranchCommits: z.boolean(),
  multiBranchCommits: z.array(z.object({
    commit: z.string(),
    branches: z.array(z.string()),
  })),
});

const CommitDetailsSchema = z.object({
  commitRange: z.string(),
  totalCommits: z.number(),
  commits: z.array(z.object({
    hash: z.string(),
    author: z.string(),
    email: z.string(),
    date: z.string(),
    subject: z.string(),
    files: z.array(z.object({
      status: z.string(),
      path: z.string(),
    })),
    stats: z.object({
      filesChanged: z.number(),
      insertions: z.number(),
      deletions: z.number(),
    }),
  })),
});

const BackupBranchSchema = z.object({
  branchName: z.string(),
  message: z.string(),
});

const MonorepoDetectionSchema = z.object({
  isMonorepo: z.boolean(),
  tool: z.string().nullable(),
  packageCount: z.number(),
  packages: z.array(z.object({
    name: z.string(),
    path: z.string(),
  })),
});

const PackageForFileSchema = z.object({
  found: z.boolean(),
  packageName: z.string().nullable(),
  packagePath: z.string().nullable(),
  packageJson: z.any().optional(),
});

// Build & Test Tool Result Schemas
const BuildSystemDetectionSchema = z.object({
  found: z.boolean(),
  packageName: z.string().optional(),
  packagePath: z.string().optional(),
  packageManager: z.string().nullable(),
  monorepoTool: z.string().nullable(),
  buildCommand: z.string().nullable(),
  testCommand: z.string().nullable(),
  typeCheckCommand: z.string().nullable(),
  isTypeScript: z.boolean().optional(),
  availableScripts: z.array(z.string()).optional(),
});

const BuildRunSchema = z.object({
  success: z.boolean(),
  output: z.string().optional(),
  error: z.string().optional(),
  exitCode: z.number().optional(),
  duration: z.number(),
  command: z.string().optional(),
});

const TestRunSchema = z.object({
  success: z.boolean(),
  output: z.string().optional(),
  error: z.string().optional(),
  exitCode: z.number().optional(),
  duration: z.number(),
  command: z.string().optional(),
});

const TypeCheckRunSchema = z.object({
  success: z.boolean(),
  skipped: z.boolean().optional(),
  message: z.string().optional(),
  output: z.string().optional(),
  error: z.string().optional(),
  exitCode: z.number().optional(),
  duration: z.number(),
  command: z.string().optional(),
});

const PackageDependenciesSchema = z.object({
  found: z.boolean(),
  packageName: z.string().optional(),
  packagePath: z.string().optional(),
  dependencies: z.array(z.string()),
  dependents: z.array(z.object({
    name: z.string(),
    path: z.string(),
  })),
});

// Create JSON codecs for each schema
export const CommitsToRewriteResult = jsonCodec(CommitsToRewriteSchema);
export const MultiBranchCommitsResult = jsonCodec(MultiBranchCommitsSchema);
export const CommitDetailsResult = jsonCodec(CommitDetailsSchema);
export const BackupBranchResult = jsonCodec(BackupBranchSchema);
export const MonorepoDetectionResult = jsonCodec(MonorepoDetectionSchema);
export const PackageForFileResult = jsonCodec(PackageForFileSchema);
export const BuildSystemDetectionResult = jsonCodec(BuildSystemDetectionSchema);
export const BuildRunResult = jsonCodec(BuildRunSchema);
export const TestRunResult = jsonCodec(TestRunSchema);
export const TypeCheckRunResult = jsonCodec(TypeCheckRunSchema);
export const PackageDependenciesResult = jsonCodec(PackageDependenciesSchema);

// Export types
export type CommitsToRewriteResult = z.infer<typeof CommitsToRewriteSchema>;
export type MultiBranchCommitsResult = z.infer<typeof MultiBranchCommitsSchema>;
export type CommitDetailsResult = z.infer<typeof CommitDetailsSchema>;
export type BackupBranchResult = z.infer<typeof BackupBranchSchema>;
export type MonorepoDetectionResult = z.infer<typeof MonorepoDetectionSchema>;
export type PackageForFileResult = z.infer<typeof PackageForFileSchema>;
export type BuildSystemDetectionResult = z.infer<typeof BuildSystemDetectionSchema>;
export type BuildRunResult = z.infer<typeof BuildRunSchema>;
export type TestRunResult = z.infer<typeof TestRunSchema>;
export type TypeCheckRunResult = z.infer<typeof TypeCheckRunSchema>;
export type PackageDependenciesResult = z.infer<typeof PackageDependenciesSchema>;
