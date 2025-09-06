const MODEL_VERSION = "7762fd07"; 
// 👆 replace with the actual version ID from replicate.com

export async function createPrediction({ prompt, entryId, imageDay }: CreatePredictionArgs): Promise<void> {
  const token = process.env.REPLICATE_API_TOKEN;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not set");
  if (!baseUrl) throw new Error("NEXT_PUBLIC_BASE_URL is not set");

  const body = {
    version: MODEL_VERSION,     // ✅ use version
    input: { prompt },
    webhook: `${baseUrl}/api/replicate-webhook?entryId=${encodeURIComponent(entryId)}&imageDay=${encodeURIComponent(imageDay)}`,
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