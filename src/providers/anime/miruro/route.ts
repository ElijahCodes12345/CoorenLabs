import { Elysia, t } from "elysia";
import { Miruro } from "./miruro";

export const miruroRoutes = new Elysia({ prefix: "/miruro" })

  // ── Overview ────────────────────────────────────────────────────────────────
  .get("/", () => ({
    name: "miruro",
    version: "1.0",
    description: "Anime provider wrapper for the decrypted Miruro native API.",
    endpoints: [
      "/search/:query?page=&perPage= → Search anime",
      "/suggestions/:query           → Lightweight search suggestions",
      "/filter                       → Advanced filter",
      "/spotlight                    → Spotlight anime",
      "/trending                     → Trending anime",
      "/popular                      → Popular anime",
      "/upcoming                     → Upcoming anime",
      "/recent                       → Recently updated/airing anime",
      "/schedule                     → Anime schedule",
      "/info/:id                     → Full anime info",
      "/characters/:id               → Anime characters",
      "/relations/:id                → Anime relations",
      "/recommendations/:id          → Anime recommendations",
      "/episodes/:id                 → Anime episodes",
      "/watch/:provider/:anilistId/:category/:slug → Watch stream sources",
    ],
  }))

  // ── Search & Discovery ──────────────────────────────────────────────────────
  .get(
    "/search/:query",
    async ({ params: { query }, query: qs, set }) => {
      const page = parseInt(qs?.page as string) || 1;
      const perPage = parseInt(qs?.perPage as string) || 20;
      const res = await Miruro.search(query, page, perPage);
      if (!res) {
        set.status = 500;
        return { message: "Search failed" };
      }
      return res;
    },
    {
      params: t.Object({ query: t.String() }),
      query: t.Object({
        page: t.Optional(t.String()),
        perPage: t.Optional(t.String()),
      }),
      detail: {
        tags: ["miruro"],
        summary: "Miruro — Search",
        description: "Search anime by name. Returns full metadata per result.",
      },
    }
  )

  .get(
    "/suggestions/:query",
    async ({ params: { query }, set }) => {
      const res = await Miruro.suggestions(query);
      if (!res) {
        set.status = 500;
        return { message: "Suggestions failed" };
      }
      return res;
    },
    {
      params: t.Object({ query: t.String() }),
      detail: {
        tags: ["miruro"],
        summary: "Miruro — Suggestions",
        description: "Lightweight search for autocomplete / dropdown.",
      },
    }
  )

  .get(
    "/filter",
    async ({ query: qs, set }) => {
      const res = await Miruro.filter(qs as any);
      if (!res) {
        set.status = 500;
        return { message: "Filter failed" };
      }
      return res;
    },
    {
      detail: {
        tags: ["miruro"],
        summary: "Miruro — Filter",
        description: "Advanced filter / browse. Combine any filters.",
      },
    }
  )

  // ── Collections ─────────────────────────────────────────────────────────────
  .get(
    "/spotlight",
    async ({ query: qs, set }) => {
      const allowAll = qs?.allowAll === "true";
      const res = await Miruro.spotlight(allowAll);
      if (!res) {
        set.status = 500;
        return { message: "Spotlight failed" };
      }
      return res;
    },
    {
      query: t.Object({
        allowAll: t.Optional(t.String()),
      }),
      detail: {
        tags: ["miruro"],
        summary: "Miruro — Spotlight",
        description: "The ultra-curated 'What's Hot' list.",
      },
    }
  )

  .get(
    "/trending",
    async ({ query: qs, set }) => {
      const page = parseInt(qs?.page as string) || 1;
      const perPage = parseInt(qs?.perPage as string) || 20;
      const allowAll = qs?.allowAll === "true";
      const res = await Miruro.trending(page, perPage, allowAll);
      if (!res) {
        set.status = 500;
        return { message: "Trending failed" };
      }
      return res;
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        perPage: t.Optional(t.String()),
        allowAll: t.Optional(t.String()),
      }),
      detail: {
        tags: ["miruro"],
        summary: "Miruro — Trending",
        description: "Currently trending anime across the community.",
      },
    }
  )

  .get(
    "/popular",
    async ({ query: qs, set }) => {
      const page = parseInt(qs?.page as string) || 1;
      const perPage = parseInt(qs?.perPage as string) || 20;
      const allowAll = qs?.allowAll === "true";
      const res = await Miruro.popular(page, perPage, allowAll);
      if (!res) {
        set.status = 500;
        return { message: "Popular failed" };
      }
      return res;
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        perPage: t.Optional(t.String()),
        allowAll: t.Optional(t.String()),
      }),
      detail: {
        tags: ["miruro"],
        summary: "Miruro — Popular",
        description: "Most popular anime of all time by total user count.",
      },
    }
  )

  .get(
    "/upcoming",
    async ({ query: qs, set }) => {
      const page = parseInt(qs?.page as string) || 1;
      const perPage = parseInt(qs?.perPage as string) || 20;
      const allowAll = qs?.allowAll === "true";
      const res = await Miruro.upcoming(page, perPage, allowAll);
      if (!res) {
        set.status = 500;
        return { message: "Upcoming failed" };
      }
      return res;
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        perPage: t.Optional(t.String()),
        allowAll: t.Optional(t.String()),
      }),
      detail: {
        tags: ["miruro"],
        summary: "Miruro — Upcoming",
        description: "Most anticipated anime that haven't aired yet.",
      },
    }
  )

  .get(
    "/recent",
    async ({ query: qs, set }) => {
      const page = parseInt(qs?.page as string) || 1;
      const perPage = parseInt(qs?.perPage as string) || 20;
      const allowAll = qs?.allowAll === "true";
      const res = await Miruro.recent(page, perPage, allowAll);
      if (!res) {
        set.status = 500;
        return { message: "Recent failed" };
      }
      return res;
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        perPage: t.Optional(t.String()),
        allowAll: t.Optional(t.String()),
      }),
      detail: {
        tags: ["miruro"],
        summary: "Miruro — Recent",
        description: "Currently airing / this season's anime.",
      },
    }
  )

  .get(
    "/schedule",
    async ({ query: qs, set }) => {
      const page = parseInt(qs?.page as string) || 1;
      const perPage = parseInt(qs?.perPage as string) || 20;
      const res = await Miruro.schedule(page, perPage);
      if (!res) {
        set.status = 500;
        return { message: "Schedule failed" };
      }
      return res;
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        perPage: t.Optional(t.String()),
      }),
      detail: {
        tags: ["miruro"],
        summary: "Miruro — Schedule",
        description: "Next episodes airing soon.",
      },
    }
  )

  // ── Anime Details ───────────────────────────────────────────────────────────
  .get(
    "/info/:id",
    async ({ params: { id }, set }) => {
      const res = await Miruro.info(id);
      if (!res) {
        set.status = 404;
        return { message: "Anime info not found" };
      }
      return res;
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["miruro"],
        summary: "Miruro — Info",
        description: "Complete anime page data.",
      },
    }
  )

  .get(
    "/characters/:id",
    async ({ params: { id }, query: qs, set }) => {
      const page = parseInt(qs?.page as string) || 1;
      const perPage = parseInt(qs?.perPage as string) || 25;
      const res = await Miruro.characters(id, page, perPage);
      if (!res) {
        set.status = 404;
        return { message: "Anime characters not found" };
      }
      return res;
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({
        page: t.Optional(t.String()),
        perPage: t.Optional(t.String()),
      }),
      detail: {
        tags: ["miruro"],
        summary: "Miruro — Characters",
        description: "Paginated character list.",
      },
    }
  )

  .get(
    "/relations/:id",
    async ({ params: { id }, set }) => {
      const res = await Miruro.relations(id);
      if (!res) {
        set.status = 404;
        return { message: "Anime relations not found" };
      }
      return res;
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["miruro"],
        summary: "Miruro — Relations",
        description: "All related media for an anime.",
      },
    }
  )

  .get(
    "/recommendations/:id",
    async ({ params: { id }, query: qs, set }) => {
      const page = parseInt(qs?.page as string) || 1;
      const perPage = parseInt(qs?.perPage as string) || 10;
      const res = await Miruro.recommendations(id, page, perPage);
      if (!res) {
        set.status = 404;
        return { message: "Anime recommendations not found" };
      }
      return res;
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({
        page: t.Optional(t.String()),
        perPage: t.Optional(t.String()),
      }),
      detail: {
        tags: ["miruro"],
        summary: "Miruro — Recommendations",
        description: "Community recommendations for an anime.",
      },
    }
  )

  // ── Streaming ───────────────────────────────────────────────────────────────
  .get(
    "/episodes/:id",
    async ({ params: { id }, set }) => {
      const res = await Miruro.episodes(id);
      if (!res) {
        set.status = 404;
        return { message: "Episodes not found" };
      }
      return res;
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["miruro"],
        summary: "Miruro — Episodes",
        description: "Get all available episodes for an anime.",
      },
    }
  )

  .get(
    "/watch/:provider/:anilistId/:category/:slug",
    async ({ params: { provider, anilistId, category, slug }, set }) => {
      const res = await Miruro.watch(provider, anilistId, category, slug);
      if (!res) {
        set.status = 404;
        return { message: "Stream sources not found" };
      }
      return res;
    },
    {
      params: t.Object({
        provider: t.String(),
        anilistId: t.String(),
        category: t.String(),
        slug: t.String(),
      }),
      detail: {
        tags: ["miruro"],
        summary: "Miruro — Watch",
        description: "Get M3U8 streaming sources for a specific episode.",
      },
    }
  );
