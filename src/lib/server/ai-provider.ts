// Server-only: uses child_process for codex_cli provider
import { spawn } from "child_process";
import {
  getLmStudioConfig,
  getLmStudioHealth,
  createLmStudioChatCompletion,
} from "./lm-studio";

export type AiProvider = "codex_cli" | "codex" | "lmstudio";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiHealth {
  ok: boolean;
  provider: AiProvider;
  configured: boolean;
  baseUrl: string;
  model?: string;
  availableModels: string[];
  error?: string;
}

export function getActiveProvider(): AiProvider {
  const value = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (value === "codex") return "codex";
  if (value === "lmstudio") return "lmstudio";
  return "codex_cli"; // default: Option A — local Codex CLI wrapper
}

// ─── Codex CLI (subprocess) ──────────────────────────────────────────────────
// Follows Option A: app calls codex locally, codex handles all auth with OpenAI.
// Never reads OAuth token files. Codex must be installed & logged in by the user.

function getCodexCliConfig() {
  const timeoutMs = Number(process.env.CODEX_CLI_TIMEOUT_MS ?? 120000);
  return {
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 120000,
    workspaceDir: process.env.CODEX_CLI_WORKSPACE ?? process.cwd(),
  };
}

function stripAnsi(str: string) {
  return str.replace(/\x1B\[[0-9;]*[mGKHJF]/g, "");
}

function messagesToCodexPrompt(messages: AiMessage[]): string {
  return [
    "Respond in plain text only. Do not create, modify, or delete any files. Do not run shell commands. Just answer the question.",
    "",
    ...messages.map((m) => {
      const label =
        m.role === "system"
          ? "## SYSTEM"
          : m.role === "user"
            ? "## USER"
            : "## ASSISTANT";
      return `${label}\n${m.content}`;
    }),
  ].join("\n");
}

function parseCodexExecOutput(stdout: string): string {
  let lastAgentMessage = "";

  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;

    try {
      const event = JSON.parse(trimmed) as {
        type?: string;
        item?: { type?: string; text?: string };
      };
      if (
        event.type === "item.completed" &&
        event.item?.type === "agent_message" &&
        typeof event.item.text === "string"
      ) {
        lastAgentMessage = event.item.text.trim();
      }
    } catch {
      // Ignore non-JSON log lines emitted by the CLI.
    }
  }

  return lastAgentMessage || stripAnsi(stdout).trim();
}

function spawnCodex(
  prompt: string,
  config: ReturnType<typeof getCodexCliConfig>
): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const child = spawn(
      "codex",
      ["exec", "--skip-git-repo-check", "--json", "--color", "never", prompt],
      {
        cwd: config.workspaceDir,
        env: process.env as NodeJS.ProcessEnv,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      done(() => reject(new Error("codex_cli_timeout")));
    }, config.timeoutMs);

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (err: NodeJS.ErrnoException) => {
      done(() =>
        reject(
          err.code === "ENOENT"
            ? new Error("codex_cli_not_installed")
            : new Error(`codex_cli_spawn_error: ${err.message}`)
        )
      );
    });

    child.on("close", (code: number | null) => {
      done(() => {
        if (code !== 0) {
          const lower = (stderr + stdout).toLowerCase();
          if (
            lower.includes("not authenticated") ||
            lower.includes("please login") ||
            lower.includes("codex login") ||
            lower.includes("sign in")
          ) {
            reject(new Error("codex_cli_not_authenticated"));
          } else if (
            lower.includes("usage limit") ||
            lower.includes("quota") ||
            lower.includes("rate limit")
          ) {
            reject(new Error("codex_cli_usage_limit"));
          } else {
            reject(
              new Error(
                `codex_cli_exit_${code ?? "null"}: ${stripAnsi(stderr).slice(0, 300)}`
              )
            );
          }
          return;
        }

        const content = parseCodexExecOutput(stdout);
        if (!content) {
          reject(new Error("codex_cli_empty_response"));
        } else {
          resolve(content);
        }
      });
    });
  });
}

async function createCodexCliChatCompletion(input: {
  messages: AiMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<{ content: string; model: string }> {
  const config = getCodexCliConfig();
  const prompt = messagesToCodexPrompt(input.messages);
  const content = await spawnCodex(prompt, config);
  return { content, model: "codex-cli" };
}

async function getCodexCliHealth(): Promise<AiHealth> {
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("codex", ["--version"], {
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      });
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error("timeout"));
      }, 4000);
      child.on("close", (code) => {
        clearTimeout(timer);
        code === 0 ? resolve() : reject(new Error(`exit_${code}`));
      });
      child.on("error", (err: NodeJS.ErrnoException) => {
        clearTimeout(timer);
        reject(err.code === "ENOENT" ? new Error("codex_cli_not_installed") : err);
      });
    });

    return {
      ok: true,
      provider: "codex_cli",
      configured: true,
      baseUrl: "subprocess://codex",
      model: "codex-cli",
      availableModels: ["codex-cli"],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const notInstalled = msg.includes("not_installed") || msg.includes("ENOENT");
    return {
      ok: false,
      provider: "codex_cli",
      configured: false,
      baseUrl: "subprocess://codex",
      availableModels: [],
      error: notInstalled
        ? "Codex CLI ไม่ได้ติดตั้ง: npm install -g @openai/codex && codex login"
        : `Codex CLI ไม่พร้อมใช้งาน: ${msg}`,
    };
  }
}

// ─── Codex / OpenAI API (HTTP) ───────────────────────────────────────────────

function getCodexConfig() {
  const rawBase =
    process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";
  const baseUrl = rawBase.replace(/\/+$/, "").endsWith("/v1")
    ? rawBase.replace(/\/+$/, "")
    : `${rawBase.replace(/\/+$/, "")}/v1`;
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS ?? 30000);

  return {
    apiKey: process.env.OPENAI_API_KEY?.trim(),
    baseUrl,
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 30000,
  };
}

async function fetchCodexJson<T>(
  path: string,
  init: RequestInit,
  config: ReturnType<typeof getCodexConfig>
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (config.apiKey) {
      headers.set("Authorization", `Bearer ${config.apiKey}`);
    }

    const response = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response
        .text()
        .then((body) => body.replace(/\s+/g, " ").slice(0, 500))
        .catch(() => "");
      throw new Error(
        detail ? `ai_http_${response.status}: ${detail}` : `ai_http_${response.status}`
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("ai_http_")) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("ai_timeout");
    }
    throw new Error("ai_connection_failed");
  } finally {
    clearTimeout(timer);
  }
}

async function createCodexApiChatCompletion(input: {
  messages: AiMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const config = getCodexConfig();
  const model = input.model ?? config.model;

  const response = await fetchCodexJson<{
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  }>(
    "/chat/completions",
    {
      method: "POST",
      body: JSON.stringify({
        model,
        messages: input.messages,
        temperature: input.temperature ?? 0.2,
        max_tokens: input.maxTokens ?? 800,
      }),
    },
    config
  );

  const content = response.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("ai_empty_response");
  }

  return { content, model: response.model ?? model };
}

async function getCodexApiHealth(): Promise<AiHealth> {
  const config = getCodexConfig();

  if (!config.apiKey) {
    return {
      ok: false,
      provider: "codex",
      configured: false,
      baseUrl: config.baseUrl,
      model: config.model,
      availableModels: [],
      error: "OPENAI_API_KEY is not configured",
    };
  }

  try {
    const response = await fetchCodexJson<{
      data?: Array<{ id?: string }>;
    }>(
      "/models",
      { method: "GET" },
      { ...config, timeoutMs: Math.min(config.timeoutMs, 5000) }
    );

    const availableModels = (response.data ?? [])
      .map((m) => m.id)
      .filter((id): id is string => Boolean(id))
      .slice(0, 10);

    return {
      ok: true,
      provider: "codex",
      configured: true,
      baseUrl: config.baseUrl,
      model: config.model,
      availableModels,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "codex",
      configured: true,
      baseUrl: config.baseUrl,
      model: config.model,
      availableModels: [],
      error:
        error instanceof Error ? error.message : "Unable to connect to Codex API",
    };
  }
}

// ─── Unified public API ──────────────────────────────────────────────────────

export async function createAiChatCompletion(input: {
  messages: AiMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const provider = getActiveProvider();
  if (provider === "codex_cli") return createCodexCliChatCompletion(input);
  if (provider === "lmstudio") return createLmStudioChatCompletion(input);
  return createCodexApiChatCompletion(input);
}

export async function getAiHealth(): Promise<AiHealth> {
  const provider = getActiveProvider();
  if (provider === "codex_cli") return getCodexCliHealth();
  if (provider === "lmstudio") {
    const health = await getLmStudioHealth();
    return { ...health, provider: "lmstudio" };
  }
  return getCodexApiHealth();
}

export function getAiProviderConfig() {
  const provider = getActiveProvider();
  if (provider === "codex_cli") {
    const config = getCodexCliConfig();
    return { provider, baseUrl: "subprocess://codex", model: "codex-cli", timeoutMs: config.timeoutMs };
  }
  if (provider === "lmstudio") {
    const config = getLmStudioConfig();
    return { provider, ...config };
  }
  const config = getCodexConfig();
  return { provider, ...config };
}
