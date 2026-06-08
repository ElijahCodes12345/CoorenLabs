import { Elysia, t } from "elysia";
import { AnimeSaturn } from "./animesaturn";

export const animesaturnRoutes = new Elysia({ prefix: "/animesaturn" })
  .get(
    "/search/:query",
    async ({ params: { query }, query: qs }) => {
      const page = parseInt(qs?.page as string) || 1;
      return await AnimeSaturn.search(query, page);
    },
    {
      params: t.Object({
        query: t.String({ description: "Search query" }),
      }),
      query: t.Object({
        page: t.Optional(t.String({ description: "Page number" })),
      }),
      detail: {
        tags: ["anime"],
        summary: "AnimeSaturn Search",
        description: "Search for anime titles on AnimeSaturn.",
      },
    },
  )
  .get(
    "/info/:id",
    async ({ params: { id }, set }) => {
      const res = await AnimeSaturn.info(id);
      if (!res) {
        set.status = 404;
        return { message: "Anime not found" };
      }
      return res;
    },
    {
      params: t.Object({
        id: t.String({ description: "The anime ID (e.g., One-Piece-Sub-ITA-a)" }),
      }),
      detail: {
        tags: ["anime"],
        summary: "AnimeSaturn Info",
        description: "Fetch full anime information and episode list.",
      },
    },
  )
  .get(
    "/watch/*",
    async ({ params, set }) => {
      const episodeId = params["*"];
      if (!episodeId) {
        set.status = 400;
        return { message: "episodeId is required" };
      }
      const results = await AnimeSaturn.streams(episodeId);
      return { results };
    },
    {
      params: t.Object({
        "*": t.String({ description: "Episode ID (e.g., One-Piece-Sub-ITA-a/One-Piece-ep-1 OR One-Piece-ep-1)" }),
      }),
      detail: {
        tags: ["anime"],
        summary: "AnimeSaturn Watch",
        description: "Fetch streaming sources for a specific AnimeSaturn episode. Supports full composite ID or just the episode ID.",
      },
    },
  );
