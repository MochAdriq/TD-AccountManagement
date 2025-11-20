// lib/auth-server.ts

import { prisma } from "./prisma";
import type { ClientUser } from "./auth";
import jwt from "jsonwebtoken"; // <-- Import JWT library

// ============================================================
// 1️⃣ VALIDATE USER (Login)
// ============================================================
export async function validateUser(
  username: string,
  password: string
): Promise<ClientUser | null> {
  try {
    console.log("=== SERVER LOGIN VALIDATION ===");

    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (!user) {
      console.warn("❌ User tidak ditemukan");
      return null;
    }

    if (user.password !== password.trim()) {
      console.warn("❌ Password salah");
      return null;
    }

    const sessionUser: ClientUser = {
      id: user.id,
      username: user.username,
      name: user.name || null,
      role: user.role as "admin" | "operator",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    console.log("✅ Login berhasil:", user.username);
    return sessionUser;
  } catch (error) {
    console.error("❌ Login error:", error);
    return null;
  }
}

// ============================================================
// 2️⃣ VERIFY AUTH (Middleware Helper) - [FUNGSI BARU]
// ============================================================
export async function verifyAuth(req: Request): Promise<ClientUser | null> {
  try {
    // 1. Ambil header Authorization
    const authHeader =
      req.headers.get("Authorization") || req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null; // Tidak ada token
    }

    // 2. Ambil tokennya saja
    const token = authHeader.split(" ")[1];

    // 3. Pastikan Secret Key ada
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("❌ JWT_SECRET belum disetting di .env");
      return null;
    }

    // 4. Verifikasi Token JWT
    const decoded = jwt.verify(token, secret) as ClientUser;

    // 5. Kembalikan data user
    return decoded;
  } catch (error) {
    // Token expired atau invalid signature
    // console.error("⚠️ Auth verification failed:", error);
    return null;
  }
}

// ============================================================
// 3️⃣ GET ALL USERS (Admin Only)
// ============================================================
export async function getAllUsers(): Promise<ClientUser[]> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return users.map((u) => ({
      ...u,
      name: u.name || null,
      role: u.role as "admin" | "operator",
    }));
  } catch (error) {
    console.error("❌ Gagal ambil users:", error);
    return [];
  }
}

// ============================================================
// 4️⃣ ADD USER
// ============================================================
export async function addUser(data: {
  username: string;
  password: string;
  role: "admin" | "operator";
  name?: string | null;
}): Promise<boolean> {
  try {
    await prisma.user.create({
      data: {
        username: data.username.trim(),
        password: data.password.trim(),
        role: data.role,
        name: data.name ? data.name.trim() : null,
      },
    });
    console.log("✅ User ditambahkan:", data.username);
    return true;
  } catch (error) {
    console.error("❌ Gagal tambah user:", error);
    return false;
  }
}

// ============================================================
// 5️⃣ UPDATE USER PASSWORD
// ============================================================
export async function updateUserPassword(
  username: string,
  newPassword: string
): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { username: username.trim() },
      data: { password: newPassword.trim() },
    });
    console.log("✅ Password diubah:", username);
    return true;
  } catch (error) {
    console.error("❌ Gagal update password:", error);
    return false;
  }
}

// ============================================================
// 6️⃣ DELETE USER
// ============================================================
export async function deleteUser(username: string): Promise<boolean> {
  if (username.toLowerCase() === "admin") {
    console.warn("⚠️ Admin utama tidak boleh dihapus.");
    return false;
  }
  try {
    await prisma.user.delete({
      where: { username: username.trim() },
    });
    console.log("✅ User dihapus:", username);
    return true;
  } catch (error) {
    console.error("❌ Gagal hapus user:", error);
    return false;
  }
}
