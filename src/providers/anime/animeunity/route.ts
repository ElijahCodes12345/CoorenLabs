import { Elysia, t } from "elysia";
import { AnimeUnity } from "./animeunity";

export const animeunityRoutes = new Elysia({ prefix: "/animeunity" })
  .get(
    "/search/:query",
    async ({ params: { query } }) => {
      return await AnimeUnity.search(query);
    },
    {
      params: t.Object({
        query: t.String({ description: "Search query" }),
      }),
      detail: {
        tags: ["anime"],
        summary: "AnimeUnity Search",
        description: "Search for anime titles on AnimeUnity.",
      },
    },
  )
  .get(
    "/info/:id",
    async ({ params: { id }, set }) => {
      const res = await AnimeUnity.info(id);
      if (!res) {
        set.status = 404;
        return { message: "Anime not found" };
      }
      return res;
    },
    {
      params: t.Object({
        id: t.String({ description: "The anime ID (e.g., 12)" }),
      }),
      detail: {
        tags: ["anime"],
        summary: "AnimeUnity Info",
        description: "Fetch full anime information and episode list.",
      },
    },
  )
  .get(
    "/watch/*",
    async ({ params }) => {
      const episodeId = params["*"];
      // episodeId format: "animeId/epId"
      const results = await AnimeUnity.streams(episodeId);
      return { results };
    },
    {
      params: t.Object({
        "*": t.String({ description: "The episode ID in format animeId/epId (e.g., 12/5987)" }),
      }),
      detail: {
        tags: ["anime"],
        summary: "AnimeUnity Watch",
        description: "Fetch streaming sources for a specific AnimeUnity episode (format: animeId/epId).",
      },
    },
  );
