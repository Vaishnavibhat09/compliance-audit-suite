import { AiProvider } from "../../types";
import { createLogger } from "../../utils/logger";

const logger = createLogger("llmGateway");

export interface GatewayConfig {
  provider: AiProvider;
  apiKey: string;
  model: string;
}

const CHAT_ENDPOINTS: Record<"groq" | "openai", string> = {
  groq: "https://api.groq.com/openai/v1/chat/completions",
  openai: "https://api.openai.com/v1/chat/completions",
};

async function callOpenAiCompatible(config: GatewayConfig, prompt: string): Promise<string> {
  const endpoint = CHAT_ENDPOINTS[config.provider as "groq" | "openai"];

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${config.provider} request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as any;
  return payload?.choices?.[0]?.message?.content ?? "";
}

async function callGemini(config: GatewayConfig, prompt: string): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`gemini request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as any;
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part: any) => part.text || "").join("");
}

/**
 * Sends the compliance prompt to whichever provider the audit was
 * configured with. Every provider is reached through a plain fetch call so
 * the project has no vendor SDK dependencies.
 */
export async function requestVerdict(config: GatewayConfig, prompt: string): Promise<string> {
  if (!config.apiKey) {
    throw new Error(`No API key configured for provider '${config.provider}'.`);
  }

  logger.info("Requesting adjudication", { provider: config.provider, model: config.model });

  if (config.provider === "gemini") {
    return callGemini(config, prompt);
  }
  return callOpenAiCompatible(config, prompt);
}
