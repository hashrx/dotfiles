import { tool } from "@opencode-ai/plugin";
import { $ } from "bun";

/**
 * Validate that a command is safe to execute
 * Only allows known package manager commands and common build tools
 */
function validateCommand(command: string): boolean {
  // Allow commands that start with known safe package managers and tools
  const allowedPrefixes = [
    'npm ',
    'pnpm ',
    'yarn ',
    'bun ',
    'turbo ',
    'nx ',
    'tsc ',
    'jest ',
    'vitest ',
    'eslint ',
  ];
  
  return allowedPrefixes.some(prefix => command.startsWith(prefix));
}

// Cache for build system detection to avoid repeated filesystem checks
const buildSystemCache = new Map<string, any>();

/**
 * Clear the build system cache (useful for tests)
 * @internal
 */
export function clearBuildSystemCache() {
  buildSystemCache.clear();
}

/**
 * Detect project build system and commands
 * 
 * Analyzes the project structure to determine:
 * - Package manager (npm, pnpm, yarn, bun)
 * - Monorepo tool (turbo, nx, lerna)
 * - Available build, test, and typecheck commands
 * 
 * Results are cached per absolute path to avoid repeated filesystem checks.
 * 
 * @example
 * ```typescript
 * const result = await detectBuildSystem.execute({ packagePath: "./packages/core" });
 * // Returns: { found: true, packageManager: "pnpm", monorepoTool: "turbo", ... }
 * ```
 * 
 * @returns JSON string with build system information
 */
export const detectBuildSystem = tool({
  description: "Detect the build system and available commands for a project or package",
  args: {
    packagePath: tool.schema.string().optional().describe("Path to package (defaults to current directory)"),
  },
  async execute(args) {
    const basePath = args.packagePath || '.';
    const packageJsonPath = `${basePath}/package.json`;
    
    // Check cache first - use absolute path as key to handle different working directories
    const absolutePath = await Bun.file(packageJsonPath).exists() 
      ? (await import('path')).resolve(basePath)
      : null;
    
    if (absolutePath && buildSystemCache.has(absolutePath)) {
      return buildSystemCache.get(absolutePath);
    }
    
    if (!await Bun.file(packageJsonPath).exists()) {
      const result = JSON.stringify({
        found: false,
        packageManager: null,
        monorepoTool: null,
        buildCommand: null,
        testCommand: null,
        typeCheckCommand: null,
      }, null, 2);
      
      // Don't cache "not found" results as the file might appear later
      return result;
    }
    
    const pkgData = JSON.parse(await Bun.file(packageJsonPath).text());
    const scripts = pkgData.scripts || {};
    
    // Detect monorepo tool first (prioritize Turbo as it handles dependencies automatically)
    let monorepoTool: string | null = null;
    if (await Bun.file('turbo.json').exists()) {
      monorepoTool = 'turbo';
    } else if (await Bun.file('nx.json').exists()) {
      monorepoTool = 'nx';
    }
    
    // Detect package manager
    let packageManager = 'npm';
    if (await Bun.file('pnpm-lock.yaml').exists() || await Bun.file(`${basePath}/pnpm-lock.yaml`).exists()) {
      packageManager = 'pnpm';
    } else if (await Bun.file('yarn.lock').exists() || await Bun.file(`${basePath}/yarn.lock`).exists()) {
      packageManager = 'yarn';
    } else if (await Bun.file('bun.lockb').exists() || await Bun.file(`${basePath}/bun.lockb`).exists()) {
      packageManager = 'bun';
    }
    
    // Determine build command
    // Priority: Turbo (handles dependencies) > Nx > Package manager
    let buildCommand: string | null = null;
    if (scripts.build) {
      if (monorepoTool === 'turbo') {
        // Turbo automatically builds dependencies with --filter=...
        buildCommand = `turbo run build --filter=${pkgData.name}...`;
      } else if (monorepoTool === 'nx') {
        buildCommand = `nx run ${pkgData.name}:build`;
      } else if (packageManager === 'pnpm' && basePath !== '.') {
        buildCommand = `pnpm --filter ${pkgData.name} build`;
      } else if (packageManager === 'yarn' && basePath !== '.') {
        buildCommand = `yarn workspace ${pkgData.name} build`;
      } else if (packageManager === 'npm' && basePath !== '.') {
        buildCommand = `npm run build --workspace=${pkgData.name}`;
      } else {
        buildCommand = `${packageManager} run build`;
      }
    }
    
    // Determine test command
    // Priority: Turbo (handles dependencies) > Nx > Package manager
    let testCommand: string | null = null;
    if (scripts.test) {
      if (monorepoTool === 'turbo') {
        // Turbo automatically builds dependencies before testing with --filter=...
        testCommand = `turbo run test --filter=${pkgData.name}...`;
      } else if (monorepoTool === 'nx') {
        testCommand = `nx run ${pkgData.name}:test`;
      } else if (packageManager === 'pnpm' && basePath !== '.') {
        testCommand = `pnpm --filter ${pkgData.name} test`;
      } else if (packageManager === 'yarn' && basePath !== '.') {
        testCommand = `yarn workspace ${pkgData.name} test`;
      } else if (packageManager === 'npm' && basePath !== '.') {
        testCommand = `npm test --workspace=${pkgData.name}`;
      } else {
        testCommand = `${packageManager} run test`;
      }
    }
    
    // Detect TypeScript and type checking command
    let isTypeScript = false;
    let typeCheckCommand: string | null = null;
    
    // Check for TypeScript files
    if (await Bun.file(`${basePath}/tsconfig.json`).exists()) {
      isTypeScript = true;
      
      // Check for typecheck script
      if (scripts.typecheck || scripts['type-check'] || scripts.tsc) {
        const scriptName = scripts.typecheck ? 'typecheck' : scripts['type-check'] ? 'type-check' : 'tsc';
        if (monorepoTool === 'turbo') {
          typeCheckCommand = `turbo run ${scriptName} --filter=${pkgData.name}...`;
        } else if (monorepoTool === 'nx') {
          typeCheckCommand = `nx run ${pkgData.name}:${scriptName}`;
        } else if (packageManager === 'pnpm' && basePath !== '.') {
          typeCheckCommand = `pnpm --filter ${pkgData.name} ${scriptName}`;
        } else if (packageManager === 'yarn' && basePath !== '.') {
          typeCheckCommand = `yarn workspace ${pkgData.name} ${scriptName}`;
        } else if (packageManager === 'npm' && basePath !== '.') {
          typeCheckCommand = `npm run ${scriptName} --workspace=${pkgData.name}`;
        } else {
          typeCheckCommand = `${packageManager} run ${scriptName}`;
        }
      } else {
        // Fallback to tsc --noEmit
        typeCheckCommand = 'tsc --noEmit';
      }
    }
    
    const result = JSON.stringify({
      found: true,
      packageName: pkgData.name,
      packagePath: basePath,
      packageManager,
      monorepoTool,
      buildCommand,
      testCommand,
      typeCheckCommand,
      isTypeScript,
      availableScripts: Object.keys(scripts),
    }, null, 2);
    
    // Cache the result
    if (absolutePath) {
      buildSystemCache.set(absolutePath, result);
    }
    
    return result;
  },
});

/**
 * Run build for a package
 * 
 * Executes the build command for a package. If no custom command is provided,
 * automatically detects and uses the appropriate build command based on the
 * project's build system configuration.
 * 
 * For monorepos, automatically includes dependency building (especially with Turbo).
 * 
 * @example
 * ```typescript
 * // Auto-detect and run
 * const result = await runBuild.execute({});
 * 
 * // Custom command
 * const result = await runBuild.execute({ 
 *   packagePath: "./packages/core",
 *   buildCommand: "bun run custom-build" 
 * });
 * ```
 * 
 * @returns JSON string with success status, output, duration, and command used
 */
export const runBuild = tool({
  description: "Run build command for a package",
  args: {
    packagePath: tool.schema.string().optional().describe("Path to package (defaults to current directory)"),
    buildCommand: tool.schema.string().optional().describe("Custom build command (will be detected if not provided)"),
  },
  async execute(args) {
    const buildInfoStr = await detectBuildSystem.execute({ packagePath: args.packagePath }, {} as any);
    const buildInfo = JSON.parse(buildInfoStr);
    
    if (!buildInfo.found) {
      return JSON.stringify({
        success: false,
        error: "No package.json found",
        duration: 0,
      }, null, 2);
    }
    
    const command = args.buildCommand || buildInfo.buildCommand;
    
    if (!command) {
      return JSON.stringify({
        success: false,
        error: "No build command available",
        duration: 0,
      }, null, 2);
    }
    
    // Validate command for security
    if (!validateCommand(command)) {
      return JSON.stringify({
        success: false,
        error: `Invalid or unsafe command: ${command}. Only package manager and build tool commands are allowed.`,
        duration: 0,
      }, null, 2);
    }
    
    const startTime = Date.now();
    
    try {
      const result = await $`${{ raw: command }}`.text();
      const duration = Date.now() - startTime;
      
      return JSON.stringify({
        success: true,
        output: result,
        duration,
        command,
      }, null, 2);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return JSON.stringify({
        success: false,
        error: error.message || "Build failed",
        output: error.stdout || error.stderr || "",
        exitCode: error.exitCode,
        duration,
        command,
      }, null, 2);
    }
  },
});

/**
 * Run tests for a package
 * 
 * Executes the test command for a package. If no custom command is provided,
 * automatically detects and uses the appropriate test command.
 * 
 * For monorepos with Turbo, automatically builds dependencies before testing.
 * 
 * @example
 * ```typescript
 * // Auto-detect and run
 * const result = await runTest.execute({});
 * 
 * // Specific package in monorepo
 * const result = await runTest.execute({ 
 *   packagePath: "./packages/app" 
 * });
 * ```
 * 
 * @returns JSON string with success status, output, duration, and command used
 */
export const runTest = tool({
  description: "Run test command for a package",
  args: {
    packagePath: tool.schema.string().optional().describe("Path to package (defaults to current directory)"),
    testCommand: tool.schema.string().optional().describe("Custom test command (will be detected if not provided)"),
  },
  async execute(args) {
    const buildInfoStr = await detectBuildSystem.execute({ packagePath: args.packagePath }, {} as any);
    const buildInfo = JSON.parse(buildInfoStr);
    
    if (!buildInfo.found) {
      return JSON.stringify({
        success: false,
        error: "No package.json found",
        duration: 0,
      }, null, 2);
    }
    
    const command = args.testCommand || buildInfo.testCommand;
    
    if (!command) {
      return JSON.stringify({
        success: false,
        error: "No test command available",
        duration: 0,
      }, null, 2);
    }
    
    // Validate command for security
    if (!validateCommand(command)) {
      return JSON.stringify({
        success: false,
        error: `Invalid or unsafe command: ${command}. Only package manager and build tool commands are allowed.`,
        duration: 0,
      }, null, 2);
    }
    
    const startTime = Date.now();
    
    try {
      const result = await $`${{ raw: command }}`.text();
      const duration = Date.now() - startTime;
      
      return JSON.stringify({
        success: true,
        output: result,
        duration,
        command,
      }, null, 2);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return JSON.stringify({
        success: false,
        error: error.message || "Tests failed",
        output: error.stdout || error.stderr || "",
        exitCode: error.exitCode,
        duration,
        command,
      }, null, 2);
    }
  },
});

/**
 * Run type checking for a package
 * 
 * Executes TypeScript type checking if the project uses TypeScript.
 * Automatically skips for non-TypeScript projects.
 * 
 * Looks for typecheck, type-check, or tsc scripts, and falls back to
 * `tsc --noEmit` if no script is defined.
 * 
 * @example
 * ```typescript
 * const result = await runTypeCheck.execute({});
 * // If not TypeScript: { success: true, skipped: true }
 * // If TypeScript: { success: true, skipped: false, output: "..." }
 * ```
 * 
 * @returns JSON string with success status, output, duration, and skip status
 */
export const runTypeCheck = tool({
  description: "Run TypeScript type checking for a package",
  args: {
    packagePath: tool.schema.string().optional().describe("Path to package (defaults to current directory)"),
    typeCheckCommand: tool.schema.string().optional().describe("Custom type check command (will be detected if not provided)"),
  },
  async execute(args) {
    const buildInfoStr = await detectBuildSystem.execute({ packagePath: args.packagePath }, {} as any);
    const buildInfo = JSON.parse(buildInfoStr);
    
    if (!buildInfo.found) {
      return JSON.stringify({
        success: false,
        error: "No package.json found",
        duration: 0,
        skipped: false,
      }, null, 2);
    }
    
    if (!buildInfo.isTypeScript) {
      return JSON.stringify({
        success: true,
        skipped: true,
        message: "Not a TypeScript project, skipping type check",
        duration: 0,
      }, null, 2);
    }
    
    const command = args.typeCheckCommand || buildInfo.typeCheckCommand;
    
    if (!command) {
      return JSON.stringify({
        success: false,
        error: "No type check command available",
        duration: 0,
        skipped: false,
      }, null, 2);
    }
    
    // Validate command for security
    if (!validateCommand(command)) {
      return JSON.stringify({
        success: false,
        error: `Invalid or unsafe command: ${command}. Only package manager and build tool commands are allowed.`,
        duration: 0,
        skipped: false,
      }, null, 2);
    }
    
    const startTime = Date.now();
    
    try {
      const result = await $`${{ raw: command }}`.text();
      const duration = Date.now() - startTime;
      
      return JSON.stringify({
        success: true,
        skipped: false,
        output: result,
        duration,
        command,
      }, null, 2);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      return JSON.stringify({
        success: false,
        skipped: false,
        error: error.message || "Type check failed",
        output: error.stdout || error.stderr || "",
        exitCode: error.exitCode,
        duration,
        command,
      }, null, 2);
    }
  },
});

/**
 * Get package dependencies
 * 
 * Analyzes a package in a monorepo to find:
 * - All its dependencies (dependencies, devDependencies, peerDependencies)
 * - All packages that depend on it (dependents)
 * 
 * Useful for determining build order and impact analysis.
 * 
 * @example
 * ```typescript
 * const result = await getPackageDependencies.execute({ 
 *   packageName: "@myorg/core" 
 * });
 * // Returns: {
 * //   found: true,
 * //   dependencies: ["lodash", "react"],
 * //   dependents: [{ name: "@myorg/app", path: "./packages/app" }]
 * // }
 * ```
 * 
 * @returns JSON string with dependencies and dependents information
 */
export const getPackageDependencies = tool({
  description: "Get dependencies of a package and find which other packages depend on it",
  args: {
    packageName: tool.schema.string().describe("Package name to analyze"),
  },
  async execute(args) {
    // Find the package
    const monorepo = await $`find . -name package.json -type f`.text();
    const packageFiles = monorepo.split('\n').filter(Boolean);
    
    type PackageInfo = { name: string; path: string; dependencies: string[] };
    let targetPackage: PackageInfo | null = null;
    
    // Read all package.json files in parallel
    const packageInfoPromises = packageFiles.map(async (pkgFile) => {
      try {
        const pkgData = JSON.parse(await Bun.file(pkgFile).text());
        
        // Skip if package.json doesn't have a name
        if (!pkgData.name) {
          return null;
        }
        
        const deps = Object.keys({
          ...pkgData.dependencies,
          ...pkgData.devDependencies,
          ...pkgData.peerDependencies,
        });
        
        return {
          name: pkgData.name,
          path: pkgFile.replace('/package.json', ''),
          dependencies: deps,
        };
      } catch (error) {
        // Skip malformed or inaccessible package.json files
        return null;
      }
    });
    
    const packageInfoResults = await Promise.all(packageInfoPromises);
    const allPackages = packageInfoResults.filter((pkg): pkg is PackageInfo => pkg !== null);
    
    // Find target package
    targetPackage = allPackages.find(pkg => pkg.name === args.packageName) || null;
    
    if (!targetPackage) {
      return JSON.stringify({
        found: false,
        dependencies: [],
        dependents: [],
      }, null, 2);
    }
    
    // Find packages that depend on this package
    const dependents = allPackages.filter(pkg => 
      pkg.dependencies.includes(args.packageName)
    );
    
    return JSON.stringify({
      found: true,
      packageName: args.packageName,
      packagePath: targetPackage.path,
      dependencies: targetPackage.dependencies,
      dependents: dependents.map(d => ({ name: d.name, path: d.path })),
    }, null, 2);
  },
});
