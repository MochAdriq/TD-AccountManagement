// app/api/customer-assignments/check/[identifier]/route.ts

import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database-service";

/**
 * --------------------------------------------------------------------------------
 * 🔹 GET /api/customer-assignments/check/[identifier]
 * --------------------------------------------------------------------------------
 * Endpoint untuk mengecek apakah customer identifier sudah pernah digunakan.
 *
 * @param { params: { identifier: string } } - Customer identifier (nomor HP/nama).
 * @returns { NextResponse<{ used: boolean }> } - Status penggunaan identifier.
 */

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { identifier: string } }
) {
  try {
    const { identifier } = params;

    if (!identifier) {
      return NextResponse.json(
        { error: "Customer identifier is required." },
        { status: 400 } // Bad Request
      );
    }

    console.log(
      `[API] Checking if customer identifier is used: ${decodeURIComponent(
        identifier // Decode URL encoding (e.g., %20 for space)
      )}`
    );

    // Panggil fungsi dari DatabaseService
    const isUsed = await DatabaseService.isCustomerIdentifierUsed(
      decodeURIComponent(identifier) // Gunakan identifier yang sudah di-decode
    );

    console.log(
      `[API] Customer identifier "${decodeURIComponent(
        identifier
      )}" used status: ${isUsed}`
    );

    // Kembalikan respons sukses
    return NextResponse.json({ used: isUsed }, { status: 200 }); // OK
  } catch (error: any) {
    console.error(
      `❌ [API] GET /api/customer-assignments/check error:`,
      error.message
    );
    return NextResponse.json(
      { error: "Failed to check customer identifier." },
      { status: 500 } // Internal Server Error
    );
  }
}
