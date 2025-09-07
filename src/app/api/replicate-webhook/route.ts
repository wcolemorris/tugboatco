import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { neon } from "@neondatabase/serverless";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

type ReplicateWebhookPayload = {
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

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const entryId = url.searchParams.get("entryId");
    const imageDay = url.searchParams.get("imageDay");
    if (!entryId || !imageDay) {
      return NextResponse.json({ ok: false, error: "missing entryId or imageDay" }, { status: 400 });
    }

    const payload = (await req.json()) as ReplicateWebhookPayload;

    // Ignore events that aren't finished
    if (payload.status && payload.status !== "succeeded" && payload.status !== "completed") {
      return NextResponse.json({ ok: true, msg: `ignored status ${payload.status}` });
    }

    const outputUrl = pickOutputUrl(payload.output);
    if (!outputUrl) {
      return NextResponse.json({ ok: false, error: "no output image url" }, { status: 400 });
    }

    // Fetch the generated image
    const imgResp = await fetch(outputUrl);
    if (!imgResp.ok) {
      return NextResponse.json({ ok: false, error: `fetch image ${imgResp.status}` }, { status: 502 });
    }
    const buffer = Buffer.from(await imgResp.arrayBuffer());

    // Upload to Vercel Blob (new URL every run)
    const blob = await put(`daily/${imageDay}.png`, buffer, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: true, // 👈 ensures fresh URL
    });

    // Persist to Postgres (create client here)
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

    // Refresh homepage so it shows the new image
    revalidatePath("/");

    return NextResponse.json({ ok: true, stored: blob.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}