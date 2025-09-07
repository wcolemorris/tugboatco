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
    const base = `Generate an image of a sturdy tugboat towing ${cleaned} behind it.
    The tugboat is in the foreground, starboard side visible.
    A thick tow rope connects the stern of the tugboat to ${cleaned}, which is fully visible behind the boat.
    Square shot, 1:1, daylight on calm water, detailed water wake and rope tension.
    Humorous, whimsical, vibrant colors, sharp focus, high detail.`;

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