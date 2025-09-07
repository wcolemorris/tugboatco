// src/app/api/replicate-webhook/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

type ReplicateWebhookPayload = {
  // Replicate output is commonly a single URL string or an array of URLs.
  output?: string | string[];
  input?: { prompt?: string };
  status?: string;
};

function pickOutputUrl(output: ReplicateWebhookPayload["output"]): string | null {
  if (!output) return null;
  if (typeof output === "string") return output;
  if (Array.isArray(output) && typeof output[0] === "string") return output[0]!;
  return null;
}

function inferExtensionAndType(url: string, respContentType: string | null): { ext: string; contentType: string } {
  // Prefer server-declared content-type; fall back to URL heuristics
  const ct = (respContentType || "").toLowerCase();

  if (ct.includes("video/mp4")) return { ext: ".mp4", contentType: "video/mp4" };
  if (ct.includes("video/webm")) return { ext: ".webm", contentType: "video/webm" };
  if (ct.includes("image/png")) return { ext: ".png", contentType: "image/png" };
  if (ct.includes("image/jpeg") || ct.includes("image/jpg")) return { ext: ".jpg", contentType: "image/jpeg" };

  // Heuristics from URL if content-type missing or generic
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.endsWith(".mp4")) return { ext: ".mp4", contentType: "video/mp4" };
  if (lowerUrl.endsWith(".webm")) return { ext: ".webm", contentType: "video/webm" };
  if (lowerUrl.endsWith(".png")) return { ext: ".png", contentType: "image/png" };
  if (lowerUrl.endsWith(".jpg") || lowerUrl.endsWith(".jpeg")) return { ext: ".jpg", contentType: "image/jpeg" };

  // Sensible default for WAN T2V
  return { ext: ".mp4", contentType: "video/mp4" };
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const entryId = url.searchParams.get("entryId");
    const imageDay = url.searchParams.get("imageDay");
    if (!entryId || !imageDay) {
      return NextResponse.json({ ok: false, error: "missing entryId or imageDay" }, { status: 400 });
    }

    const payload = (await req.json()) as ReplicateWebhookPayload;

    // Ignore non-final events defensively
    if (payload.status && payload.status !== "succeeded" && payload.status !== "completed") {
      return NextResponse.json({ ok: true, msg: `ignored status ${payload.status}` });
    }

    const outputUrl = pickOutputUrl(payload.output);
    if (!outputUrl) {
      return NextResponse.json({ ok: false, error: "no output media url" }, { status: 400 });
    }

    // Download media
    const mediaResp = await fetch(outputUrl);
    if (!mediaResp.ok) {
      return NextResponse.json({ ok: false, error: `fetch media ${mediaResp.status}` }, { status: 502 });
    }
    const buffer = Buffer.from(await mediaResp.arrayBuffer());

    const { ext, contentType } = inferExtensionAndType(outputUrl, mediaResp.headers.get("content-type"));

    // Upload to Vercel Blob with a unique filename to avoid CDN caching issues
    const blob = await put(`daily/${imageDay}${ext}`, buffer, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });

    // Persist (idempotent by image_day)
    const sql = neon(process.env.DATABASE_URL!);
    const promptUsed = payload.input?.prompt ?? "";
    await sql/*sql*/`
      insert into daily_images (image_day, entry_id, prompt_used, image_url)
      values (${imageDay}, ${entryId}, ${promptUsed}, ${blob.url})
      on conflict (image_day) do update
        set entry_id = excluded.entry_id,
            prompt_used = excluded.prompt_used,
            image_url = excluded.image_url
    `;

    // Show the newest media immediately on the homepage
    revalidatePath("/");

    return NextResponse.json({ ok: true, stored: blob.url, type: contentType });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}