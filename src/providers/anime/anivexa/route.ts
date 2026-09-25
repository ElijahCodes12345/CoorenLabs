import { Elysia } from "elysia";

// @ts-ignore – Anivexa index is a plain-JS Fetch-API worker module
import anivexaWorker from "./index.js";

/**
 * Bridges the Anivexa Fetch-API worker into Elysia.
 *
 * All requests to /anime/anivexa/* are forwarded to the Anivexa worker's
 * fetch() handler which returns a standard Web API Response.
 *
 * Route layout (relative to /anime/anivexa):
 *   GET /map/:anilistId                              → ID mappings (MAL, AniDB, TVDB…)
 *   GET /episodes/:anilistId                         → All providers' episodes
 *   GET /episodes/:providers/:anilistId?map=         → Filtered providers' episodes
 *   GET /watch/:provider/:id/:audio/:epId            → Stream sources
 *   GET /stream/reanime/:id/:audio/:ep               → Reanime direct stream
 *   GET /stream/2dhive/:id/:audio/:ep                → 2dhive direct stream
 *   GET /stream/2dhive/download/:id/:audio/:ep       → 2dhive download stream
 *   GET /captcha/mkissa                              → MKissa captcha helper
 */
export const anivexaRoutes = new Elysia({ prefix: "/anivexa" })

  // ─── Overview ────────────────────────────────────────────────────────────────
  .get(
    "/",
    () => ({
      service: "anivexa",
      description:
        "Anivexa — multi-provider anime episode & stream API (AniList-ID-based)",
      version: "2.2.1",
      providers: [
        "mkissa",
        "reanime",
        "anikoto",
        "animegg",
        "anineko",
        "anidbapp",
        "2dhive",
        "animenosub",
        "anizone",
        "aniwaves",
        "anibd",
        "senshi",
        "kaa",
        "animedunya",
        "animeonsen",
      ],
      endpoints: [
        "GET /anime/anivexa/map/:anilistId",
        "GET /anime/anivexa/episodes/:anilistId",
        "GET /anime/anivexa/episodes/:provider[/:provider...]/:anilistId?map=true|false",
        "GET /anime/anivexa/watch/:provider/:id/sub|dub/:provider-:ep",
        "GET /anime/anivexa/stream/reanime/:id/sub|dub/:ep",
        "GET /anime/anivexa/stream/2dhive/:id/sub|dub/:ep",
        "GET /anime/anivexa/stream/2dhive/download/:id/sub|dub/:ep",
        "GET /anime/anivexa/captcha/mkissa",
      ],
    }),
    {
      detail: {
        tags: ["anime"],
        summary: "Anivexa — Provider Overview",
      },
    },
  )

  // ─── Proxy all other /anivexa/* requests to the Anivexa worker ───────────────
  // The Anivexa worker matches paths WITHOUT the /anime/anivexa prefix
  // (e.g. /episodes/21, /map/21, /watch/...), so we strip the prefix here.
  .all("/*", async ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    url.pathname = url.pathname.replace(/^\/anime\/anivexa/, "") || "/";
    const rewritten = new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      duplex: "half" as RequestInit["duplex"],
    });
    return anivexaWorker.fetch(rewritten, {}) as Promise<Response>;
  });

