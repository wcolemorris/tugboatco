// src/lib/replicate.ts

export type CreatePredictionArgs = {
  prompt: string;
  entryId: string;
  imageDay: string; // YYYY-MM-DD (America/New_York)
};

// ✅ Seedance-1-Pro version UUID (from Replicate "Run with API" page)
const MODEL_VERSION =
  "71486843cf5b0098931fe16dbc3771a611a7004bbb80d3bcbcff51e14e96e7dd";

export async function createPrediction(
  { prompt, entryId, imageDay }: CreatePredictionArgs
): Promise<void> {
  const token = process.env.REPLICATE_API_TOKEN;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not set");
  if (!baseUrl) throw new Error("NEXT_PUBLIC_BASE_URL is not set");

  // 👇 Inputs for Seedance-1-Pro
  const input = {
    prompt,
    negative_prompt:
      "rope connected to front of tugboat, object outside of water, object floating in air, object not aligned behind tugboat, object not pulled by rope, object moving on its own, object above water, object in front of tugboat, object beside tugboat, multiple objects, duplicate objects, missing rope, rope disconnected, rope cut, multiple ropes, no rope visible, tugboat facing left, tugboat mirrored, extra tugboats, duplicate tugboats, watermark, text artifacts, wrong text, misspelled tugboat.co, blurry, pixelated, low quality",
    resolution: "480p",   // ✅ 480p resolution
    duration: 5,          // ✅ 5 seconds
    aspect_ratio: "16:9",
    fps: 24,
    camera_fixed: false,
    seed: Math.floor(Math.random() * 9999999),
  };

  const body = {
    version: MODEL_VERSION,
    input,
    webhook: `${baseUrl}/api/replicate-webhook?entryId=${encodeURIComponent(
      entryId
    )}&imageDay=${encodeURIComponent(imageDay)}`,
    webhook_events_filter: ["completed"],
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