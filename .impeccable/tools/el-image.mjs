// ElevenLabs Image & Video (Flows) generator for Impeccable comps.
// Usage: ELEVENLABS_API_KEY=... node el-image.mjs --prompt-file p.txt --out out.png [--model gpt-image-2] [--aspect 16:9] [--resolution 2K] [--quality high] [--ref ref.png]
import fs from "node:fs";
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith("--") ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const key = process.env.ELEVENLABS_API_KEY;
if (!key) { console.error("ELEVENLABS_API_KEY missing"); process.exit(2); }
const base = "https://api.elevenlabs.io/v1/flows/image";
const body = {
  model_id: args.model ?? "gpt-image-2",
  prompt: fs.readFileSync(args["prompt-file"], "utf8"),
  aspect_ratio: args.aspect ?? "16:9",
};
if (args.resolution) body.resolution = args.resolution;
if (args.quality) body.quality = args.quality;
if (args.ref) body.images = [{ type: "inline_base64", content_base64: fs.readFileSync(args.ref).toString("base64"), mime_type: args.ref.endsWith(".png") ? "image/png" : "image/jpeg" }];
const headers = { "xi-api-key": key, "Content-Type": "application/json" };
let res = await fetch(base, { method: "POST", headers, body: JSON.stringify(body) });
let json = await res.json().catch(() => ({}));
if (!res.ok) { console.error("create failed", res.status, JSON.stringify(json).slice(0, 600)); process.exit(1); }
const id = json.id; console.log("generation", id, json.status);
for (let i = 0; i < 150; i++) {
  await new Promise((r) => setTimeout(r, 3000));
  const g = await fetch(`${base}/${id}`, { headers });
  const gj = await g.json().catch(() => ({}));
  if (!g.ok) { console.error("poll failed", g.status, JSON.stringify(gj).slice(0, 400)); process.exit(1); }
  if (gj.status === "completed") {
    const url = gj.content_url ?? gj.output?.content_url ?? gj.outputs?.[0]?.content_url;
    if (!url) { console.error("completed without content_url", JSON.stringify(gj).slice(0, 600)); process.exit(1); }
    const img = await fetch(url);
    fs.writeFileSync(args.out, Buffer.from(await img.arrayBuffer()));
    fs.writeFileSync(args.out.replace(/\.(png|jpe?g|webp)$/, ".prompt.json"), JSON.stringify({ tool: "elevenlabs-flows-image", model: body.model_id, aspect_ratio: body.aspect_ratio, resolution: body.resolution, quality: body.quality, reference: args.ref ?? null, prompt: body.prompt, generation_id: id, created: new Date().toISOString() }, null, 2));
    console.log("saved", args.out, gj.content_mime_type ?? "");
    process.exit(0);
  }
  if (gj.status === "failed") { console.error("generation failed", JSON.stringify(gj).slice(0, 600)); process.exit(1); }
}
console.error("timed out"); process.exit(1);
