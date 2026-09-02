import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  analyzeMedia,
  generateImage,
  generateSpeech,
  getGeneration,
  startVideo,
} from "@/lib/tools";

export const runtime = "nodejs";
export const maxDuration = 300;

const imageRatios = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9", "1:8", "8:1", "1:4", "4:1"] as const;
const mediaAnnotations = { readOnlyHint: false, destructiveHint: false, openWorldHint: true };

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected generation error.";
  return { isError: true as const, content: [{ type: "text" as const, text: message }] };
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "generate_or_edit_image",
      {
        title: "Generate or edit an image",
        description:
          "Generate a new image or edit supplied reference images with Nano Banana. Use balanced by default, premium for complex professional design work, and fast for inexpensive drafts. Supplying previous_interaction_id continues a conversational edit.",
        inputSchema: z.object({
          prompt: z.string().min(3).describe("Complete visual direction or requested edit."),
          model: z.enum(["balanced", "premium", "fast"]).default("balanced"),
          aspect_ratio: z.enum(imageRatios).default("16:9"),
          image_size: z.enum(["512", "1K", "2K", "4K"]).default("2K"),
          reference_urls: z.array(z.string().url()).max(14).optional(),
          previous_interaction_id: z.string().optional(),
        }),
        annotations: mediaAnnotations,
      },
      async (args) => {
        try {
          const result = await generateImage({
            prompt: args.prompt,
            model: args.model,
            aspectRatio: args.aspect_ratio,
            imageSize: args.image_size,
            referenceUrls: args.reference_urls,
            previousInteractionId: args.previous_interaction_id,
          });
          const metadata = `Interaction: ${result.interactionId}${result.url ? `\nDownload: ${result.url}` : ""}${result.text ? `\n${result.text}` : ""}`;
          return {
            structuredContent: {
              interaction_id: result.interactionId,
              download_url: result.url,
              mime_type: result.mimeType,
            },
            content: [
              { type: "text" as const, text: metadata },
              { type: "image" as const, data: result.data, mimeType: result.mimeType },
            ],
          };
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      "start_video_generation_or_edit",
      {
        title: "Generate or edit a video",
        description:
          "Start an asynchronous video generation or conversational edit. Use conversational for most work, cinematic for Veo controls, and efficient for lower-cost iterations. Follow with get_generation_result.",
        inputSchema: z.object({
          prompt: z.string().min(3),
          model: z.enum(["conversational", "cinematic", "efficient"]).default("conversational"),
          aspect_ratio: z.enum(["16:9", "9:16"]).default("16:9"),
          duration: z.string().regex(/^\d+(?:\.\d+)?s$/).default("8s"),
          reference_urls: z.array(z.string().url()).max(8).optional(),
          previous_interaction_id: z.string().optional(),
        }),
        annotations: mediaAnnotations,
      },
      async (args) => {
        try {
          const result = await startVideo({
            prompt: args.prompt,
            model: args.model,
            aspectRatio: args.aspect_ratio,
            duration: args.duration,
            referenceUrls: args.reference_urls,
            previousInteractionId: args.previous_interaction_id,
          });
          return {
            structuredContent: { interaction_id: result.interactionId, status: result.status },
            content: [{ type: "text" as const, text: `Video generation started. Interaction: ${result.interactionId}. Status: ${result.status}.` }],
          };
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      "get_generation_result",
      {
        title: "Get generation result",
        description: "Check an asynchronous Gemini video generation and return its downloadable result when complete.",
        inputSchema: z.object({ interaction_id: z.string().min(1) }),
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
      },
      async ({ interaction_id }) => {
        try {
          const result = await getGeneration(interaction_id);
          return {
            structuredContent: result,
            content: [{ type: "text" as const, text: result.url ? `Generation complete: ${result.url}` : `Status: ${result.status}` }],
          };
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      "analyze_design_media",
      {
        title: "Analyze design media and files",
        description: "Analyze images, videos, audio, PDFs, or text files with Gemini for critique, extraction, comparison, transcription, or creative direction.",
        inputSchema: z.object({
          prompt: z.string().min(3),
          media_urls: z.array(z.string().url()).min(1).max(12),
        }),
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
      },
      async (args) => {
        try {
          const text = await analyzeMedia({ prompt: args.prompt, mediaUrls: args.media_urls });
          return { content: [{ type: "text" as const, text }] };
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      "generate_voice_audio",
      {
        title: "Generate voice audio",
        description: "Generate directed single-speaker voice audio from exact text using Gemini text-to-speech.",
        inputSchema: z.object({
          text: z.string().min(1).max(8000),
          voice: z.string().default("Kore"),
          direction: z.string().optional(),
        }),
        annotations: mediaAnnotations,
      },
      async (args) => {
        try {
          const result = await generateSpeech(args);
          return {
            structuredContent: { download_url: result.url, mime_type: result.mimeType },
            content: [
              ...(result.url ? [{ type: "text" as const, text: `Download: ${result.url}` }] : []),
              { type: "audio" as const, data: result.data, mimeType: result.mimeType },
            ],
          };
        } catch (error) {
          return errorResult(error);
        }
      },
    );

    server.registerTool(
      "list_supported_models",
      {
        title: "List supported creative models",
        description: "List the model profiles exposed by Design Digital AI and explain when each profile should be used.",
        inputSchema: z.object({}),
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      },
      async () => ({
        content: [{
          type: "text" as const,
          text: [
            "Images: balanced = Nano Banana 2; premium = Nano Banana Pro; fast = Nano Banana 2 Lite.",
            "Videos: conversational = Gemini Omni Flash; cinematic = Veo 3.1; efficient = Veo 3.1 Lite.",
            "Analysis: Gemini 3.7 Flash. Voice: Gemini 3.1 Flash TTS.",
          ].join("\n"),
        }],
      }),
    );
  },
  {
    serverInfo: { name: "design-digital-ai", version: "0.1.0" },
    instructions:
      "Creative tools for the Design Digital project. Prefer Nano Banana 2 for image work. Preserve supplied references and explicitly state meaningful changes. Video operations are asynchronous: start first, then poll the returned interaction ID.",
  },
);

function secureCompare(received: string, expected: string) {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

const authenticatedHandler = withMcpAuth(
  handler,
  async (_request, bearerToken) => {
    const expected = process.env.MCP_ACCESS_TOKEN;
    if (!expected || !bearerToken || !secureCompare(bearerToken, expected)) return undefined;
    return { token: bearerToken, scopes: ["creative:generate"], clientId: "design-digital-owner" };
  },
  { required: true, requiredScopes: ["creative:generate"] },
);

export { authenticatedHandler as GET, authenticatedHandler as POST };
