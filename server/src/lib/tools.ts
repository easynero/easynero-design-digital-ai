import { getGeminiClient, IMAGE_MODELS, VIDEO_MODELS } from "@/lib/gemini";
import { fetchMedia, persistGeneratedMedia } from "@/lib/media";

type ImageModel = keyof typeof IMAGE_MODELS;
type VideoModel = keyof typeof VIDEO_MODELS;

export async function generateImage(input: {
  prompt: string;
  model: ImageModel;
  aspectRatio: string;
  imageSize: string;
  referenceUrls?: string[];
  previousInteractionId?: string;
}) {
  const ai = getGeminiClient();
  const references = await Promise.all(
    (input.referenceUrls || []).map(async (url) => {
      const media = await fetchMedia(url, ["image/"]);
      return {
        type: "image" as const,
        data: media.bytes.toString("base64"),
        mime_type: media.mimeType,
      };
    }),
  );

  const interaction = await ai.interactions.create({
    model: IMAGE_MODELS[input.model],
    input: [{ type: "text", text: input.prompt }, ...references],
    previous_interaction_id: input.previousInteractionId,
    store: true,
    response_format: {
      type: "image",
      aspect_ratio: input.aspectRatio,
      image_size: input.imageSize,
      delivery: "inline",
    },
  });

  if (!interaction.output_image?.data) {
    throw new Error(interaction.errors?.[0]?.message || "Gemini returned no image.");
  }
  const mimeType = interaction.output_image.mime_type || "image/png";
  const stored = await persistGeneratedMedia(interaction.output_image.data, mimeType, "images");
  return {
    interactionId: interaction.id,
    text: interaction.output_text,
    data: interaction.output_image.data,
    mimeType,
    url: stored.url,
  };
}

export async function startVideo(input: {
  prompt: string;
  model: VideoModel;
  aspectRatio: "16:9" | "9:16";
  duration: string;
  referenceUrls?: string[];
  previousInteractionId?: string;
}) {
  const ai = getGeminiClient();
  const references = await Promise.all(
    (input.referenceUrls || []).map(async (url) => {
      const media = await fetchMedia(url, ["image/", "video/", "audio/"]);
      const category = media.mimeType.split("/")[0] as "image" | "video" | "audio";
      return {
        type: category,
        data: media.bytes.toString("base64"),
        mime_type: media.mimeType,
      };
    }),
  );

  const interaction = await ai.interactions.create({
    model: VIDEO_MODELS[input.model],
    input: [{ type: "text", text: input.prompt }, ...references],
    previous_interaction_id: input.previousInteractionId,
    background: true,
    store: true,
    response_format: {
      type: "video",
      aspect_ratio: input.aspectRatio,
      duration: input.duration,
      delivery: "inline",
    },
  });
  return { interactionId: interaction.id, status: interaction.status };
}

export async function getGeneration(interactionId: string) {
  const ai = getGeminiClient();
  const interaction = await ai.interactions.get(interactionId);
  if (!interaction.output_video?.data) {
    return {
      interactionId: interaction.id,
      status: interaction.status,
      errors: interaction.errors,
      text: interaction.output_text,
    };
  }
  const mimeType = interaction.output_video.mime_type || "video/mp4";
  const stored = await persistGeneratedMedia(interaction.output_video.data, mimeType, "videos");
  if (!stored.url) throw new Error("BLOB_READ_WRITE_TOKEN is required to deliver generated videos.");
  return {
    interactionId: interaction.id,
    status: interaction.status,
    text: interaction.output_text,
    mimeType,
    url: stored.url,
  };
}

export async function analyzeMedia(input: { prompt: string; mediaUrls: string[] }) {
  const ai = getGeminiClient();
  const files = await Promise.all(
    input.mediaUrls.map(async (url, index) => {
      const media = await fetchMedia(url, ["image/", "video/", "audio/", "application/pdf", "text/"]);
      return ai.files.upload({
        file: new Blob([media.bytes], { type: media.mimeType }),
        config: { mimeType: media.mimeType, displayName: `design-digital-reference-${index + 1}` },
      });
    }),
  );
  const response = await ai.models.generateContent({
    model: "gemini-3.7-flash",
    contents: [input.prompt, ...files],
  });
  return response.text || "No analysis was returned.";
}

export async function generateSpeech(input: { text: string; voice: string; direction?: string }) {
  const ai = getGeminiClient();
  const interaction = await ai.interactions.create({
    model: "gemini-3.1-flash-tts-preview",
    input: input.direction ? `${input.direction}\n\n${input.text}` : input.text,
    response_format: { type: "audio" },
    generation_config: { speech_config: [{ voice: input.voice }] },
  });
  if (!interaction.output_audio?.data) throw new Error("Gemini returned no audio.");
  const mimeType = interaction.output_audio.mime_type || "audio/wav";
  const stored = await persistGeneratedMedia(interaction.output_audio.data, mimeType, "audio");
  return { data: interaction.output_audio.data, mimeType, url: stored.url };
}
