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

    // Build the Seedance 1 Pro prompt
    const cleaned = value_text.trim().replace(/\s+/g, " ");
    const base = `
    A single tugboat, starboard side visible, with the text "tugboat.co" painted on the side, moves steadily from left to right across calm ocean water.
    At the beginning (0–2 seconds): only the tugboat is visible in the wide shot. No other objects are visible.
    From 2–5 seconds: the object "${cleaned}" enters the from the left being pulled behind the tugboat along the same path by a thick tow rope.
    The object must not appear in front of or beside the tugboat.
    There should only be one instance of the object.
    Wide shot, 16:9 aspect ratio, cinematic, humorous, vibrant colors, daylight, 5 seconds, 24 fps.`;

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