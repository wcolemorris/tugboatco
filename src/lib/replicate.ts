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
      "object in front, object beside tugboat, multiple objects, missing rope, rope disconnected, cropped rope, extra tugboats, rope in front of tugboat, multiple ropes, text, watermark, blurry, low-res, misspelling of tugboat.co",
    resolution: "720p",   // ✅ 480p resolution
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