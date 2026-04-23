type LmStudioRole = "system" | "user" | "assistant";

export interface LmStudioChatMessage {
  role: LmStudioRole;
  content: string;
}

export interface LmStudioHealth {
  ok: boolean;
  configured: boolean;
  baseUrl: string;
  model?: string;
  availableModels: string[];
  error?: string;
}

interface LmStudioModelListResponse {
  data?: Array<{
    id?: string;
  }>;
}

interface LmStudioChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  model?: string;
}

function normalizeBaseUrl(value?: string) {
  const raw = value?.trim() || "http://localhost:1234/v1";
  const withoutTrailingSlash = raw.replace(/\/+$/, "");
  return withoutTrailingSlash.endsWith("/v1")
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/v1`;
}

function getTimeoutMs() {
  const value = Number(process.env.LM_STUDIO_TIMEOUT_MS ?? 45000);
  return Number.isFinite(value) && value > 0 ? value : 45000;
}

function getApiKey() {
  return process.env.LM_STUDIO_API_KEY?.trim();
}

export function getLmStudioConfig() {
  return {
    baseUrl: normalizeBaseUrl(process.env.LM_STUDIO_BASE_URL),
    model: process.env.LM_STUDIO_MODEL?.trim() || undefined,
    timeoutMs: getTimeoutMs(),
    apiKey: getApiKey(),
  };
}

async function fetchJson<T>(
  path: string,
  init: RequestInit = {},
  timeoutMs = getTimeoutMs()
): Promise<T> {
  const config = getLmStudioConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

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
        detail
          ? `lm_studio_http_${response.status}: ${detail}`
          : `lm_studio_http_${response.status}`
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("lm_studio_http_")) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("lm_studio_timeout");
    }

    throw new Error("lm_studio_connection_failed");
  } finally {
    clearTimeout(timeout);
  }
}

export async function listLmStudioModels(timeoutMs = getTimeoutMs()) {
  const response = await fetchJson<LmStudioModelListResponse>(
    "/models",
    {
      method: "GET",
    },
    timeoutMs
  );

  return (response.data ?? [])
    .map((model) => model.id)
    .filter((id): id is string => Boolean(id));
}

async function resolveModel(preferredModel?: string) {
  if (preferredModel) {
    return preferredModel;
  }

  const config = getLmStudioConfig();
  if (config.model) {
    return config.model;
  }

  const models = await listLmStudioModels();
  const [firstModel] = models;

  if (!firstModel) {
    throw new Error("lm_studio_no_loaded_model");
  }

  return firstModel;
}

export async function getLmStudioHealth(): Promise<LmStudioHealth> {
  const config = getLmStudioConfig();

  try {
    const availableModels = await listLmStudioModels(
      Math.min(config.timeoutMs, 2500)
    );
    const model = config.model ?? availableModels[0];

    return {
      ok: availableModels.length > 0 && Boolean(model),
      configured: true,
      baseUrl: config.baseUrl,
      model,
      availableModels,
      error:
        availableModels.length === 0
          ? "LM Studio server is reachable but no model is loaded"
          : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      configured: true,
      baseUrl: config.baseUrl,
      model: config.model,
      availableModels: [],
      error:
        error instanceof Error
          ? error.message
          : "Unable to connect to LM Studio",
    };
  }
}

export async function createLmStudioChatCompletion(input: {
  messages: LmStudioChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}) {
  const model = await resolveModel(input.model);
  const response = await fetchJson<LmStudioChatCompletionResponse>(
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
    getLmStudioConfig().timeoutMs
  );
  const content = response.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("lm_studio_empty_response");
  }

  return {
    content,
    model: response.model ?? model,
  };
}
