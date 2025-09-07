// src/app/api/cron/route.ts
import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { neon } from "@neondatabase/serverless";
import { createPrediction } from "@/lib/replicate";

export const runtime = "nodejs";

type EntryRow = { id: string; value_text: string };

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Run at 05:00 UTC in production to target the *previous* New York day
    const nowNY = DateTime.utc().setZone("America/New_York");
    const targetDay = nowNY.minus({ days: 1 }).toFormat("yyyy-LL-dd"); // always string

    const rows = (await sql/*sql*/`
      select id, value_text
      from entries
      where submit_day = ${targetDay}
      order by random()
      limit 1
    `) as EntryRow[];

    if (!rows.length) {
      return NextResponse.json({ ok: true, msg: `No entries for ${targetDay}` });
    }

    const { id, value_text } = rows[0];

    // Build the Stable Diffusion prompt
    const cleaned = value_text.trim().replace(/\s+/g, " ");
    const base = `
    A single sturdy tugboat is towing ${cleaned} across calm ocean water, starboard side visible.
    At the beginning of the video, only the tugboat is visible as it enters the frame from the left.
    After 2–4 seconds, ${cleaned} is revealed behind the tugboat, connected by a thick tow rope to the stern.
    The tugboat continues moving toward the right. Only one tugboat should be present.
    Wide shot, cinematic, humorous, whimsical, vibrant colors. 16:9 aspect ratio, 8 seconds, 16 fps, daylight.`;

    const finalPrompt = base.slice(0, 900); // generous cap
    await createPrediction({
      prompt: finalPrompt,
      entryId: id,
      imageDay: targetDay,
    });

    return NextResponse.json({ ok: true, day: targetDay, startedForEntry: id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}