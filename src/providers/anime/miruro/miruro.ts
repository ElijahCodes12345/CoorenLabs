import { remapManager } from "../../../core/remapManager";
import { extractAniZipImages, fetchWithRetry } from "../../meta/anilist/lib/helpers";
import { Logger } from "../../../core/logger";
import { miruro as miruroOrigin } from "../../origins";
import {
  MEDIA_FULL_FIELDS,
  MEDIA_LIST_FIELDS,
  decodePipeResponse,
  deepTranslate,
  encodePipeRequest,
  injectSourceSlugs,
  applyRemapsToMedia,
} from "./utils";

const ANILIST_URL = "https://graphql.anilist.co";

export class Miruro {
  private static pipeUrl = `${miruroOrigin}/api/secure/pipe`;

  private static headers(): Record<string, string> {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      Referer: `${miruroOrigin}/`,
    };
  }

  private static async anilistQuery(query: string, variables?: Record<string, any>): Promise<any> {
    const body: any = { query };
    if (variables) body.variables = variables;

    const res = await fetch(ANILIST_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`AniList query failed: HTTP ${res.status}`);
    }
    const json = await res.json();
    return json.data || {};
  }

  private static async fetchRawEpisodes(anilistId: string | number): Promise<any> {
    const payload = {
      path: "episodes",
      method: "GET",
      query: { anilistId: Number(anilistId) },
      body: null,
      version: "0.1.0",
    };
    const encodedReq = encodePipeRequest(payload);
    
    const res = await fetch(`${this.pipeUrl}?e=${encodedReq}`, {
      headers: this.headers(),
    });
    
    if (!res.ok) {
      throw new Error(`Pipe request failed: HTTP ${res.status}`);
    }
    const text = await res.text();
    const data = decodePipeResponse(text.trim());
    deepTranslate(data);
    return data;
  }

  // ─── Search & Discovery ──────────────────────────────────────────────────────

  static async search(query: string, page = 1, perPage = 20) {
    try {
      const gql = `
        query ($search: String, $page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            pageInfo { total currentPage lastPage hasNextPage perPage }
            media(search: $search, type: ANIME, sort: SEARCH_MATCH, isAdult: false) {
              ${MEDIA_LIST_FIELDS}
            }
          }
        }
      `;
      const data = await this.anilistQuery(gql, { search: query, page, perPage });
      const pageInfo = data.Page?.pageInfo || {};
      return {
        page: pageInfo.currentPage || page,
        perPage: pageInfo.perPage || perPage,
        total: pageInfo.total || 0,
        hasNextPage: pageInfo.hasNextPage || false,
        results: (data.Page?.media || []).map(applyRemapsToMedia),
      };
    } catch (err) {
      Logger.error(`Miruro search error: ${String(err)}`);
      return null;
    }
  }

  static async suggestions(query: string) {
    try {
      const gql = `
        query ($search: String) {
          Page(page: 1, perPage: 8) {
            media(search: $search, type: ANIME, sort: SEARCH_MATCH, isAdult: false) {
              id
              title { romaji english }
              coverImage { large }
              format
              status
              startDate { year }
              episodes
            }
          }
        }
      `;
      const data = await this.anilistQuery(gql, { search: query });
      const results = (data.Page?.media || []).map(applyRemapsToMedia).map((item: any) => ({
        id: item.id,
        title: item.title?.english || item.title?.romaji,
        title_romaji: item.title?.romaji,
        poster: item.coverImage?.large,
        format: item.format,
        status: item.status,
        year: item.startDate?.year,
        episodes: item.episodes,
      }));
      return { suggestions: results };
    } catch (err) {
      Logger.error(`Miruro suggestions error: ${String(err)}`);
      return null;
    }
  }

  static async filter(params: any) {
    try {
      const sortMap: Record<string, string> = {
        SCORE_DESC: "SCORE_DESC",
        POPULARITY_DESC: "POPULARITY_DESC",
        TRENDING_DESC: "TRENDING_DESC",
        START_DATE_DESC: "START_DATE_DESC",
        FAVOURITES_DESC: "FAVOURITES_DESC",
        UPDATED_AT_DESC: "UPDATED_AT_DESC",
      };

      const sort = sortMap[params.sort] || "POPULARITY_DESC";
      const args = ["type: ANIME", `sort: [${sort}]`, "isAdult: false"];
      const variables: any = {
        page: Number(params.page) || 1,
        perPage: Number(params.per_page) || 20,
      };

      const varTypes = ["$page: Int", "$perPage: Int"];

      if (params.genre) {
        args.push("genre: $genre");
        variables.genre = params.genre;
        varTypes.push("$genre: String");
      }
      if (params.tag) {
        args.push("tag: $tag");
        variables.tag = params.tag;
        varTypes.push("$tag: String");
      }
      if (params.year) {
        args.push("seasonYear: $seasonYear");
        variables.seasonYear = Number(params.year);
        varTypes.push("$seasonYear: Int");
      }
      if (params.season) {
        args.push("season: $season");
        variables.season = String(params.season).toUpperCase();
        varTypes.push("$season: MediaSeason");
      }
      if (params.format) {
        args.push("format: $format");
        variables.format = String(params.format).toUpperCase();
        varTypes.push("$format: MediaFormat");
      }
      if (params.status) {
        args.push("status: $status");
        variables.status = String(params.status).toUpperCase();
        varTypes.push("$status: MediaStatus");
      }

      const gql = `
        query (${varTypes.join(", ")}) {
          Page(page: $page, perPage: $perPage) {
            pageInfo { total currentPage lastPage hasNextPage perPage }
            media(${args.join(", ")}) {
              ${MEDIA_LIST_FIELDS}
            }
          }
        }
      `;
      const data = await this.anilistQuery(gql, variables);
      const pageInfo = data.Page?.pageInfo || {};
      return {
        page: pageInfo.currentPage || variables.page,
        perPage: pageInfo.perPage || variables.perPage,
        total: pageInfo.total || 0,
        hasNextPage: pageInfo.hasNextPage || false,
        results: (data.Page?.media || []).map(applyRemapsToMedia),
      };
    } catch (err) {
      Logger.error(`Miruro filter error: ${String(err)}`);
      return null;
    }
  }

  // ─── Collections ─────────────────────────────────────────────────────────────

  private static async fetchCollection(sortType: string, status?: string, page = 1, perPage = 20, allowAll = false) {
    try {
      const statusFilter = status ? `, status: ${status}` : "";
      const countryFilter = allowAll ? "" : `, countryOfOrigin: "JP"`;
      const gql = `
        query ($page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            pageInfo { total currentPage lastPage hasNextPage perPage }
            media(type: ANIME, sort: [${sortType}]${statusFilter}${countryFilter}, isAdult: false) {
              ${MEDIA_LIST_FIELDS}
            }
          }
        }
      `;
      const data = await this.anilistQuery(gql, { page, perPage });
      const pageInfo = data.Page?.pageInfo || {};
      return {
        page: pageInfo.currentPage || page,
        perPage: pageInfo.perPage || perPage,
        total: pageInfo.total || 0,
        hasNextPage: pageInfo.hasNextPage || false,
        results: (data.Page?.media || []).map(applyRemapsToMedia),
      };
    } catch (err) {
      Logger.error(`Miruro collection error: ${String(err)}`);
      return null;
    }
  }

  static async trending(page = 1, perPage = 20, allowAll = false) {
    return this.fetchCollection("TRENDING_DESC", undefined, page, perPage, allowAll);
  }

  static async popular(page = 1, perPage = 20, allowAll = false) {
    return this.fetchCollection("POPULARITY_DESC", undefined, page, perPage, allowAll);
  }

  static async upcoming(page = 1, perPage = 20, allowAll = false) {
    return this.fetchCollection("POPULARITY_DESC", "NOT_YET_RELEASED", page, perPage, allowAll);
  }

  static async recent(page = 1, perPage = 20, allowAll = false) {
    return this.fetchCollection("START_DATE_DESC", "RELEASING", page, perPage, allowAll);
  }

  static async spotlight(allowAll = false) {
    try {
      const countryFilter = allowAll ? "" : `, countryOfOrigin: "JP"`;
      const gql = `
        query {
          Page(page: 1, perPage: 10) {
            media(sort: [TRENDING_DESC, POPULARITY_DESC], type: ANIME${countryFilter}, isAdult: false) {
              ${MEDIA_LIST_FIELDS}
              description(asHtml: false)
            }
          }
        }
      `;
      const data = await this.anilistQuery(gql);
      const mediaList = data.Page?.media || [];
      
      const results = await Promise.all(
        mediaList.map(async (media: any) => {
          media = applyRemapsToMedia(media);
          try {
            const aniZipResponse = await fetchWithRetry(`https://api.ani.zip/mappings?anilist_id=${media.id}`)
              .then((r) => r.json())
              .catch(() => null);

            const remap = remapManager.getRemap(media.id);
            const { banner, logo } = extractAniZipImages(aniZipResponse, remap);

            media.bannerImage = banner || media.bannerImage;
            media.logo = logo || media.logo;
          } catch (e) {
            // ignore
          }
          return media;
        })
      );

      return { results };
    } catch (err) {
      Logger.error(`Miruro spotlight error: ${String(err)}`);
      return null;
    }
  }

  static async schedule(page = 1, perPage = 20) {
    try {
      const gql = `
        query ($page: Int, $perPage: Int) {
          Page(page: $page, perPage: $perPage) {
            pageInfo { total currentPage lastPage hasNextPage perPage }
            airingSchedules(notYetAired: true, sort: TIME) {
              episode
              airingAt
              timeUntilAiring
              media {
                ${MEDIA_LIST_FIELDS}
              }
            }
          }
        }
      `;
      const data = await this.anilistQuery(gql, { page, perPage });
      const pageInfo = data.Page?.pageInfo || {};
      const results = (data.Page?.airingSchedules || []).map((item: any) => {
        const entry = item.media ? applyRemapsToMedia(item.media) : {};
        entry.next_episode = item.episode;
        entry.airingAt = item.airingAt;
        entry.timeUntilAiring = item.timeUntilAiring;
        return entry;
      });
      return {
        page: pageInfo.currentPage || page,
        perPage: pageInfo.perPage || perPage,
        total: pageInfo.total || 0,
        hasNextPage: pageInfo.hasNextPage || false,
        results,
      };
    } catch (err) {
      Logger.error(`Miruro schedule error: ${String(err)}`);
      return null;
    }
  }

  // ─── Anime Details ───────────────────────────────────────────────────────────

  static async info(anilistId: string | number) {
    try {
      const gql = `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            ${MEDIA_FULL_FIELDS}
          }
        }
      `;
      const [data, aniZipResponse] = await Promise.all([
        this.anilistQuery(gql, { id: Number(anilistId) }),
        fetchWithRetry(`https://api.ani.zip/mappings?anilist_id=${anilistId}`)
          .then((r) => r.json())
          .catch(() => null)
      ]);
      
      if (!data.Media) return null;
      const media = applyRemapsToMedia(data.Media);

      const remap = remapManager.getRemap(anilistId);
      const { banner, logo } = extractAniZipImages(aniZipResponse, remap);

      media.bannerImage = banner || media.bannerImage;
      media.logo = logo || media.logo;

      return media;
    } catch (err) {
      Logger.error(`Miruro info error: ${String(err)}`);
      return null;
    }
  }

  static async characters(anilistId: string | number, page = 1, perPage = 25) {
    try {
      const gql = `
        query ($id: Int, $page: Int, $perPage: Int) {
          Media(id: $id, type: ANIME) {
            id
            title { romaji english }
            characters(sort: [ROLE, RELEVANCE], page: $page, perPage: $perPage) {
              pageInfo { total currentPage lastPage hasNextPage perPage }
              edges {
                role
                node {
                  id
                  name { full native userPreferred }
                  image { large medium }
                  description
                  gender
                  dateOfBirth { year month day }
                  age
                  favourites
                  siteUrl
                }
                voiceActors {
                  id
                  name { full native }
                  image { large }
                  languageV2
                }
              }
            }
          }
        }
      `;
      const data = await this.anilistQuery(gql, { id: Number(anilistId), page, perPage });
      const chars = data.Media?.characters || {};
      const pageInfo = chars.pageInfo || {};
      return {
        page: pageInfo.currentPage || page,
        perPage: pageInfo.perPage || perPage,
        total: pageInfo.total || 0,
        hasNextPage: pageInfo.hasNextPage || false,
        characters: chars.edges || [],
      };
    } catch (err) {
      Logger.error(`Miruro characters error: ${String(err)}`);
      return null;
    }
  }

  static async relations(anilistId: string | number) {
    try {
      const gql = `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            id
            title { romaji english }
            relations {
              edges {
                relationType(version: 2)
                node {
                  id
                  title { romaji english native }
                  coverImage { large }
                  bannerImage
                  format
                  type
                  status
                  episodes
                  chapters
                  meanScore
                  averageScore
                  popularity
                  startDate { year month day }
                }
              }
            }
          }
        }
      `;
      const data = await this.anilistQuery(gql, { id: Number(anilistId) });
      if (!data.Media) return null;
      return {
        id: data.Media.id,
        title: data.Media.title,
        relations: (data.Media.relations?.edges || []).map((e: any) => {
          if (e.node) applyRemapsToMedia(e.node);
          return e;
        }),
      };
    } catch (err) {
      Logger.error(`Miruro relations error: ${String(err)}`);
      return null;
    }
  }

  static async recommendations(anilistId: string | number, page = 1, perPage = 10) {
    try {
      const gql = `
        query ($id: Int, $page: Int, $perPage: Int) {
          Media(id: $id, type: ANIME) {
            id
            title { romaji english }
            recommendations(sort: RATING_DESC, page: $page, perPage: $perPage) {
              pageInfo { total currentPage lastPage hasNextPage perPage }
              nodes {
                rating
                mediaRecommendation {
                  id
                  title { romaji english native }
                  coverImage { large extraLarge }
                  bannerImage
                  format
                  episodes
                  status
                  meanScore
                  averageScore
                  popularity
                  genres
                  startDate { year }
                }
              }
            }
          }
        }
      `;
      const data = await this.anilistQuery(gql, { id: Number(anilistId), page, perPage });
      const recs = data.Media?.recommendations || {};
      const pageInfo = recs.pageInfo || {};
      return {
        page: pageInfo.currentPage || page,
        perPage: pageInfo.perPage || perPage,
        total: pageInfo.total || 0,
        hasNextPage: pageInfo.hasNextPage || false,
        recommendations: (recs.nodes || []).map((n: any) => {
          if (n.mediaRecommendation) applyRemapsToMedia(n.mediaRecommendation);
          return n;
        }),
      };
    } catch (err) {
      Logger.error(`Miruro recommendations error: ${String(err)}`);
      return null;
    }
  }

  // ─── Streaming ───────────────────────────────────────────────────────────────

  static async episodes(anilistId: string | number) {
    try {
      const data = await this.fetchRawEpisodes(anilistId);
      return injectSourceSlugs(data, anilistId);
    } catch (err) {
      Logger.error(`Miruro episodes error: ${String(err)}`);
      return null;
    }
  }

  static async watch(provider: string, anilistId: string | number, category: string, slug: string) {
    try {
      const data = await this.fetchRawEpisodes(anilistId);
      const provData = data.providers?.[provider] || {};
      
      let epList = provData.episodes?.[category] || [];
      if (!Array.isArray(epList) && Array.isArray(provData.episodes)) {
        epList = provData.episodes; // fallback for flat arrays
      }

      let targetId = null;
      for (const ep of epList) {
        const origId = String(ep.id || "");
        const prefix = origId.includes(":") ? origId.split(":")[0] : origId;
        const generated = `${prefix}-${ep.number}`;
        if (generated === slug) {
          targetId = origId;
          break;
        }
      }

      if (!targetId) {
        throw new Error(`Episode slug '${slug}' not found for provider ${provider}`);
      }

      // Hit secure pipe for sources
      const encId = Buffer.from(targetId).toString("base64url");
      const payload = {
        path: "sources",
        method: "GET",
        query: {
          episodeId: encId,
          provider,
          category,
          anilistId: Number(anilistId),
        },
        body: null,
        version: "0.1.0",
      };

      const encodedReq = encodePipeRequest(payload);
      const res = await fetch(`${this.pipeUrl}?e=${encodedReq}`, {
        headers: this.headers(),
      });

      if (!res.ok) {
        throw new Error(`Pipe request failed: HTTP ${res.status}`);
      }
      const text = await res.text();
      return decodePipeResponse(text.trim());
    } catch (err) {
      Logger.error(`Miruro watch error: ${String(err)}`);
      return null;
    }
  }

  static async watchById(episodeId: string) {
    // Deprecated by slug watch
    return null;
  }
}
