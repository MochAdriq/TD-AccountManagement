// app/api/operator-activities/route.ts

import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database-service";

/**
 * --------------------------------------------------------------------------------
 * 🔹 GET /api/operator-activities
 * --------------------------------------------------------------------------------
 * Endpoint untuk mengambil SEMUA log aktivitas operator dari database.
 * Diurutkan berdasarkan tanggal terbaru.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    console.log("[API] Fetching all operator activities...");

    // Panggil fungsi dari DatabaseService
    const activities = await DatabaseService.getAllOperatorActivities();

    console.log(`[API] Found ${activities.length} operator activities.`);

    // Kembalikan data
    return NextResponse.json(activities, { status: 200 }); // OK
  } catch (error: any) {
    console.error(
      "❌ [API] GET /api/operator-activities error:",
      error.message
    );
    return NextResponse.json(
      { error: "Failed to fetch operator activities." },
      { status: 500 } // Internal Server Error
    );
  }
}
