// src/lib/replicate.ts

export type CreatePredictionArgs = {
  prompt: string;
  entryId: string;
  imageDay: string; // YYYY-MM-DD (America/New_York)
};

// ✅ WAN 2.2 T2V Fast version UUID (from the model's "Run with API" page)
// You can replace this any time with a newer version UUID from the same page.
const MODEL_VERSION =
  "920bea47c60299896482c74ddd32df873d0e392a88a08595b3d4f56eaf47b6ef";

export async function createPrediction(
  { prompt, entryId, imageDay }: CreatePredictionArgs
): Promise<void> {
  const token = process.env.REPLICATE_API_TOKEN;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not set");
  if (!baseUrl) throw new Error("NEXT_PUBLIC_BASE_URL is not set");

  // 👇 Commonly supported inputs for WAN 2.2 T2V Fast (check the API page for the exact schema)
  const input = {
    prompt,
    // Helpful guardrails for your use case:
    negative_prompt:
      "extra boats, multiple tugboats, multiple of the same item being towed, disconnected rope, cropped item being towed, text, watermark, blurry, low-res",
    // Many WAN T2V variants accept these fields (see model API docs)
    // If a field isn't supported by your chosen version, just remove it.
    aspect_ratio: "16:9",
    // duration in seconds (some versions accept 'duration')
    duration: 8,
    // frames per second (some versions accept 'fps')
    fps: 16,
    // guidance_scale (if supported; otherwise remove)
    guidance_scale: 8,
  };

  const body = {
    version: MODEL_VERSION, // ✅ required by Replicate
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