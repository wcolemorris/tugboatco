// src/lib/replicate.ts

export type CreatePredictionArgs = {
  prompt: string;
  entryId: string;
  imageDay: string; // YYYY-MM-DD (America/New_York)
};

// 👇 Replace with the Flux.1 Pro version UUID from Replicate’s API example
const MODEL_VERSION = "black-forest-labs/flux-pro:1e237aa703bf3a8ab480d5b595563128807af649c50afc0b4f22a9174e90d1d6";

export async function createPrediction(
  { prompt, entryId, imageDay }: CreatePredictionArgs
): Promise<void> {
  const token = process.env.REPLICATE_API_TOKEN;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not set");
  if (!baseUrl) throw new Error("NEXT_PUBLIC_BASE_URL is not set");
  if (!MODEL_VERSION.startsWith("YOUR-")) {
    // optional safety
  }

  const body = {
    version: MODEL_VERSION,
    input: {
      prompt,
      negative_prompt:
        "blurry, low-res, extra boats, multiple ropes, disconnected rope, cropped subject, text, watermark, logo",
      aspect_ratio: "1:1",
      num_inference_steps: 36,
      guidance_scale: 8
    },
    webhook: `${baseUrl}/api/replicate-webhook?entryId=${encodeURIComponent(entryId)}&imageDay=${encodeURIComponent(imageDay)}`,
    webhook_events_filter: ["completed"]
  };

  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Replicate HTTP ${res.status}: ${text}`);
  }
}