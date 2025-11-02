// app/api/accounts/search/route.ts

import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database-service";

export const runtime = "nodejs"; // Prisma needs Node.js
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const emailQuery = searchParams.get("email"); // Get the 'email' query parameter

    // --- Validation ---
    if (!emailQuery || emailQuery.trim() === "") {
      return NextResponse.json(
        { error: "Query parameter 'email' is required and cannot be empty." },
        { status: 400 } // Bad Request
      );
    }

    // --- Perform Search using DatabaseService ---
    // We'll create a new method in DatabaseService for this
    console.log(`Searching for accounts with email containing: ${emailQuery}`);
    const foundAccounts = await DatabaseService.searchAccountsByEmail(
      emailQuery
    );

    // --- Return Results ---
    // Return an array, even if only one or zero results are found
    return NextResponse.json(foundAccounts);
  } catch (error: any) {
    console.error("Error searching accounts by email:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search accounts by email" },
      { status: 500 } // Internal Server Error
    );
  }
}

// --- IMPORTANT: Add the searchAccountsByEmail method to DatabaseService ---
// You need to add the following static method inside your
// 'DatabaseService' class in 'lib/database-service.ts':

/*
  // Inside class DatabaseService in lib/database-service.ts
  static async searchAccountsByEmail(emailQuery: string) {
    if (!emailQuery) return []; // Return empty if query is empty

    return prisma.account.findMany({
      where: {
        email: {
          contains: emailQuery, // Case-insensitive search by default in PostgreSQL with Prisma
          mode: 'insensitive', // Explicitly set case-insensitive mode
        },
      },
      orderBy: {
        createdAt: 'desc', // Optional: order results
      },
      take: 20, // Optional: Limit the number of results
    });
  }
*/
