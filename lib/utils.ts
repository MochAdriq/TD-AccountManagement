// lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
// Impor tipe AccountType dari Prisma
import type { AccountType } from "@prisma/client";

/**
 * Merge Tailwind CSS classes safely
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate profiles and PINs based on account type.
 * - sharing: 20 profiles
 * - private: 8 profiles
 * - vip: 6 profiles
 * Profiles are named A, B, C... and the result is randomized.
 *
 * @param type AccountType from @prisma/client
 * @returns Array of { profile: string, pin: string, used: boolean }
 */
export function generateProfiles(
  type: AccountType
): { profile: string; pin: string; used: boolean }[] {
  // Pastikan tipe Profile sesuai
  interface Profile {
    profile: string;
    pin: string;
    used: boolean;
  }

  const profileCounts: Record<AccountType, number> = {
    sharing: 20,
    private: 8,
    vip: 6, // Pastikan ini sesuai schema.prisma
  };

  // Handle jika tipe tidak valid (seharusnya tidak terjadi jika dari Prisma)
  if (!profileCounts[type]) {
    console.warn(
      `generateProfiles called with invalid type: ${type}. Defaulting to 0.`
    );
    return [];
  }

  const pins = [
    "1111",
    "2222",
    "3333",
    "4444",
    "5555",
    "6666",
    "7777",
    "8888",
    "9999",
    "0000",
  ];

  const count = profileCounts[type];
  const profiles: Profile[] = Array.from({ length: count }).map((_, i) => ({
    // Menggunakan A, B, C... untuk nama profil
    profile: `Profile ${String.fromCharCode(65 + i)}`,
    pin: pins[i % pins.length],
    used: false,
  }));

  // Acak urutan array profiles sebelum dikembalikan
  return [...profiles].sort(() => Math.random() - 0.5);
}

/**
 * Format a date into a readable string.
 * Example: 23 Okt 2025 (for id-ID)
 */
export function formatDate(
  dateSource: string | Date | null | undefined,
  locale = "id-ID"
): string {
  if (!dateSource) return "-";
  try {
    const date = new Date(dateSource);
    if (isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return "-";
  }
}

/**
 * Calculate expiration date (+30 days default, sesuaikan jika perlu)
 */
export function calculateExpirationDate(
  createdAt: Date | string,
  customDays?: number
): Date {
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) throw new Error("Invalid createdAt date");
  // Default diubah jadi 30 hari agar konsisten dengan addAccount
  date.setDate(date.getDate() + (customDays ?? 30));
  return date;
}

/**
 * Simple UUID-like generator for client-side temp IDs.
 */
export function generateId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now()}`;
}
