import { z } from "zod";

export interface MiruroPagedResult<T> {
  page: number;
  perPage: number;
  total: number;
  hasNextPage: boolean;
  results: T[];
}

export const miruroSearchItemSchema = z.object({
  id: z.number(),
  title: z.object({
    romaji: z.string().optional().nullable(),
    english: z.string().optional().nullable(),
    native: z.string().optional().nullable(),
  }).optional().nullable(),
  coverImage: z.object({
    large: z.string().optional().nullable(),
    extraLarge: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
  }).optional().nullable(),
  bannerImage: z.string().optional().nullable(),
  format: z.string().optional().nullable(),
  season: z.string().optional().nullable(),
  seasonYear: z.number().optional().nullable(),
  episodes: z.number().optional().nullable(),
  duration: z.number().optional().nullable(),
  status: z.string().optional().nullable(),
  averageScore: z.number().optional().nullable(),
  genres: z.array(z.string()).optional(),
}).catchall(z.any());

export type MiruroSearchItem = z.infer<typeof miruroSearchItemSchema>;

export const miruroSuggestionSchema = z.object({
  id: z.number(),
  title: z.string(),
  title_romaji: z.string().optional().nullable(),
  poster: z.string().optional().nullable(),
  format: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  year: z.number().optional().nullable(),
  episodes: z.number().optional().nullable(),
}).catchall(z.any());

export type MiruroSuggestion = z.infer<typeof miruroSuggestionSchema>;

export const miruroInfoSchema = z.any();

export type MiruroInfo = any;

export const miruroEpisodeSchema = z.object({
  id: z.string(),
  number: z.number(),
  title: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  airDate: z.string().optional().nullable(),
  duration: z.number().optional().nullable(),
  description: z.string().optional().nullable(),
  filler: z.boolean().optional().nullable(),
}).catchall(z.any());

export type MiruroEpisode = z.infer<typeof miruroEpisodeSchema>;
