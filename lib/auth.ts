// lib/auth.ts (SUDAH DIPERBAIKI - HANYA CLIENT-SIDE)

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// ============================================================
// 🔹 TYPE DEFINITIONS (Aman untuk Client)
// ============================================================
export interface ClientUser {
  id: string;
  username: string;
  name: string | null; // <-- PERBAIKAN: Tambahkan field 'name'
  role: "admin" | "operator";
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
//  REACT HOOK: useAuth() (Hanya Client-Side)
// ============================================================
export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<ClientUser | null>(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        const parsedUser: ClientUser = JSON.parse(storedUser);

        // Clean up untuk versi lama yg mungkin masih menyimpan password
        if ((parsedUser as any).password) {
          delete (parsedUser as any).password;
          localStorage.setItem("currentUser", JSON.stringify(parsedUser));
        }
        setUser(parsedUser);
      }
    } catch (e) {
      console.error("⚠️ Gagal parse user dari localStorage:", e);
      localStorage.removeItem("currentUser");
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("currentUser");
    setUser(null);
    router.push("/"); // redirect ke halaman login
  };

  return { user, logout };
}
