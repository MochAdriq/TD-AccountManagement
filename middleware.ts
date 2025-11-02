// middleware.ts (DIPERBAIKI - Hapus Prisma)

import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

/**
 * Fungsi untuk memverifikasi token JWT (Edge-compatible)
 */
async function verifyToken(token: string, secret: Uint8Array): Promise<any> {
  try {
    const { payload } = await jose.jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null; // Token tidak valid atau kedaluwarsa
  }
}

// Middleware utama
export async function middleware(req: NextRequest) {
  // 1. Tentukan Kunci Rahasia
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error("Middleware: JWT_SECRET tidak disetel!");
    return NextResponse.json(
      { error: "Konfigurasi server error" },
      { status: 500 }
    );
  }
  const secretKey = new TextEncoder().encode(jwtSecret);

  // 2. Ambil token dari header Authorization
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.split(" ")[1]; // Format: "Bearer <token>"

  // 3. Jika tidak ada token, blokir request
  if (!token) {
    return NextResponse.json(
      { error: "Akses ditolak: Token tidak ada" },
      { status: 401 }
    );
  }

  // 4. Verifikasi token
  const payload = await verifyToken(token, secretKey);

  // Pastikan payload berisi ID dan ROLE
  if (!payload || !payload.id || !payload.role) {
    return NextResponse.json(
      { error: "Akses ditolak: Token tidak valid" },
      { status: 401 }
    );
  }

  // 5. VALIDASI ROLE (HANYA DARI TOKEN)
  // Ini adalah tugas utama middleware di sini
  if (payload.role !== "admin") {
    return NextResponse.json(
      { error: "Akses ditolak: Hanya admin" },
      { status: 403 } // 403 Forbidden
    );
  }

  // 6. Jika semua lolos, lanjutkan request
  // Request ini akan diteruskan ke app/api/users/route.ts
  return NextResponse.next();
}

/**
 * Matcher: Tentukan path API mana yang ingin Anda proteksi
 */
export const config = {
  matcher: "/api/users/:path*",
};
