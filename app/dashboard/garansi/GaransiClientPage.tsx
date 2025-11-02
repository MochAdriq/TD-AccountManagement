"use client";

import { useState, useEffect, useMemo } from "react"; // Import useMemo
import { AccountProvider, useAccounts } from "@/contexts/account-context";
import { GaransiHeader } from "@/components/garansi/garansi-header";
import LoadingSpinner from "@/components/shared/loading-spinner";
import { Button } from "@/components/ui/button";
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
  Calendar as CalendarIcon,
  Shield,
  Copy,
  Info,
  Database,
  PlusCircle,
  Clock,
  CalendarPlus,
} from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import GaransiForm from "@/components/garansi/garansi-form";
import { Label } from "@/components/ui/label";
import type { AccountType, GaransiAccount } from "@prisma/client";

// --- Impor Komponen Pagination ---
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis, // Opsional jika ingin ellipsis
} from "@/components/ui/pagination";
// --- Akhir Impor ---

// Impor Dialog dari shadcn/ui
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import React from "react";

// Komponen Inti (View)
function GaransiView() {
  const {
    getGaransiAccountsByDate,
    getGaransiAccountsByExpiresAt,
    getRemainingDays,
    garansiAccounts, // Data SEMUA akun garansi dari context
  } = useAccounts();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>();

  // --- State untuk Data & Filter ---
  // State `sourceAccounts` menyimpan data mentah (semua terbaru ATAU hasil filter)
  const [sourceAccounts, setSourceAccounts] = useState<GaransiAccount[]>(() => {
    const sortedAll = Array.isArray(garansiAccounts)
      ? [...garansiAccounts].sort((a, b) => {
          const dateA = a.warrantyDate ? new Date(a.warrantyDate).getTime() : 0;
          const dateB = b.warrantyDate ? new Date(b.warrantyDate).getTime() : 0;
          return dateB - dateA;
        })
      : [];
    return sortedAll; // Simpan SEMUA data terurut di awal
  });
  const [isDataFiltered, setIsDataFiltered] = useState(false); // Tandai jika data sedang difilter

  // --- State untuk Pagination ---
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10; // Tentukan jumlah item per halaman

  const [isLoadingView, setIsLoadingView] = useState(false);
  const [filterType, setFilterType] = useState<"warrantyDate" | "expiresAt">(
    "warrantyDate"
  );

  // Update sourceAccounts saat garansiAccounts dari context berubah (misal setelah refresh)
  useEffect(() => {
    if (!isDataFiltered && Array.isArray(garansiAccounts)) {
      // Hanya update jika tidak sedang filter
      const sortedAll = [...garansiAccounts].sort((a, b) => {
        const dateA = a.warrantyDate ? new Date(a.warrantyDate).getTime() : 0;
        const dateB = b.warrantyDate ? new Date(b.warrantyDate).getTime() : 0;
        return dateB - dateA;
      });
      setSourceAccounts(sortedAll);
      // Reset ke halaman 1 jika halaman saat ini jadi tidak valid
      const newTotalPages = Math.ceil(sortedAll.length / ITEMS_PER_PAGE);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      } else if (sortedAll.length === 0) {
        setCurrentPage(1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [garansiAccounts, isDataFiltered]); // Jangan tambahkan currentPage di sini

  // --- Handle Date Select (Update sourceAccounts & Reset Page) ---
  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) {
      // Jika tanggal dihapus, kembali ke default
      setSelectedDate(undefined);
      setIsDataFiltered(false); // Tandai tidak lagi difilter
      const sortedAll = Array.isArray(garansiAccounts)
        ? [...garansiAccounts].sort(
            (a, b) =>
              new Date(b.warrantyDate).getTime() -
              new Date(a.warrantyDate).getTime()
          )
        : [];
      setSourceAccounts(sortedAll); // Kembalikan ke semua data
      setCurrentPage(1); // Kembali ke halaman 1
      return;
    }

    setSelectedDate(date);
    setIsLoadingView(true);
    setIsDataFiltered(true); // Tandai sedang difilter

    try {
      let dateAccounts: GaransiAccount[] = [];
      const dateString = date.toISOString();
      if (filterType === "warrantyDate") {
        dateAccounts = await getGaransiAccountsByDate(dateString);
      } else {
        dateAccounts = await getGaransiAccountsByExpiresAt(dateString);
      }
      setSourceAccounts(dateAccounts); // Update source dengan hasil filter
      setCurrentPage(1); // Reset ke halaman 1 setelah filter
    } catch (error) {
      console.error("Failed to load garansi accounts:", error);
      toast({
        /* ... */
      });
      setSourceAccounts([]); // Kosongkan jika error filter
      setCurrentPage(1);
    } finally {
      setIsLoadingView(false);
    }
  };

  const copyAccountDetails = (account: GaransiAccount) => {
    /* ... (tidak berubah) ... */
  };
  const copyAllAccounts = () => {
    // Copy HANYA yang tampil di halaman ini
    if (paginatedAccounts.length === 0) return;
    const allText = paginatedAccounts
      .map((acc) => `Email: ${acc.email}\nPassword: ${acc.password}`)
      .join("\n\n");
    navigator.clipboard.writeText(allText);
    toast({
      title: "✅ Akun Halaman Ini Tersalin",
      description: `${paginatedAccounts.length} akun garansi di halaman ${currentPage} tersalin.`,
    });
  };

  // --- Hitung Variabel Pagination ---
  const totalItems = sourceAccounts.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  // Ambil data HANYA untuk halaman saat ini
  const paginatedAccounts = sourceAccounts.slice(startIndex, endIndex);
  // --- Akhir Hitung ---

  // --- Kondisi Tampilan ---
  const hasResultsToShow = !isLoadingView && paginatedAccounts.length > 0;
  const isFilteredNoResults =
    isDataFiltered && !isLoadingView && sourceAccounts.length === 0;
  const isInitialLoadEmpty =
    !isDataFiltered &&
    !isLoadingView &&
    sourceAccounts.length === 0 &&
    (!garansiAccounts || garansiAccounts.length === 0);
  // --- Akhir Kondisi ---

  return (
    <div className="space-y-6">
      <Card className="border-gray-200 shadow-sm max-w-15xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            📅 Cek Akun Garansi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Bagian Filter & Kalender */}
          <div className="space-y-6 mb-6">
            <div className="space-y-3">
              <Label className="text-base font-semibold text-gray-700">
                Pilih Tipe Pencarian
              </Label>
              <div className="flex gap-4">
                <Button
                  variant={
                    filterType === "warrantyDate" ? "default" : "outline"
                  }
                  onClick={() => {
                    setFilterType("warrantyDate");
                    // Jika tanggal sudah dipilih, panggil handleDateSelect untuk filter ulang
                    if (selectedDate) {
                      handleDateSelect(selectedDate);
                    } else {
                      // Jika belum ada tanggal, reset ke default
                      setIsDataFiltered(false);
                      const sortedAll = Array.isArray(garansiAccounts)
                        ? [...garansiAccounts].sort(
                            (a, b) =>
                              new Date(b.warrantyDate).getTime() -
                              new Date(a.warrantyDate).getTime()
                          )
                        : [];
                      setSourceAccounts(sortedAll);
                      setCurrentPage(1);
                    }
                  }}
                  className="flex-1"
                >
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Cari berdasarkan Tanggal Dibuat
                </Button>
                <Button
                  variant={filterType === "expiresAt" ? "default" : "outline"}
                  onClick={() => {
                    setFilterType("expiresAt");
                    if (selectedDate) {
                      handleDateSelect(selectedDate);
                    } else {
                      setIsDataFiltered(false);
                      const sortedAll = Array.isArray(garansiAccounts)
                        ? [...garansiAccounts].sort(
                            (a, b) =>
                              new Date(b.warrantyDate).getTime() -
                              new Date(a.warrantyDate).getTime()
                          )
                        : [];
                      setSourceAccounts(sortedAll);
                      setCurrentPage(1);
                    }
                  }}
                  className="flex-1"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Cari berdasarkan Tanggal Kadaluarsa
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-base font-semibold text-gray-700">
                Pilih Tanggal (Filter)
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-14 border-gray-300",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    {selectedDate
                      ? format(selectedDate, "dd MMMM yyyy")
                      : "Pilih tanggal untuk filter (opsional)"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect} // Akan memfilter & reset page
                    captionLayout="dropdown"
                    fromYear={new Date().getFullYear() - 2}
                    toYear={new Date().getFullYear() + 5}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {selectedDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDateSelect(undefined)}
                  className="text-xs text-blue-600"
                >
                  Hapus Filter Tanggal
                </Button>
              )}
              <p className="text-sm text-gray-500">
                {filterType === "warrantyDate"
                  ? "Menampilkan akun yang DITAMBAHKAN pada tanggal ini."
                  : "Menampilkan akun yang AKAN KADALUARSA pada tanggal ini."}
              </p>
            </div>
          </div>

          {isLoadingView && <LoadingSpinner />}

          {hasResultsToShow && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  {isDataFiltered // Judul dinamis berdasarkan filter aktif
                    ? `Hasil Filter ${
                        filterType === "warrantyDate"
                          ? "Tanggal Dibuat"
                          : "Tanggal Kadaluarsa"
                      } (${
                        selectedDate ? format(selectedDate, "dd MMM yyyy") : ""
                      })`
                    : `Akun Garansi Terbaru Ditambahkan`}{" "}
                  (Hal {currentPage}/{totalPages}, Total {totalItems}){" "}
                  {/* Info Halaman & Total */}
                </h3>
                <Button
                  onClick={copyAllAccounts}
                  size="sm"
                  disabled={paginatedAccounts.length === 0}
                >
                  <Copy className="h-4 w-4 mr-2" /> Copy Akun Hal Ini (
                  {paginatedAccounts.length})
                </Button>
              </div>
              <Alert className="bg-blue-50 border-blue-200">
                <Database className="h-4 w-4" />
                <AlertDescription>
                  Data ini dari database garansi terpisah &{" "}
                  <strong>TIDAK mempengaruhi stok utama</strong>. Total garansi
                  di sistem:{" "}
                  <strong>
                    {garansiAccounts ? garansiAccounts.length : 0}
                  </strong>
                  .
                </AlertDescription>
              </Alert>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Password</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Ditambahkan</TableHead>
                      <TableHead>Kadaluarsa</TableHead>
                      <TableHead className="whitespace-nowrap">
                        Status
                      </TableHead>{" "}
                      {/* Lebar Otomatis */}
                      <TableHead>Copy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAccounts.map((account) => {
                      const daysLeft = getRemainingDays(account);
                      const isExpired = daysLeft < 0;
                      const isExpiringToday = daysLeft === 0 && !isExpired;
                      let statusVariant:
                        | "destructive"
                        | "secondary"
                        | "default" = "default";
                      let statusBgColor = "bg-green-600 hover:bg-green-700";
                      if (isExpired) {
                        statusVariant = "destructive";
                        statusBgColor = "bg-red-600 hover:bg-red-700";
                      } else if (isExpiringToday) {
                        statusVariant = "secondary";
                        statusBgColor = "bg-yellow-500 hover:bg-yellow-600";
                      }
                      return (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">
                            {account.email}
                          </TableCell>
                          <TableCell>{account.password}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{account.platform}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                account.type === "vip"
                                  ? "default"
                                  : account.type === "private"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {account.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {" "}
                            {account.warrantyDate
                              ? format(
                                  new Date(account.warrantyDate),
                                  "dd MMM yyyy"
                                )
                              : "-"}{" "}
                          </TableCell>
                          <TableCell>
                            {" "}
                            {account.expiresAt
                              ? format(
                                  new Date(account.expiresAt),
                                  "dd MMM yyyy"
                                )
                              : "-"}{" "}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={statusVariant}
                              className={cn("text-white", statusBgColor)}
                            >
                              {isExpired
                                ? `Expired (${Math.abs(daysLeft)} hr lalu)`
                                : isExpiringToday
                                ? "Exp Hari Ini"
                                : `Aktif (${daysLeft} hr)`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => copyAccountDetails(account)}
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <Pagination className="mt-6">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage((prev) => Math.max(1, prev - 1));
                        }}
                        className={
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                        aria-disabled={currentPage === 1}
                      />
                    </PaginationItem>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (page) =>
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1)
                      )
                      .map((page, index, arr) => (
                        <React.Fragment key={page}>
                          {/* Tambah Ellipsis jika ada gap */}
                          {index > 0 && arr[index - 1] + 1 < page && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}
                          <PaginationItem>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(page);
                              }}
                              isActive={currentPage === page}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        </React.Fragment>
                      ))}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1)
                          );
                        }}
                        className={
                          currentPage === totalPages
                            ? "pointer-events-none opacity-50"
                            : ""
                        }
                        aria-disabled={currentPage === totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}

          {isFilteredNoResults && (
            <div className="text-center py-8 text-gray-500">
              <p>
                Tidak ada akun garansi ditemukan untuk filter tanggal{" "}
                {selectedDate ? format(selectedDate, "dd MMMM yyyy") : ""}.
              </p>
            </div>
          )}

          {isInitialLoadEmpty && (
            <div className="text-center py-8 text-gray-500">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Belum ada data akun garansi di sistem.</p>
              <p className="text-sm mt-1">
                Gunakan tombol "Tambah Akun Garansi" untuk memulai.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Komponen Utama Halaman Garansi (Tidak Berubah)
export default function GaransiClientPage() {
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("currentUser");
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
    setIsLoadingAuth(false);
  }, []);

  const isAdmin = currentUser?.role === "admin";

  if (isLoadingAuth) {
    return <LoadingSpinner />;
  }

  return (
    <AccountProvider>
      <div className="min-h-screen bg-zenith-bg relative overflow-hidden">
        <div className="floating-elements"></div>
        <GaransiHeader />
        <main className="container mx-auto py-8 px-4 relative z-10 space-y-8">
          {isAdmin && (
            <div className="flex justify-end mb-4">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah Akun Garansi
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] p-6 max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center">
                      <PlusCircle className="mr-2 h-5 w-5" /> Tambah Akun
                      Garansi Baru
                    </DialogTitle>
                  </DialogHeader>
                  <GaransiForm onSuccess={() => setIsAddDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
          )}
          <GaransiView />
        </main>
      </div>
    </AccountProvider>
  );
}
