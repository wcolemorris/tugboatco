import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { DateTime } from "luxon";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";

function pickOutputUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    const first = output[0];
    return typeof first === "string" ? first : null;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const entryId = url.searchParams.get("entryId");
    const imageDay = url.searchParams.get("imageDay"); // from cron
    if (!entryId || !imageDay) {
      return NextResponse.json({ ok: false, error: "missing entryId or imageDay" }, { status: 400 });
    }

    const payload = await req.json().catch(() => ({}));
    const outputUrl = pickOutputUrl((payload as any).output);
    if (!outputUrl) {
      return NextResponse.json({ ok: false, error: "no output image url" }, { status: 400 });
    }

    // Fetch the generated image
    const imgResp = await fetch(outputUrl);
    if (!imgResp.ok) {
      return NextResponse.json({ ok: false, error: `fetch image ${imgResp.status}` }, { status: 502 });
    }
    const buffer = Buffer.from(await imgResp.arrayBuffer());

    // Upload to Vercel Blob (public)
    const blob = await put(`daily/${imageDay}.png`, buffer, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
    });

    // Persist to Postgres
    const sql = neon(process.env.DATABASE_URL!);
    const promptUsed: string = (payload as any)?.input?.prompt ?? "";
    await sql/*sql*/`
      insert into daily_images (image_day, entry_id, prompt_used, image_url)
      values (${imageDay}, ${entryId}, ${promptUsed}, ${blob.url})
      on conflict (image_day) do nothing
    `;

    return NextResponse.json({ ok: true, stored: blob.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}