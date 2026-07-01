import { gunzipSync } from "node:zlib";
import { remapManager } from "../../../core/remapManager";

export function applyRemapsToMedia(media: any): any {
    if (!media || !media.id) return media;
    const remap = remapManager.getRemap(media.id);
    if (!remap) return media;

    if (media.title) {
        if (remap.name) {
            media.title.english = remap.name;
        }
    }

    if (media.coverImage) {
        if (remap.poster_img) {
            media.coverImage.extraLarge = remap.poster_img;
            media.coverImage.large = remap.poster_img;
        }
    }

    if (remap.banner || remap.banner_image) {
        media.bannerImage = remap.banner || remap.banner_image;
    }

    if (remap.description) {
        media.description = remap.description;
    }

    if (remap.logo || remap.clear_logo) {
        media.logo = remap.logo || remap.clear_logo;
    }
    
    return media;
}

export const MEDIA_LIST_FIELDS = `
    id
    title { romaji english native }
    coverImage { large extraLarge }
    bannerImage
    format
    season
    seasonYear
    episodes
    duration
    status
    averageScore
    meanScore
    popularity
    favourites
    genres
    source
    countryOfOrigin
    isAdult
    studios(isMain: true) { nodes { name isAnimationStudio } }
    nextAiringEpisode { episode airingAt timeUntilAiring }
    startDate { year month day }
    endDate { year month day }
`;

export const MEDIA_FULL_FIELDS = `
    id
    idMal
    title { romaji english native }
    description(asHtml: false)
    coverImage { large extraLarge color }
    bannerImage
    format
    season
    seasonYear
    episodes
    duration
    status
    averageScore
    meanScore
    popularity
    favourites
    trending
    genres
    tags { name rank isMediaSpoiler }
    source
    countryOfOrigin
    isAdult
    hashtag
    synonyms
    siteUrl
    trailer { id site thumbnail }
    studios { nodes { id name isAnimationStudio siteUrl } }
    nextAiringEpisode { episode airingAt timeUntilAiring }
    startDate { year month day }
    endDate { year month day }
    characters(sort: [ROLE, RELEVANCE], perPage: 25) {
        edges {
            role
            node { id name { full native } image { large } }
            voiceActors(language: JAPANESE) { id name { full native } image { large } languageV2 }
        }
    }
    staff(sort: RELEVANCE, perPage: 25) {
        edges {
            role
            node { id name { full native } image { large } }
        }
    }
    relations {
        edges {
            relationType(version: 2)
            node {
                id
                title { romaji english native }
                coverImage { large }
                format
                type
                status
                episodes
                meanScore
            }
        }
    }
    recommendations(sort: RATING_DESC, perPage: 10) {
        nodes {
            rating
            mediaRecommendation {
                id
                title { romaji english native }
                coverImage { large }
                format
                episodes
                status
                meanScore
                averageScore
            }
        }
    }
    externalLinks { url site type }
    streamingEpisodes { title thumbnail url site }
    stats {
        scoreDistribution { score amount }
        statusDistribution { status amount }
    }
`;

export function encodePipeRequest(payload: any): string {
    return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodePipeResponse(encodedStr: string): any {
    const compressed = Buffer.from(encodedStr, "base64url");
    const decompressed = gunzipSync(compressed);
    return JSON.parse(decompressed.toString("utf-8"));
}

export function translateId(encodedId: string): string {
    try {
        const decoded = Buffer.from(encodedId, "base64url").toString("utf-8");
        if (decoded.includes(":")) {
            return decoded;
        }
        return encodedId;
    } catch (e) {
        return encodedId;
    }
}

export function deepTranslate(obj: any): void {
    if (Array.isArray(obj)) {
        for (const item of obj) {
            if (typeof item === "object" && item !== null) {
                deepTranslate(item);
            }
        }
    } else if (typeof obj === "object" && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
            if (key === "id" && typeof value === "string") {
                obj[key as keyof typeof obj] = translateId(value);
            } else if (typeof value === "object" && value !== null) {
                deepTranslate(value);
            }
        }
    }
}

export function injectSourceSlugs(data: any, anilistId: number | string): any {
    const providers = data?.providers || {};
    for (const [providerName, providerData] of Object.entries(providers)) {
        if (typeof providerData !== "object" || providerData === null) continue;

        let episodes = (providerData as any).episodes || {};
        if (typeof episodes !== "object" || episodes === null) continue;

        // Sometimes providers return a flat list
        if (Array.isArray(episodes)) {
            (providerData as any).episodes = { sub: episodes };
            episodes = (providerData as any).episodes;
        }

        for (const [category, epList] of Object.entries(episodes)) {
            if (!Array.isArray(epList)) continue;
            for (const ep of epList) {
                if (typeof ep !== "object" || ep === null) continue;
                if ("id" in ep && "number" in ep) {
                    const origId = String(ep.id);
                    const prefix = origId.includes(":") ? origId.split(":")[0] : origId;
                    ep.id = `watch/${providerName}/${anilistId}/${category}/${prefix}-${ep.number}`;
                }
            }
        }
    }
    return data;
}
