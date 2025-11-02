// lib/auth-server.ts (SUDAH DIPERBAIKI - HANYA SERVER-SIDE)

import { prisma } from "./prisma";
import type { ClientUser } from "./auth"; // Kita impor tipe dari file client

// ============================================================
// 1️⃣ VALIDATE USER (Login) - (DIPERBAIKI)
// ============================================================
export async function validateUser(
  username: string,
  password: string
): Promise<ClientUser | null> {
  try {
    console.log("=== SERVER LOGIN VALIDATION (Plaintext) ===");

    // 1. Cari user berdasarkan username
    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (!user) {
      console.warn("❌ User tidak ditemukan");
      return null;
    }

    // 2. Perbandingan password secara plaintext (TIDAK AMAN)
    if (user.password !== password.trim()) {
      console.warn("❌ Password salah");
      return null;
    }

    // 3. JANGAN PERNAH kirim password ke client/localStorage
    const sessionUser: ClientUser = {
      id: user.id,
      username: user.username,
      name: user.name || null, // <-- PERBAIKAN: Tambahkan 'name'
      role: user.role as "admin" | "operator",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    console.log("✅ Login berhasil:", user.username, "Role:", user.role);
    return sessionUser;
  } catch (error) {
    console.error("❌ Login error:", error);
    return null;
  }
}

// ============================================================
// 2️⃣ GET ALL USERS (Admin Only) - (DIPERBAIKI)
// ============================================================
export async function getAllUsers(): Promise<ClientUser[]> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true, // <-- PERBAIKAN: Select 'name'
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return users.map((u) => ({
      ...u,
      name: u.name || null, // <-- PERBAIKAN: Pastikan 'name' ada
      role: u.role as "admin" | "operator",
    }));
  } catch (error) {
    console.error("❌ Gagal mengambil data users:", error);
    return [];
  }
}

// ============================================================
// 3️⃣ ADD USER - (DIPERBAIKI)
// ============================================================
export async function addUser(data: {
  username: string;
  password: string;
  role: "admin" | "operator";
  name?: string | null; // <-- PERBAIKAN: Terima 'name' (opsional)
}): Promise<boolean> {
  try {
    await prisma.user.create({
      data: {
        username: data.username.trim(),
        password: data.password.trim(), // <-- Simpan plain-text (TIDAK AMAN)
        role: data.role,
        name: data.name ? data.name.trim() : null, // <-- PERBAIKAN: Simpan 'name'
      },
    });
    console.log("✅ User berhasil ditambahkan:", data.username);
    return true;
  } catch (error) {
    console.error("❌ Gagal menambah user:", error);
    return false;
  }
}

// ============================================================
// 4️⃣ UPDATE USER PASSWORD - (Hanya Server-Side)
// ============================================================
// (Tidak perlu diubah, sudah benar)
export async function updateUserPassword(
  username: string,
  newPassword: string
): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { username: username.trim() },
      data: { password: newPassword.trim() }, // <-- Simpan plain-text (TIDAK AMAN)
    });
    console.log("✅ Password berhasil diubah:", username);
    return true;
  } catch (error) {
    console.error("❌ Gagal update password:", error);
    return false;
  }
}

// ============================================================
// 5️⃣ DELETE USER (kecuali admin utama) - (Hanya Server-Side)
// ============================================================
// (Tidak perlu diubah, sudah benar)
export async function deleteUser(username: string): Promise<boolean> {
  if (username.toLowerCase() === "admin") {
    console.warn("⚠️ Admin utama tidak boleh dihapus.");
    return false;
  }

  try {
    await prisma.user.delete({
      where: { username: username.trim() },
    });
    console.log("✅ User berhasil dihapus:", username);
    return true;
  } catch (error) {
    console.error("❌ Gagal hapus user:", error);
    return false;
  }
}
