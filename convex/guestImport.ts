"use node";

import { unzipSync, strFromU8 } from "fflate";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { v } from "convex/values";
import { z } from "zod";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { MODEL_SMART } from "./openai";
import { truncate } from "./lib/text";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Guest lists arrive as spreadsheets, PDFs or pasted text; all three end up as rows. */

const MAX_ROWS = 400;
const SHEET_CHARS = 40_000;

/** Pull the cell text out of an .xlsx without a spreadsheet library: it is a zip of XML. */
function xlsxToText(bytes: Uint8Array): string {
  const files = unzipSync(bytes);
  const sharedFile = files["xl/sharedStrings.xml"];
  const shared = sharedFile
    ? [...strFromU8(sharedFile).matchAll(/<si>(.*?)<\/si>/gs)].map((m) =>
        [...m[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map((t) => t[1]).join(""),
      )
    : [];
  const sheetName = Object.keys(files).find((f) => /^xl\/worksheets\/sheet\d+\.xml$/.test(f));
  if (!sheetName) return "";
  const unescape = (t: string) =>
    t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  const rows: string[] = [];
  for (const row of strFromU8(files[sheetName]).matchAll(/<row[^>]*>(.*?)<\/row>/gs)) {
    const cells: string[] = [];
    for (const cell of row[1].matchAll(/<c[^>]*?(?:\st="(\w+)")?[^>]*>(?:<f[^>]*>.*?<\/f>)?(?:<v>(.*?)<\/v>|<is>.*?<t[^>]*>(.*?)<\/t>.*?<\/is>)?<\/c>/gs)) {
      const [, type, value, inline] = cell;
      if (inline !== undefined) cells.push(unescape(inline));
      else if (value === undefined) cells.push("");
      else cells.push(type === "s" ? (shared[Number(value)] ?? "") : unescape(value));
    }
    if (cells.some((c) => c.trim())) rows.push(cells.join(" | "));
    if (rows.length >= MAX_ROWS) break;
  }
  return rows.join("\n");
}

const guestSchema = z.object({
  guests: z
    .array(
      z.object({
        name: z.string().describe("the guest's full name, or the household name as written, e.g. 'The Bennett family'"),
        email: z.string().nullable().describe("their email address exactly as written, null when the list has none"),
        side: z.string().nullable().describe("which side or group they belong to, when the list says"),
        partySize: z.number().int().min(1).max(20).describe("how many people this row covers; 1 unless the list says otherwise"),
      }),
    )
    .max(MAX_ROWS),
  note: z.string().describe("one line for the couple: what was read, and anything skipped or unclear"),
});

/** Read whatever the couple gave us into a list they can check before it becomes guests. */
export const read = internalAction({
  args: { importId: v.id("guestImports") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const row = await ctx.runQuery(internal.guests.getImport, { importId: args.importId });
    if (!row) return null;
    try {
      let text = row.rawText ?? "";
      let pdf: { bytes: ArrayBuffer; filename: string } | undefined;
      if (row.storageId) {
        const blob = await ctx.storage.get(row.storageId);
        if (!blob) throw new Error("That file is no longer stored");
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const name = (row.filename ?? "").toLowerCase();
        if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) {
          text = xlsxToText(bytes);
          if (!text.trim()) throw new Error("That spreadsheet looked empty");
        } else if (name.endsWith(".pdf")) {
          pdf = { bytes: bytes.buffer as ArrayBuffer, filename: row.filename ?? "guests.pdf" };
        } else {
          text = strFromU8(bytes); // csv, tsv, txt
        }
      }
      if (!text.trim() && !pdf) throw new Error("There was nothing to read");

      const instruction =
        "This is a couple's wedding guest list. Read every person or household in it and return them as rows. " +
        "Names and email addresses are what matter; keep an email exactly as written and never invent one. " +
        "Skip headers, totals, blank rows and anything that is not a guest. A row like \"Mr & Mrs Bennett (2)\" or " +
        "\"Olivia Carter + guest\" is one row with a party size of 2. Keep the order of the list.";
      const { object } = await generateObject({
        model: openai(MODEL_SMART),
        schema: guestSchema,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: pdf ? instruction : `${instruction}\n\n${truncate(text, SHEET_CHARS)}` },
              ...(pdf ? [{ type: "file" as const, data: pdf.bytes, mediaType: "application/pdf", filename: pdf.filename }] : []),
            ],
          },
        ],
      });
      await ctx.runMutation(internal.guests.setImportPreview, {
        importId: args.importId,
        guests: object.guests.map((g) => ({
          name: g.name.slice(0, 120),
          email: g.email?.trim().toLowerCase() || undefined,
          side: g.side?.slice(0, 60) || undefined,
          partySize: g.partySize,
        })),
        note: object.note.slice(0, 300),
      });
    } catch (err) {
      await ctx.runMutation(internal.guests.failImport, {
        importId: args.importId,
        error: err instanceof Error ? err.message : "That list could not be read",
      });
    }
    return null;
  },
});
