// lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AccountType } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate profiles dengan dukungan Custom Count
 */
export function generateProfiles(
  type: AccountType,
  customCount?: number // <--- Parameter Baru
): { profile: string; pin: string; used: boolean }[] {
  interface Profile {
    profile: string;
    pin: string;
    used: boolean;
  }

  const profileCounts: Record<AccountType, number> = {
    sharing: 20,
    private: 8,
    vip: 6,
  };

  const count = customCount ?? profileCounts[type] ?? 0;

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

  const profiles: Profile[] = Array.from({ length: count }).map((_, i) => ({
    profile: `Profile ${String.fromCharCode(65 + i)}`, // A, B, C...
    pin: pins[i % pins.length],
    used: false,
  }));

  return [...profiles].sort(() => Math.random() - 0.5);
}

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

export function calculateExpirationDate(
  createdAt: Date | string,
  customDays?: number
): Date {
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) throw new Error("Invalid createdAt date");
  date.setDate(date.getDate() + (customDays ?? 30));
  return date;
}

export function generateId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now()}`;
}
