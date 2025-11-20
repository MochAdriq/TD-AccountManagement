"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  PlusCircle,
  UserCog,
  Trash2,
  Shield,
  User as UserIcon,
  Key,
  Eye, // Icon Mata
  EyeOff, // Icon Mata Tertutup
} from "lucide-react";
import { useAuth } from "@/lib/auth";

// Tipe data user
interface UserData {
  id: string;
  username: string;
  role: "admin" | "operator";
  name?: string | null;
  createdAt: string;
}

export default function UserManagement() {
  const { toast } = useToast();
  const { user: currentUser, logout } = useAuth(); // Ambil auth context

  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State Tambah User
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "operator">("operator");
  const [showPassword, setShowPassword] = useState(false); // Toggle Add

  // State Ganti Password
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [updatePassword, setUpdatePassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false); // Toggle Edit

  // --- HELPER AUTH HEADER ---
  const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  // --- 1. FETCH USERS (Fix Data Hilang) ---
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "GET",
        headers: getAuthHeaders(), // Kirim token
      });

      if (res.status === 401) {
        logout(); // Logout jika token expired
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        console.error("Gagal ambil user");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    // Panggil fetch langsung saat mount (pastikan di client)
    fetchUsers();
  }, []);

  // --- 2. ADD USER ---
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
          name: newName,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({ title: "✅ Sukses", description: "User berhasil dibuat." });
        setIsAddOpen(false);
        setNewUsername("");
        setNewPassword("");
        setNewName("");
        setNewRole("operator");
        setShowPassword(false);
        fetchUsers();
      } else {
        toast({
          title: "❌ Gagal",
          description: data.error || "Gagal membuat user.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Terjadi kesalahan jaringan.",
        variant: "destructive",
      });
    }
  };

  // --- 3. UPDATE PASSWORD ---
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          username: selectedUser.username,
          newPassword: updatePassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: "✅ Sukses",
          description: `Password ${selectedUser.username} berhasil diubah.`,
        });
        setIsEditOpen(false);
        setSelectedUser(null);
        setUpdatePassword("");
        setShowNewPassword(false);
      } else {
        toast({
          title: "❌ Gagal",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Kesalahan jaringan.",
        variant: "destructive",
      });
    }
  };

  // --- 4. DELETE USER ---
  const handleDeleteUser = async (username: string) => {
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: getAuthHeaders(),
        body: JSON.stringify({ username }), // Body untuk DELETE terkadang perlu opsi khusus di server, tapi standar fetch support ini
      });

      // Jika server backend mengharuskan query param untuk delete, ganti jadi:
      // await fetch(`/api/users?username=${username}`, { method: "DELETE", headers: getAuthHeaders() });

      const data = await res.json();

      if (res.ok) {
        toast({ title: "✅ Dihapus", description: "User berhasil dihapus." });
        fetchUsers();
      } else {
        toast({
          title: "❌ Gagal",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Gagal menghapus user.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold">Daftar Pengguna</h3>
          <p className="text-sm text-gray-500">
            Kelola akses admin dan operator.
          </p>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat User Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Contoh: budi123"
                  required
                />
              </div>

              {/* PASSWORD INPUT (ADD) */}
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={newRole}
                  onValueChange={(v: any) => setNewRole(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operator">Operator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Simpan User
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Dibuat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-gray-500"
                >
                  {isLoading ? "Memuat data..." : "Belum ada user lain."}
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-gray-100 rounded-full">
                        <UserIcon className="h-4 w-4 text-gray-600" />
                      </div>
                      {u.name || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {u.username}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={u.role === "admin" ? "default" : "secondary"}
                      className={
                        u.role === "admin"
                          ? "bg-purple-600"
                          : "bg-blue-100 text-blue-700"
                      }
                    >
                      {u.role === "admin" ? (
                        <Shield className="h-3 w-3 mr-1" />
                      ) : (
                        <UserCog className="h-3 w-3 mr-1" />
                      )}
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(u);
                        setUpdatePassword("");
                        setIsEditOpen(true);
                      }}
                    >
                      <Key className="h-3 w-3 mr-1" /> Ganti Pass
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Hapus User {u.username}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Aksi ini permanen.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => handleDeleteUser(u.username)}
                          >
                            Ya, Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* DIALOG GANTI PASS */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Ganti Password:{" "}
              <span className="text-blue-600">{selectedUser?.username}</span>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdatePassword} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Password Baru</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={updatePassword}
                  onChange={(e) => setUpdatePassword(e.target.value)}
                  placeholder="Masukkan password baru"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Update Password
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
