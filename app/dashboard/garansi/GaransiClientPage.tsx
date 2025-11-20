"use client";

import { useState, useEffect, useMemo } from "react";
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
  Copy,
  Database,
  PlusCircle,
  Clock,
  CalendarPlus,
  Filter,
  X,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import GaransiForm from "@/components/garansi/garansi-form";
import { Label } from "@/components/ui/label";
import type { GaransiAccount } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PLATFORM_LIST } from "@/lib/constants";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import React from "react";

function GaransiView() {
  const {
    getGaransiAccountsByDate,
    getGaransiAccountsByExpiresAt,
    getRemainingDays,
    garansiAccounts,
  } = useAccounts();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>();

  // --- State Data ---
  const [sourceAccounts, setSourceAccounts] = useState<GaransiAccount[]>([]);
  const [isDateFiltered, setIsDateFiltered] = useState(false);

  // --- State Filter Platform & Tipe (BARU) ---
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all"); // <--- New State

  // --- State Pagination ---
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [isLoadingView, setIsLoadingView] = useState(false);
  const [filterType, setFilterType] = useState<"warrantyDate" | "expiresAt">(
    "warrantyDate"
  );

  // 1. Load Data Awal
  useEffect(() => {
    if (!isDateFiltered && Array.isArray(garansiAccounts)) {
      const sortedAll = [...garansiAccounts].sort((a, b) => {
        const dateA = a.warrantyDate ? new Date(a.warrantyDate).getTime() : 0;
        const dateB = b.warrantyDate ? new Date(b.warrantyDate).getTime() : 0;
        return dateB - dateA;
      });
      setSourceAccounts(sortedAll);
    }
  }, [garansiAccounts, isDateFiltered]);

  // 2. Reset halaman ke 1 jika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [platformFilter, typeFilter]);

  // --- Handle Date Select ---
  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) {
      setSelectedDate(undefined);
      setIsDateFiltered(false);
      const sortedAll = Array.isArray(garansiAccounts)
        ? [...garansiAccounts].sort(
            (a, b) =>
              new Date(b.warrantyDate).getTime() -
              new Date(a.warrantyDate).getTime()
          )
        : [];
      setSourceAccounts(sortedAll);
      setCurrentPage(1);
      return;
    }
    setSelectedDate(date);
    setIsLoadingView(true);
    setIsDateFiltered(true);
    try {
      let dateAccounts: GaransiAccount[] = [];
      const dateString = date.toISOString();
      if (filterType === "warrantyDate") {
        dateAccounts = await getGaransiAccountsByDate(dateString);
      } else {
        dateAccounts = await getGaransiAccountsByExpiresAt(dateString);
      }
      setSourceAccounts(dateAccounts);
      setCurrentPage(1);
    } catch (error) {
      console.error("Failed to load garansi accounts:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data tanggal tersebut.",
        variant: "destructive",
      });
      setSourceAccounts([]);
    } finally {
      setIsLoadingView(false);
    }
  };

  const copyAccountDetails = (account: GaransiAccount) => {
    const textToCopy = `
Email: ${account.email}
Password: ${account.password}
Platform: ${account.platform}
Expired: ${new Date(account.expiresAt).toLocaleDateString("id-ID")}
    `.trim();
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: "Disalin!",
      description: `Akun ${account.email} berhasil disalin.`,
    });
  };

  const copyAllAccounts = () => {
    if (paginatedAccounts.length === 0) return;
    const allText = paginatedAccounts
      .map(
        (acc) =>
          `Email: ${acc.email}\nPassword: ${acc.password}\nPlatform: ${acc.platform}`
      )
      .join("\n\n");
    navigator.clipboard.writeText(allText);
    toast({
      title: "✅ Akun Halaman Ini Tersalin",
      description: `${paginatedAccounts.length} akun garansi berhasil disalin.`,
    });
  };

  // --- LOGIC FILTER GABUNGAN (Platform + Tipe) ---
  const filteredData = sourceAccounts.filter((acc) => {
    // 1. Filter Platform
    if (platformFilter !== "all" && acc.platform !== platformFilter)
      return false;
    // 2. Filter Tipe
    if (typeFilter !== "all" && acc.type !== typeFilter) return false;

    return true;
  });

  // Pagination
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedAccounts = filteredData.slice(startIndex, endIndex);

  const hasResultsToShow = !isLoadingView && paginatedAccounts.length > 0;
  const isFilteredNoResults =
    !isLoadingView &&
    totalItems === 0 &&
    (isDateFiltered || platformFilter !== "all" || typeFilter !== "all");
  const isInitialLoadEmpty =
    !isLoadingView &&
    sourceAccounts.length === 0 &&
    !isDateFiltered &&
    (!garansiAccounts || garansiAccounts.length === 0);

  return (
    <div className="space-y-6">
      <Card className="border-gray-200 shadow-sm max-w-15xl">
        <CardHeader>
          <CardTitle className="flex items-center">
            📅 Cek Akun Garansi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* --- AREA FILTER --- */}
          <div className="space-y-6 mb-6">
            {/* Baris 1: Tipe Tanggal & Dropdowns */}
            <div className="flex flex-col lg:flex-row gap-4 items-end">
              {/* Pilihan Tipe Tanggal */}
              <div className="flex-1 w-full space-y-3">
                <Label className="text-base font-semibold text-gray-700">
                  Filter Tanggal
                </Label>
                <div className="flex gap-2">
                  <Button
                    variant={
                      filterType === "warrantyDate" ? "default" : "outline"
                    }
                    onClick={() => {
                      setFilterType("warrantyDate");
                      if (selectedDate) handleDateSelect(selectedDate);
                    }}
                    className="flex-1 text-xs md:text-sm h-10"
                  >
                    <CalendarPlus className="mr-2 h-4 w-4" /> Tgl Dibuat
                  </Button>
                  <Button
                    variant={filterType === "expiresAt" ? "default" : "outline"}
                    onClick={() => {
                      setFilterType("expiresAt");
                      if (selectedDate) handleDateSelect(selectedDate);
                    }}
                    className="flex-1 text-xs md:text-sm h-10"
                  >
                    <Clock className="mr-2 h-4 w-4" /> Tgl Expired
                  </Button>
                </div>
              </div>

              {/* Filter Platform & Tipe */}
              <div className="w-full lg:w-1/2 space-y-3">
                <Label className="text-base font-semibold text-gray-700">
                  Filter Spesifik
                </Label>
                <div className="flex gap-2">
                  {/* Dropdown Platform */}
                  <Select
                    value={platformFilter}
                    onValueChange={setPlatformFilter}
                  >
                    <SelectTrigger className="h-10 bg-white flex-1">
                      <div className="flex items-center gap-2 truncate">
                        <Filter className="h-4 w-4 text-gray-500" />
                        <SelectValue placeholder="Semua Platform" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Platform</SelectItem>
                      {PLATFORM_LIST.map((p) => (
                        <SelectItem key={p.key} value={p.key}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Dropdown Tipe (BARU) */}
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-10 bg-white w-[140px]">
                      <div className="flex items-center gap-2 truncate">
                        <SelectValue placeholder="Semua Tipe" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Tipe</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="sharing">Sharing</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Tombol Reset */}
                  {(platformFilter !== "all" || typeFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => {
                        setPlatformFilter("all");
                        setTypeFilter("all");
                      }}
                      title="Hapus Filter"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Baris 2: Input Kalender */}
            <div className="space-y-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-12 border-gray-300",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    {selectedDate
                      ? format(selectedDate, "dd MMMM yyyy")
                      : "Pilih tanggal (Opsional)"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Indikator Filter Aktif */}
              {(selectedDate ||
                platformFilter !== "all" ||
                typeFilter !== "all") && (
                <div className="flex items-center justify-between bg-blue-50 p-2 rounded text-xs text-blue-700 flex-wrap gap-2">
                  <span>
                    Menampilkan:
                    {selectedDate && (
                      <strong> {format(selectedDate, "dd MMM yyyy")}</strong>
                    )}
                    {selectedDate &&
                      (platformFilter !== "all" || typeFilter !== "all") &&
                      " + "}
                    {platformFilter !== "all" && (
                      <strong> Platform {platformFilter}</strong>
                    )}
                    {platformFilter !== "all" && typeFilter !== "all" && " + "}
                    {typeFilter !== "all" && (
                      <strong> Tipe {typeFilter}</strong>
                    )}
                  </span>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-blue-800 ml-auto"
                    onClick={() => {
                      handleDateSelect(undefined);
                      setPlatformFilter("all");
                      setTypeFilter("all");
                    }}
                  >
                    Reset Semua
                  </Button>
                </div>
              )}
            </div>
          </div>

          {isLoadingView && <LoadingSpinner />}

          {hasResultsToShow && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="text-lg font-semibold">
                  Daftar Garansi (Total: {totalItems})
                </h3>
                <Button
                  onClick={copyAllAccounts}
                  size="sm"
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  <Copy className="h-4 w-4 mr-2" /> Copy{" "}
                  {paginatedAccounts.length} Akun (Hal Ini)
                </Button>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <Database className="h-4 w-4" />
                <AlertDescription>
                  Data garansi terpisah dari stok utama. Total Global:{" "}
                  <strong>
                    {garansiAccounts ? garansiAccounts.length : 0}
                  </strong>
                  .
                </AlertDescription>
              </Alert>

              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Password</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Ditambahkan</TableHead>
                      <TableHead>Kadaluarsa</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAccounts.map((account) => {
                      const daysLeft = getRemainingDays(account);
                      const isExpired = daysLeft < 0;
                      const isExpiringToday = daysLeft === 0 && !isExpired;
                      return (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium text-sm">
                            {account.email}
                          </TableCell>
                          <TableCell className="text-sm font-mono bg-gray-50 px-2 py-1 rounded w-fit">
                            {account.password}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="whitespace-nowrap"
                            >
                              {account.platform}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px]">
                              {account.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {account.warrantyDate
                              ? format(
                                  new Date(account.warrantyDate),
                                  "dd MMM yyyy"
                                )
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">
                            {account.expiresAt
                              ? format(
                                  new Date(account.expiresAt),
                                  "dd MMM yyyy"
                                )
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                "text-[10px] text-white whitespace-nowrap",
                                isExpired
                                  ? "bg-red-600"
                                  : isExpiringToday
                                  ? "bg-yellow-500"
                                  : "bg-green-600"
                              )}
                            >
                              {isExpired
                                ? "Expired"
                                : isExpiringToday
                                ? "Exp Today"
                                : `Aktif (${daysLeft}h)`}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              onClick={() => copyAccountDetails(account)}
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
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
                      />
                    </PaginationItem>
                    <div className="flex items-center gap-1 text-sm mx-2">
                      Halaman {currentPage} dari {totalPages}
                    </div>
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
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}

          {isFilteredNoResults && (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <Database className="h-10 w-10 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-600 font-medium">Data Tidak Ditemukan</p>
              <p className="text-sm text-gray-500 mt-1">
                Tidak ada akun garansi yang cocok dengan filter.
              </p>
              <Button
                variant="link"
                onClick={() => {
                  handleDateSelect(undefined);
                  setPlatformFilter("all");
                  setTypeFilter("all");
                }}
                className="mt-2 text-blue-600"
              >
                Hapus Semua Filter
              </Button>
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

export default function GaransiClientPage() {
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("currentUser");
    if (user) setCurrentUser(JSON.parse(user));
    setIsLoadingAuth(false);
  }, []);

  const isAdmin = currentUser?.role === "admin";
  if (isLoadingAuth) return <LoadingSpinner />;

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
