// Sends www.plusonewedding.site to the bare domain; everything else is the static site.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === "www.plusonewedding.site") {
      url.hostname = "plusonewedding.site";
      url.protocol = "https:";
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
