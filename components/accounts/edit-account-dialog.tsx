"use client";

import type React from "react";
import { useState, useEffect } from "react"; // Import useEffect
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccounts } from "@/contexts/account-context";
import { Calendar } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// Pastikan tipe ini sudah diexport dari context
import type { UpdateAccountPayload } from "@/contexts/account-context";

// Tipe data Akun yang diterima sebagai prop
interface AccountData {
  id: string;
  email: string;
  password: string;
  expiresAt: string | Date | null; // Terima string, Date, atau null
}
interface EditAccountDialogProps {
  account: AccountData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditAccountDialog({
  account,
  open,
  onOpenChange,
}: EditAccountDialogProps) {
  const { updateAccount } = useAccounts();

  // State lokal untuk form
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null); // Simpan ID saja
  const [currentAccountEmail, setCurrentAccountEmail] = useState<string>(""); // Simpan Email saja
  const [password, setPassword] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effect untuk mengisi state form saat dialog dibuka/prop berubah
  useEffect(() => {
    // Hanya update jika dialog terbuka DAN ada data akun baru
    if (account && open) {
      setCurrentAccountId(account.id);
      setCurrentAccountEmail(account.email);
      setPassword(account.password);

      // Konversi expiresAt ke Date dengan lebih aman
      let initialDate: Date | undefined = undefined;
      if (account.expiresAt) {
        try {
          const parsedDate = new Date(account.expiresAt);
          // Cek apakah hasil konversi valid
          if (!isNaN(parsedDate.getTime())) {
            initialDate = parsedDate;
          } else {
            console.warn(
              "Invalid date format received for expiresAt:",
              account.expiresAt
            );
          }
        } catch (e) {
          console.error("Error parsing expiresAt date:", e);
        }
      }
      setExpiryDate(initialDate);
      setError(null); // Reset error setiap kali dialog dibuka/akun berubah
    } else if (!open) {
      // Optional: Reset form saat dialog ditutup (mencegah flash data lama)
      // setCurrentAccountId(null);
      // setCurrentAccountEmail("");
      // setPassword("");
      // setExpiryDate(undefined);
      // setError(null);
    }
  }, [account, open]); // Dependencies: account dan open

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccountId) return; // Butuh ID untuk update
    setIsLoading(true);
    setError(null);

    try {
      // Buat payload untuk API (hanya field yang diubah)
      const payload: UpdateAccountPayload = {
        // email tidak dikirim
        password: password,
        expiresAt: expiryDate ? expiryDate.toISOString() : undefined, // Kirim string ISO
      };

      // Panggil fungsi update dari context
      const updatedAccount = await updateAccount(currentAccountId, payload);

      if (updatedAccount) {
        // Jika update berhasil (context mengembalikan akun)
        onOpenChange(false); // Tutup dialog
        // Toast sukses dihandle context
      } else {
        // Jika update gagal (context mengembalikan null)
        setError("Gagal menyimpan perubahan. Cek console.");
        // Toast error dihandle context
      }
    } catch (err: any) {
      console.error("Error submitting update:", err);
      setError(err.message || "Terjadi kesalahan.");
      // Toast error dihandle context
    } finally {
      setIsLoading(false);
    }
  };

  // Jangan render jika dialog tidak open atau tidak ada ID (mencegah error saat state belum siap)
  if (!open || !currentAccountId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>
            Ubah password atau tanggal kadaluarsa. Email tidak bisa diubah.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && <p className="text-sm text-red-600 px-1">{error}</p>}

          {/* Email (Read Only) */}
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email (Tidak bisa diubah)</Label>
            <Input
              id="edit-email"
              type="email"
              value={currentAccountEmail} // Ambil dari state
              className="border-gray-300 bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
              readOnly
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="edit-password">Password</Label>
            <Input
              id="edit-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-gray-300 focus-visible:ring-blue-500"
              required
              disabled={isLoading}
            />
          </div>

          {/* Expires At */}
          <div className="space-y-2">
            <Label htmlFor="edit-expiry">Tanggal Kadaluarsa</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  id="edit-expiry" // Beri ID unik
                  className={cn(
                    "w-full justify-start text-left font-normal border-gray-300",
                    !expiryDate && "text-muted-foreground"
                  )}
                  disabled={isLoading}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {expiryDate ? (
                    format(expiryDate, "dd MMMM yyyy")
                  ) : (
                    <span>Pilih tanggal</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={expiryDate}
                  onSelect={setExpiryDate}
                  captionLayout="dropdown"
                  fromYear={new Date().getFullYear() - 5}
                  toYear={new Date().getFullYear() + 5}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Footer */}
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
