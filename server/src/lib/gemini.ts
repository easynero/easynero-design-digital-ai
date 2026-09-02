import { GoogleGenAI } from "@google/genai";

export const IMAGE_MODELS = {
  balanced: "gemini-3.1-flash-image",
  premium: "gemini-3-pro-image",
  fast: "gemini-3.1-flash-lite-image",
} as const;

export const VIDEO_MODELS = {
  conversational: "gemini-omni-1.1-flash",
  cinematic: "veo-3.1-generate-preview",
  efficient: "veo-3.1-lite-generate-preview",
} as const;

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }
  return new GoogleGenAI({ apiKey });
}
