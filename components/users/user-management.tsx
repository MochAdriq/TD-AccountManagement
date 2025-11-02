// components/users/user-management.tsx (DIPERBARUI DENGAN TOKEN AUTH)

"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash, Key } from "lucide-react";
import type { ClientUser } from "@/lib/auth";
import { useAuth } from "@/lib/auth"; // <-- Impor hook useAuth

export default function UserManagement() {
  const { toast } = useToast();
  const { user: currentUser, logout } = useAuth(); // <-- Panggil hook, ambil 'logout'
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");

  // Form states
  const [newUsername, setNewUsername] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "operator">("operator");
  const [changePassword, setChangePassword] = useState("");

  // ---------------------------------------------------------------
  // ⬇⬇⬇ PERBAIKAN UTAMA DI BAWAH INI ⬇⬇⬇
  // ---------------------------------------------------------------

  /**
   * Fungsi helper untuk mengambil token dari localStorage
   */
  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // <-- Kirim token di header
    };
  };

  /**
   * Fungsi helper untuk menangani error 401 (Logout Paksa)
   */
  const handleUnauthorized = () => {
    toast({
      title: "Sesi Habis",
      description:
        "Sesi Anda tidak valid atau telah kedaluwarsa. Silakan login kembali.",
      variant: "destructive",
    });
    logout(); // <-- Panggil fungsi logout dari hook
  };

  // 🔹 Fetch users dari API (DIPERBARUI)
  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", {
        method: "GET",
        headers: getAuthHeaders(), // <-- Gunakan headers
      });

      if (res.status === 401) {
        handleUnauthorized(); // <-- Handle logout paksa
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal ambil data user");
      setUsers(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat data user.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Jangan fetch data jika user (admin) belum ter-load
    if (currentUser) {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]); // <-- Tambahkan currentUser sebagai dependency

  // 🔹 Tambah User (DIPERBARUI)
  const handleAddUser = async () => {
    if (!newUsername || !newPassword) {
      // ... (validasi form tidak berubah)
      return;
    }

    const res = await fetch("/api/users", {
      method: "POST",
      headers: getAuthHeaders(), // <-- Gunakan headers
      body: JSON.stringify({
        username: newUsername,
        name: newName,
        password: newPassword,
        role: newRole,
      }),
    });

    if (res.status === 401) {
      handleUnauthorized(); // <-- Handle logout paksa
      return;
    }

    if (res.ok) {
      // ... (logika sukses tidak berubah)
      toast({
        title: "Berhasil",
        description: "User baru berhasil ditambahkan",
      });
      setIsAddDialogOpen(false);
      setNewUsername("");
      setNewName("");
      setNewPassword("");
      setNewRole("operator");
      fetchUsers();
    } else {
      // ... (logika error tidak berubah)
    }
  };

  // 🔹 Ubah Password (DIPERBARUI)
  const handleChangePassword = async () => {
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: getAuthHeaders(), // <-- Gunakan headers
      body: JSON.stringify({
        username: selectedUser,
        newPassword: changePassword,
      }),
    });

    if (res.status === 401) {
      handleUnauthorized(); // <-- Handle logout paksa
      return;
    }

    if (res.ok) {
      // ... (logika sukses tidak berubah)
      toast({ title: "Berhasil", description: "Password berhasil diubah" });
      setIsPasswordDialogOpen(false);
      setChangePassword("");
    } else {
      // ... (logika error tidak berubah)
    }
  };

  // 🔹 Hapus User (DIPERBARUI)
  const handleDeleteUser = async () => {
    const res = await fetch("/api/users", {
      method: "DELETE",
      headers: getAuthHeaders(), // <-- Gunakan headers
      body: JSON.stringify({ username: selectedUser }),
    });

    if (res.status === 401) {
      handleUnauthorized(); // <-- Handle logout paksa
      return;
    }

    if (res.ok) {
      // ... (logika sukses tidak berubah)
      toast({ title: "Berhasil", description: "User berhasil dihapus" });
      fetchUsers();
      setIsDeleteDialogOpen(false);
    } else {
      // ... (logika error tidak berubah)
    }
  };

  // ---------------------------------------------------------------
  // ⬆⬆⬆ SELESAI PERBAIKAN ⬆⬆⬆
  // ---------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ... (Semua kode JSX di bawah ini TIDAK BERUBAH) ... */}
      <Card>
        <CardHeader className="bg-blue-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center justify-between">
            <span>Manajemen User</span>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Tambah User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah User Baru</DialogTitle>
                  <DialogDescription>
                    Buat akun user baru untuk mengakses sistem
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={newUsername}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewUsername(e.target.value)
                      }
                      placeholder="Masukkan username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lengkap</Label>
                    <Input
                      id="name"
                      value={newName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewName(e.target.value)
                      }
                      placeholder="Masukkan nama lengkap (opsional)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewPassword(e.target.value)
                      }
                      placeholder="Masukkan password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={newRole}
                      onValueChange={(value: "admin" | "operator") =>
                        setNewRole(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="operator">Operator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button onClick={handleAddUser}>Tambah User</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.name || "-"}</TableCell>{" "}
                  <TableCell>
                    <Badge
                      className={
                        user.role === "admin" ? "bg-red-500" : "bg-blue-500"
                      }
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString("id-ID")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setSelectedUser(user.username);
                          setIsPasswordDialogOpen(true);
                        }}
                        className="h-8 w-8"
                      >
                        <Key className="h-4 w-4" />
                      </Button>

                      {currentUser &&
                        user.username !== "admin" &&
                        user.username !== currentUser.username && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSelectedUser(user.username);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Ubah Password */}
      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Password</DialogTitle>
            <DialogDescription>
              Ubah password untuk user: {selectedUser}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Password Baru</Label>
              <Input
                id="new-password"
                type="password"
                value={changePassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setChangePassword(e.target.value)
                }
                placeholder="Masukkan password baru"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPasswordDialogOpen(false)}
            >
              Batal
            </Button>
            <Button onClick={handleChangePassword}>Ubah Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus User</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus user "{selectedUser}"? Tindakan
              ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-500 hover:bg-red-600"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
