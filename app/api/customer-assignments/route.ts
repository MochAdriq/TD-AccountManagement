// app/api/customer-assignments/route.ts

import { NextResponse } from "next/server";
// Pastikan AccountType juga diimpor jika belum
import { DatabaseService, AccountType } from "@/lib/database-service";
import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";

// Tambahkan ini untuk mencegah caching API yang agresif (jika diperlukan)
export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Pastikan runtime nodejs jika menggunakan Prisma

/**
 * --------------------------------------------------------------------------------
 * 🔹 GET /api/customer-assignments
 * --------------------------------------------------------------------------------
 * Endpoint untuk mengambil SEMUA history assignment (termasuk relasi WA).
 * Fungsi ini sudah benar karena memanggil getAllCustomerAssignments yang sudah diupdate.
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[API] Fetching all customer assignments history...");

    // Fungsi ini sudah mengambil whatsappAccount berdasarkan perbaikan di database-service.ts
    const assignments = await DatabaseService.getAllCustomerAssignments();

    console.log(`[API] Found ${assignments.length} total assignments.`);

    return NextResponse.json(assignments, { status: 200 }); // OK
  } catch (error: any) {
    console.error(
      "❌ [API] GET /api/customer-assignments error:",
      error.message
    );
    return NextResponse.json(
      { error: "Failed to fetch assignment history." },
      { status: 500 }
    );
  }
}

/**
 * --------------------------------------------------------------------------------
 * 🔹 POST /api/customer-assignments
 * --------------------------------------------------------------------------------
 * Endpoint untuk membuat assignment baru (menugaskan akun ke customer).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerIdentifier,
      accountId,
      accountEmail,
      accountType,
      whatsappAccountId, // <-- PERBAIKAN: Ambil whatsappAccountId dari body
      operatorName,
    } = body;

    // 1. Validasi input dasar
    if (!customerIdentifier || !accountId || !accountEmail || !accountType) {
      return NextResponse.json(
        {
          error:
            "Missing required fields for assignment (customer, accountId, email, type).",
        },
        { status: 400 } // Bad Request
      );
    }

    // Validasi tipe akun
    if (!["private", "sharing", "vip"].includes(accountType)) {
      return NextResponse.json(
        { error: `Invalid account type: ${accountType}` },
        { status: 400 }
      );
    }

    console.log(
      `[API] Attempting to assign account ${accountId} to customer "${customerIdentifier}" using WA ID "${whatsappAccountId}" by operator "${
        operatorName ?? "System"
      }"` // Log diperbarui
    );

    // 2. Panggil DatabaseService.addCustomerAssignment
    const newAssignment = await DatabaseService.addCustomerAssignment({
      customerIdentifier,
      accountId,
      accountEmail,
      accountType: accountType as AccountType, // Pastikan tipe sesuai
      whatsappAccountId: whatsappAccountId, // <-- PERBAIKAN: Teruskan whatsappAccountId
      operatorName: operatorName,
    });

    console.log(
      `[API] Successfully created assignment ID: ${newAssignment.id} with profile ${newAssignment.profileName} and WA ID ${newAssignment.whatsappAccountId}` // Log diperbarui
    );

    // 3. Kembalikan respons sukses
    return NextResponse.json(newAssignment, { status: 201 }); // 201 Created
  } catch (error: any) {
    console.error("❌ [API] POST /api/customer-assignments error:", error);

    // Tangani error spesifik dari DatabaseService
    if (
      error.message.includes("not found") ||
      error.message.includes("No available profiles") ||
      error.message.includes("Invalid profiles JSON")
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 }); // Conflict or Not Found
    }

    // Tangani error Prisma lainnya jika perlu
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Contoh: error constraint unik
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Database constraint violation." },
          { status: 409 } // Conflict
        );
      }
    }

    // Error umum
    return NextResponse.json(
      { error: "Failed to create customer assignment." },
      { status: 500 } // Internal Server Error
    );
  }
}
