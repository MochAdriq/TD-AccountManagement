import { NextRequest, NextResponse } from "next/server";
import {
  getAllUsers,
  addUser,
  updateUserPassword,
  deleteUser,
  verifyAuth, // <--- Pastikan ini di-import
} from "@/lib/auth-server";

export const dynamic = "force-dynamic";

// ============================================================
// 1. GET (Ambil semua user)
// ============================================================
export async function GET(req: NextRequest) {
  try {
    // Opsional: Tambah proteksi admin di sini jika perlu
    // const auth = await verifyAuth(req);
    // if (!auth || auth.role !== 'admin') return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal mengambil data user" },
      { status: 500 }
    );
  }
}

// ============================================================
// 2. POST (Tambah user baru)
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const { username, password, role, name } = await req.json();

    if (!username || !password || !role) {
      return NextResponse.json(
        { error: "Username, password, dan role harus diisi" },
        { status: 400 }
      );
    }

    const success = await addUser({
      username,
      password,
      role,
      name: name || null,
    });

    if (success) {
      return NextResponse.json(
        { message: "User berhasil ditambahkan" },
        { status: 201 }
      );
    } else {
      return NextResponse.json(
        { error: "Gagal menambahkan user" },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Terjadi kesalahan internal" },
      { status: 500 }
    );
  }
}

// ============================================================
// 3. PATCH (Update password)
// ============================================================
export async function PATCH(req: NextRequest) {
  try {
    const { username, newPassword } = await req.json();

    if (!username || !newPassword) {
      return NextResponse.json(
        { error: "Username dan password baru harus diisi" },
        { status: 400 }
      );
    }

    const success = await updateUserPassword(username, newPassword);

    if (success) {
      return NextResponse.json({ message: "Password berhasil diubah" });
    } else {
      return NextResponse.json(
        { error: "Gagal mengubah password" },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Terjadi kesalahan internal" },
      { status: 500 }
    );
  }
}

// ============================================================
// 4. DELETE (Hapus user) - DIPERBARUI
// ============================================================
export async function DELETE(req: NextRequest) {
  try {
    // 1. Cek Auth: Siapa yang sedang login?
    const authUser = await verifyAuth(req);

    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await req.json();

    if (!username) {
      return NextResponse.json(
        { error: "Username target harus diisi" },
        { status: 400 }
      );
    }

    // 2. PROTEKSI: Cek apakah admin mencoba menghapus dirinya sendiri
    if (authUser.username === username) {
      return NextResponse.json(
        { error: "Anda tidak dapat menghapus akun Anda sendiri." },
        { status: 403 }
      );
    }

    // Fungsi 'deleteUser' juga sudah punya proteksi hardcoded untuk username 'admin'
    const success = await deleteUser(username);

    if (success) {
      return NextResponse.json({ message: "User berhasil dihapus" });
    } else {
      return NextResponse.json(
        {
          error:
            "Gagal menghapus user (User tidak ditemukan atau itu akun Admin Utama)",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal" },
      { status: 500 }
    );
  }
}
