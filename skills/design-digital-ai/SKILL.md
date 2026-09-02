---
name: design-digital-ai
description: Use Gemini-backed creative tools for image, video, audio, and multimodal analysis inside the Design Digital project. Apply when the user explicitly wants Google models, Nano Banana, Gemini, or Veo, or when the selected Design Digital workflow depends on those tools.
---

# Design Digital AI

Use the project conversation, files, and current art direction as the source of truth. Do not replace explicit references with generic visual assumptions.

## Images

- Use `generate_or_edit_image` for both creation and editing.
- Default to `balanced` (Nano Banana 2). Use `premium` for complex professional layouts, brand consistency, precise text, or demanding reference fidelity. Use `fast` for inexpensive drafts and rapid exploration.
- When the user supplies references, pass every relevant image instead of describing them from memory.
- Preserve the returned `interaction_id`. Use it as `previous_interaction_id` for conversational edits when the next request should retain the same visual state.
- Prefer 2K for normal portfolio production and 4K only when the final asset or user request benefits from it.

## Video

- Use `start_video_generation_or_edit` and retain the returned interaction ID.
- Use `conversational` for ordinary generation and edits. Use `cinematic` when Veo-specific controls or a cinematic final result matter. Use `efficient` for lower-cost iterations.
- Video generation is asynchronous. Call `get_generation_result` with the same interaction ID until it completes; do not start duplicate generations merely because the first is still processing.

## Analysis and audio

- Use `analyze_design_media` for critique, comparison, extraction, transcription, or understanding of images, audio, video, PDFs, and text files.
- Use `generate_voice_audio` only when the user requests produced speech or narration.

Generated media consumes the user's Google API credits. Respect the requested number of variants and quality; do not silently expand the batch. The integration does not access or edit projects stored in the Google Flow interface.
