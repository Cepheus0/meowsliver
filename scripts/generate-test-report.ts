import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

type StepResult = {
  name: string;
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
};

const repoRoot = process.cwd();
const reportDir = path.join(repoRoot, "reports");
const reportPath = path.join(reportDir, "test-report.md");
const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const generatedAt = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "Asia/Bangkok",
}).format(new Date());

function runStep(name: string, command: string, args: string[]): StepResult {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      APP_URL: appUrl,
    },
  });

  return {
    name,
    command: [command, ...args].join(" "),
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function formatOutput(output: string) {
  const trimmed = output.trim();
  if (!trimmed) {
    return "_No output_";
  }

  return `\`\`\`text\n${trimmed}\n\`\`\``;
}

function buildReport(results: StepResult[]) {
  const failedSteps = results.filter((step) => step.exitCode !== 0);
  const summary = failedSteps.length === 0 ? "PASS" : "FAIL";

  return `# Test Report

- Generated at: ${generatedAt}
- Target app URL: ${appUrl}
- Overall status: ${summary}

## Coverage Design

| Feature Area | Automated Coverage | Remaining Manual Checks |
| --- | --- | --- |
| Theme and layout shell | Build + route smoke checks | Visual QA across desktop/mobile breakpoints |
| Import mapping and dedupe | Unit tests + API smoke preview/commit | Large-file UX, mapping edge cases from real exports |
| Dashboard analytics | Unit tests for finance analytics | Data storytelling review with real data |
| Transactions page | Route smoke checks + analytics unit coverage | Search/filter UX and pagination behavior |
| Savings goals portfolio | Unit tests + API smoke for create/update/entry | Edit/delete/archive UX, long-form content polish |
| Reports and investments | Build + route smoke checks | Chart readability and empty/loaded visual QA |

## Execution Summary

| Step | Status | Command |
| --- | --- | --- |
${results
  .map(
    (step) =>
      `| ${step.name} | ${step.exitCode === 0 ? "PASS" : "FAIL"} | \`${step.command}\` |`
  )
  .join("\n")}

${results
  .map(
    (step) => `## ${step.name}

- Status: ${step.exitCode === 0 ? "PASS" : "FAIL"}
- Command: \`${step.command}\`

### Stdout
${formatOutput(step.stdout)}

### Stderr
${formatOutput(step.stderr)}
`
  )
  .join("\n")}
`;
}

const steps: Array<[string, string[]]> = [
  ["Typecheck", ["run", "typecheck"]],
  ["Lint", ["run", "lint"]],
  ["Build", ["run", "build"]],
  ["Unit Tests", ["run", "test:unit"]],
  ["Smoke Tests", ["run", "test:smoke"]],
];

const results = steps.map(([name, args]) => runStep(name, "bun", args));
mkdirSync(reportDir, { recursive: true });
writeFileSync(reportPath, buildReport(results));

console.log(`Wrote ${reportPath}`);

if (results.some((step) => step.exitCode !== 0)) {
  process.exitCode = 1;
}
