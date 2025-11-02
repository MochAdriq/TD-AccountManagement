// lib/constants.ts

import { PlatformType } from "@prisma/client";

/**
 * Mapping dari key Enum PlatformType (database) ke nama yang ditampilkan di UI.
 * Pastikan semua key dari enum PlatformType di schema.prisma ada di sini.
 */
export const PLATFORM_DISPLAY_NAMES: Record<PlatformType, string> = {
  CANVA_1_BULAN: "Canva (1 Bulan)",
  CANVA_1_TAHUN: "Canva (1 Tahun)",
  CAPCUT: "Capcut",
  CHAT_GPT: "CHAT GPT",
  DISNEY: "Disney+",
  HBO: "HBO Go",
  LOKLOK: "LOKLOK",
  NETFLIX: "Netflix",
  PRIMEVIDEO: "Prime Video",
  SPOTIFY_FAMPLAN_1_BULAN: "Spotify (1 Bulan)",
  SPOTIFY_FAMPLAN_2_BULAN: "Spotify (2 Bulan)",
  VIDIO_DIAMOND_MOBILE: "Vidio Diamond Mobile",
  VIDIO_PLATINUM: "Vidio Platinum",
  VIU_1_BULAN: "Viu (1 Bulan)",
  WE_TV: "WE TV",
  YOUTUBE_1_BULAN: "YT 1 Bulan",
};

/**
 * Array objek { key, name } untuk digunakan di dropdown/select.
 * Dibuat otomatis dari PLATFORM_DISPLAY_NAMES & diurutkan A-Z by name.
 */
export const PLATFORM_LIST: { key: PlatformType; name: string }[] =
  Object.entries(PLATFORM_DISPLAY_NAMES)
    .map(([key, name]) => ({
      key: key as PlatformType,
      name: name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
