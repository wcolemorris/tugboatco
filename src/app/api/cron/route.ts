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
    const base = `A single tugboat with "tugboat.co" painted on its starboard hull moves LEFT-TO-RIGHT across calm ocean water. Wide, static camera shot. The tugboat travels horizontally from LEFT EDGE to RIGHT EDGE of frame. A thick tow rope extends directly backward from the stern. TIMING:
    - 0.0–2.0s: ONLY the tugboat is visible. The rope extends backward to the LEFT EDGE of the frame. The object "${cleaned}" is completely OFF-SCREEN.
    - 2.0s: The object "${cleaned}" FIRST APPEARS at the LEFT EDGE, attached to the rope.
    - 2.0–5.0s: The object "${cleaned}" is pulled fully INTO FRAME, always trailing directly BEHIND the tugboat at a fixed distance.
    CONSTRAINTS:
    - Exactly ONE object "${cleaned}"
    - Object NEVER beside or ahead of tugboat
    - Object ALWAYS directly behind tugboat, connected by rope
    - Continuous horizontal movement only (no vertical drifting)
    STYLE:
    - Bright daylight, cinematic, whimsical, vibrant ocean blues.`;

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