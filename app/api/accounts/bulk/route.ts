// app/api/accounts/bulk/route.ts

import { NextRequest, NextResponse } from "next/server";
import { DatabaseService, AccountType } from "@/lib/database-service";
import { Prisma, PlatformType as PrismaPlatformType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AccountInput {
  email: string;
  password: string;
  type: AccountType;
  platform: PrismaPlatformType;
}
interface BulkImportPayload {
  accounts: AccountInput[];
  expiresAt: string;
  customProfileCount?: number; // <--- New Payload Field
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accounts, expiresAt, customProfileCount }: BulkImportPayload = body;

    if (!Array.isArray(accounts) || accounts.length === 0) {
      return NextResponse.json(
        { error: "Input 'accounts' kosong." },
        { status: 400 }
      );
    }
    if (!expiresAt) {
      return NextResponse.json(
        { error: "Input 'expiresAt' diperlukan." },
        { status: 400 }
      );
    }

    const expiresAtDate = new Date(expiresAt);
    if (isNaN(expiresAtDate.getTime())) {
      return NextResponse.json(
        { error: "Format tanggal tidak valid." },
        { status: 400 }
      );
    }

    // Validasi item
    for (const acc of accounts) {
      if (!acc.email || !acc.password || !acc.type || !acc.platform) {
        return NextResponse.json(
          { error: `Data akun tidak lengkap.` },
          { status: 400 }
        );
      }
    }

    console.log(
      `Attempting bulk import for ${accounts.length} accounts. Custom Count: ${
        customProfileCount || "Default"
      }`
    );

    const result = await DatabaseService.addMultipleAccounts(
      accounts,
      expiresAtDate,
      customProfileCount // <--- Kirim ke Service
    );

    // Hitung Duplikat
    const totalTried = accounts.length;
    const successCount = result.count;
    const duplicateCount = totalTried - successCount;

    console.log(
      `Bulk Result: ${successCount} Success, ${duplicateCount} Duplicate.`
    );

    return NextResponse.json(
      {
        message: "Bulk import processed",
        processedCount: successCount,
        duplicateCount: duplicateCount, // <--- Return info duplikat
        totalTried: totalTried,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error during bulk account import:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process bulk import" },
      { status: 500 }
    );
  }
}
