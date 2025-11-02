// app/api/statistics/profiles/[type]/route.ts

import { NextResponse } from "next/server";
import { DatabaseService, AccountType } from "@/lib/database-service";

/**
 * --------------------------------------------------------------------------------
 * 🔹 GET /api/statistics/profiles/[type]
 * --------------------------------------------------------------------------------
 * Endpoint untuk mendapatkan jumlah profil yang tersedia (used: false)
 * untuk tipe akun tertentu secara real-time dari database.
 *
 * @param { params: { type: AccountType } } - Tipe akun ('private', 'sharing', 'vip').
 * @returns { NextResponse<{ count: number }> } - Jumlah profil tersedia atau error.
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { type: AccountType } } // Gunakan tipe AccountType
) {
  try {
    const { type } = params;

    // 1. Validasi tipe
    if (!type || !["private", "sharing", "vip"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid or missing account type parameter." },
        { status: 400 } // Bad Request
      );
    }

    console.log(`[API] Calculating available profile count for type: ${type}`);

    // 2. Panggil DatabaseService.getAvailableProfileCount
    const count = await DatabaseService.getAvailableProfileCount(type);

    console.log(`[API] Available ${type} profiles: ${count}`);

    // 3. Kembalikan hasil
    return NextResponse.json({ count: count }, { status: 200 }); // OK
  } catch (error: any) {
    console.error(
      `❌ [API] GET /api/statistics/profiles/${params.type} error:`,
      error.message
    );
    return NextResponse.json(
      { error: "Failed to calculate available profiles." },
      { status: 500 } // Internal Server Error
    );
  }
}
