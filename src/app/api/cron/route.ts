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
    A single sturdy tugboat, starboard side visible, enters the frame from the left.
    The tugboat is moving across the frame through calm ocean waters toward the right and is towing something behind it that is out of frame. 
    After 2 seconds, "${cleaned}" enters the frame from the left being towed by the tugboat and connected to the tugboat's stern by a thick tow rope.
    Wide shot, cinematic, humorous, whimsical, vibrant colors. 16:9 aspect ratio, 5 seconds, 24 fps, daylight.`;

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