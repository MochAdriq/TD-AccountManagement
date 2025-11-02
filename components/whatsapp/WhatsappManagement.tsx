"use client";

import { useState, useCallback } from "react";
import { useAccounts } from "@/contexts/account-context";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
// --- PERUBAHAN: Import AlertDialog ---
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  // AlertDialogTrigger, // Kita pakai manual trigger
} from "@/components/ui/alert-dialog";
// --- AKHIR PERUBAHAN ---
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Edit, Trash2, Loader2 } from "lucide-react";
import type { WhatsappAccount } from "@prisma/client"; // Import tipe

// Komponen Form untuk Add/Edit (tidak berubah)
interface WaFormProps {
  initialData?: WhatsappAccount | null; // Untuk mode edit
  onSubmit: (data: { name: string; number: string }) => Promise<void>;
  onClose: () => void;
}

function WaForm({ initialData, onSubmit, onClose }: WaFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [number, setNumber] = useState(initialData?.number || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !number.trim()) {
      toast({
        title: "Error",
        description: "Nama dan Nomor WA tidak boleh kosong.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), number: number.trim() });
      onClose(); // Tutup dialog jika sukses
    } catch (error) {
      // Toast error sudah dihandle di context, tapi bisa tambah di sini jika perlu
      console.error("Form submission error:", error);
      // Jangan tutup dialog jika error agar user bisa coba lagi
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="wa-name">Nama Akun WA</Label>
        <Input
          id="wa-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="cth: WA META"
          required
          disabled={isSubmitting}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wa-number">Nomor WA</Label>
        <Input
          id="wa-number"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="cth: 081234567890"
          required
          disabled={isSubmitting}
        />
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={isSubmitting}>
            Batal
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
            </>
          ) : initialData ? (
            "Simpan Perubahan"
          ) : (
            "Tambah Akun WA"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Komponen Utama Manajemen WA
export default function WhatsappManagement() {
  const {
    whatsappAccounts,
    addWhatsappAccount,
    updateWhatsappAccount, // <-- Sekarang dipakai
    deleteWhatsappAccount, // <-- Sekarang dipakai
    isLoading, // Ambil status loading global
  } = useAccounts();
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  // --- PERUBAHAN: State untuk Edit ---
  const [editData, setEditData] = useState<WhatsappAccount | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  // --- PERUBAHAN: State untuk Delete ---
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>(""); // Untuk pesan konfirmasi
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] =
    useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // Loading state for delete
  // --- AKHIR PERUBAHAN ---

  const handleAddSubmit = async (data: { name: string; number: string }) => {
    await addWhatsappAccount(data); // Panggil fungsi context
    // Toast sukses/error sudah dihandle di context
  };

  // --- PERUBAHAN: Fungsi untuk Edit ---
  const handleEditClick = (waAccount: WhatsappAccount) => {
    setEditData(waAccount);
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (data: { name: string; number: string }) => {
    if (!editData?.id) return;
    await updateWhatsappAccount(editData.id, data);
    // Tidak perlu reset editData di sini karena onClose dialog akan dipanggil
  };

  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    // Beri sedikit waktu sebelum mereset data agar transisi mulus saat dialog ditutup
    setTimeout(() => {
      setEditData(null);
    }, 300); // 300ms sesuai durasi animasi default
  };
  // --- AKHIR PERUBAHAN ---

  // --- PERUBAHAN: Fungsi untuk Delete ---
  const handleDeleteClick = (account: WhatsappAccount) => {
    setDeleteId(account.id);
    setDeleteName(account.name); // Simpan nama untuk pesan
    setIsConfirmDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    const success = await deleteWhatsappAccount(deleteId);
    setIsDeleting(false);
    if (success) {
      setIsConfirmDeleteDialogOpen(false); // Tutup dialog jika sukses
      // Reset state setelah dialog tertutup (beri waktu animasi)
      setTimeout(() => {
        setDeleteId(null);
        setDeleteName("");
      }, 300);
    }
    // Toast error sudah dihandle context
  };
  // --- AKHIR PERUBAHAN ---


  if (isLoading && whatsappAccounts.length === 0) {
    // Tampilkan loading hanya jika data belum ada sama sekali
    return <div className="text-center p-6">Memuat daftar akun WA...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {/* Dialog Tambah */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Tambah WA Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Tambah Akun WhatsApp Baru</DialogTitle>
            </DialogHeader>
            <WaForm
              onSubmit={handleAddSubmit}
              onClose={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Akun WA</TableHead>
              <TableHead>Nomor WA</TableHead>
              <TableHead className="text-right w-[120px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {whatsappAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center h-24">
                  Belum ada akun WA ditambahkan.
                </TableCell>
              </TableRow>
            ) : (
              whatsappAccounts.map((wa) => (
                <TableRow key={wa.id}>
                  <TableCell className="font-medium">{wa.name}</TableCell>
                  <TableCell>{wa.number}</TableCell>
                  <TableCell className="text-right space-x-2">
                    {/* --- PERUBAHAN: Hubungkan onClick Edit --- */}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditClick(wa)} // <-- Panggil handler Edit
                      aria-label={`Edit ${wa.name}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {/* --- PERUBAHAN: Hubungkan onClick Delete --- */}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteClick(wa)} // <-- Panggil handler Delete
                      aria-label={`Hapus ${wa.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* --- PERUBAHAN: Dialog untuk Edit --- */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Akun WhatsApp: {editData?.name}</DialogTitle>
          </DialogHeader>
          {/* Render form hanya jika editData ada */}
          {editData && (
            <WaForm
              initialData={editData}
              onSubmit={handleEditSubmit}
              onClose={handleEditDialogClose} // Gunakan handler close
            />
          )}
        </DialogContent>
      </Dialog>
      {/* --- AKHIR PERUBAHAN --- */}

      {/* --- PERUBAHAN: Dialog Konfirmasi Delete --- */}
      <AlertDialog
        open={isConfirmDeleteDialogOpen}
        onOpenChange={setIsConfirmDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus akun WA{" "}
              <strong>{deleteName}</strong>? Tindakan ini tidak
              bisa dibatalkan. Assignment yang sudah menggunakan WA ini mungkin
              akan kehilangan referensinya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700" // Style tombol hapus
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menghapus...
                </>
              ) : (
                "Ya, Hapus"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* --- AKHIR PERUBAHAN --- */}
    </div>
  );
}