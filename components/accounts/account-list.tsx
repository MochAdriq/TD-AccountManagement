"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccounts } from "@/contexts/account-context";
import { ListFilter, Edit, Trash } from "lucide-react";
import EditAccountDialog from "./edit-account-dialog";
import { Button } from "@/components/ui/button";
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
import LoadingSpinner from "../shared/loading-spinner";
import { useAuth } from "@/lib/auth"; // <-- Path diperbaiki
import type { Account, PlatformType } from "@prisma/client";
import { PLATFORM_DISPLAY_NAMES } from "@/lib/constants";

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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Helper for Profile type
type Profile = { profile: string; pin: string; used: boolean };

// Helper for card title
const getTitle = (type: "private" | "sharing" | "vip"): string => {
  switch (type) {
    case "private":
      return "Private";
    case "sharing":
      return "Sharing";
    case "vip":
      return "VIP";
    default:
      return "Unknown";
  }
};

interface AccountListProps {
  type: "private" | "sharing" | "vip";
}

export default function AccountList({ type }: AccountListProps) {
  const ITEMS_PER_PAGE = 10; // Jumlah item per halaman, bisa disesuaikan
  const [currentPage, setCurrentPage] = useState(1);
  const {
    getAccountsByType,
    getRemainingDays,
    deleteAccount,
    isLoading: isContextLoading,
  } = useAccounts();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [isLoading, setIsLoading] = useState(true);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [accountIdToDelete, setAccountIdToDelete] = useState<string | null>(
    null
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isContextLoading) {
      const timer = setTimeout(() => setIsLoading(false), 200);
      return () => clearTimeout(timer);
    } else {
      setIsLoading(true);
    }
  }, [isContextLoading]);
  const handleEdit = useCallback((account: Account) => {
    setEditingAccount(account);
    setIsEditDialogOpen(true);
  }, []);
  const handleDelete = useCallback((accountId: string) => {
    setAccountIdToDelete(accountId);
    setIsDeleteDialogOpen(true);
  }, []);

  const filteredAccounts = getAccountsByType(type); // Ambil data dulu

  const sortedAccounts = [...filteredAccounts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const confirmDelete = useCallback(async () => {
    if (!accountIdToDelete) return;
    setIsDeleting(true);
    try {
      await deleteAccount(accountIdToDelete);

      const newTotalItems = sortedAccounts.length - 1;
      const newTotalPages = Math.ceil(newTotalItems / ITEMS_PER_PAGE);

      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages); // Mundur ke halaman terakhir yang baru
      } else if (newTotalItems === 0) {
        setCurrentPage(1); // Reset ke halaman 1 jika tidak ada item tersisa
      }
    } catch (error) {
      console.error("Error during delete confirmation:", error);
    } finally {
      setIsDeleting(false);
      setAccountIdToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  }, [
    accountIdToDelete,
    deleteAccount,
    sortedAccounts.length,
    currentPage,
    ITEMS_PER_PAGE,
  ]);

  const totalItems = sortedAccounts.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages); // Set ke halaman terakhir yang valid
    } else if (totalPages === 0) {
      setCurrentPage(1); // Set ke 1 jika tidak ada data
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;

  const paginatedAccounts = sortedAccounts.slice(startIndex, endIndex);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const getPlatformDisplayName = (
    platformKey: PlatformType | null | undefined
  ): string => {
    if (!platformKey) return "N/A";
    const key = platformKey as keyof typeof PLATFORM_DISPLAY_NAMES;
    return PLATFORM_DISPLAY_NAMES[key] || platformKey;
  };

  return (
    <>
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="bg-blue-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center">
            <ListFilter className="mr-2 h-5 w-5" />
            {getTitle(type)} Accounts
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                No {type} accounts found
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Platform</TableHead> {/* Header added */}
                    <TableHead className="text-center">
                      Profiles (Avail/Total)
                    </TableHead>
                    <TableHead className="text-center">Days Left</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAccounts.map((account: Account) => {
                    let availableProfiles = 0;
                    let totalProfiles = 0;
                    let profileDisplay = "-/-";

                    let profilesArray: Profile[] = [];
                    if (typeof account.profiles === "string") {
                      try {
                        profilesArray = JSON.parse(
                          account.profiles
                        ) as Profile[];
                      } catch (e) {
                        console.error("Error parsing profiles JSON:", e);
                        profileDisplay = "Error"; // Tampilkan error jika JSON tidak valid
                      }
                    } else if (Array.isArray(account.profiles)) {
                      profilesArray = account.profiles as unknown as Profile[];
                    }

                    if (Array.isArray(profilesArray)) {
                      totalProfiles = profilesArray.length;
                      availableProfiles = profilesArray.filter(
                        (p) =>
                          typeof p === "object" &&
                          p !== null &&
                          p.used === false
                      ).length;
                      profileDisplay = `${availableProfiles}/${totalProfiles}`;
                    } else if (profileDisplay !== "Error") {
                      profileDisplay = "N/A"; // Data tidak dikenal
                    }

                    const daysLeft = getRemainingDays(account);
                    const isExpired = daysLeft < 0;
                    const isExpiringToday = daysLeft === 0 && !isExpired;

                    return (
                      <TableRow
                        key={account.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <TableCell className="font-medium text-sm">
                          {account.email}
                        </TableCell>
                        <TableCell className="text-sm">
                          {account.password}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline">
                            {getPlatformDisplayName(account.platform)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              availableProfiles === 0
                                ? "destructive"
                                : availableProfiles < totalProfiles / 3
                                ? "secondary"
                                : "default"
                            }
                            className="font-mono text-xs bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {profileDisplay}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              daysLeft <= 3
                                ? "destructive"
                                : daysLeft <= 7
                                ? "secondary"
                                : "default"
                            }
                            className="font-mono text-xs bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {daysLeft} days
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {account.reported ? (
                            <Badge variant="destructive" className="text-xs">
                              Reported
                            </Badge>
                          ) : isExpired ? (
                            <Badge variant="destructive" className="text-xs">
                              Expired ({Math.abs(daysLeft)}d ago)
                            </Badge>
                          ) : isExpiringToday ? (
                            <Badge variant="secondary" className="text-xs">
                              Expires Today
                            </Badge>
                          ) : (
                            <Badge
                              variant="default"
                              className="text-xs bg-green-600 hover:bg-green-700"
                            >
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <TooltipProvider delayDuration={100}>
                            <div className="flex justify-end space-x-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={
                                      isAdmin
                                        ? () => handleEdit(account)
                                        : undefined
                                    }
                                    className={`h-7 w-7 text-blue-600 hover:bg-blue-100 ${
                                      !isAdmin &&
                                      "opacity-50 cursor-not-allowed"
                                    }`}
                                    aria-disabled={!isAdmin}
                                  >
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Edit</span>
                                  </Button>
                                </TooltipTrigger>
                                {!isAdmin && (
                                  <TooltipContent>
                                    <p>
                                      Anda tidak memiliki akses untuk fitur ini
                                    </p>
                                  </TooltipContent>
                                )}
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={
                                      isAdmin
                                        ? () => handleDelete(account.id)
                                        : undefined
                                    }
                                    className={`h-7 w-7 text-red-600 hover:bg-red-100 ${
                                      !isAdmin &&
                                      "opacity-50 cursor-not-allowed"
                                    }`}
                                    aria-disabled={!isAdmin}
                                  >
                                    <Trash className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </TooltipTrigger>
                                {!isAdmin && (
                                  <TooltipContent>
                                    <p>
                                      Anda tidak memiliki akses untuk fitur ini
                                    </p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </div>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {/* ▲▲▲ SELESAI KONTEN JIKA ADA DATA ▲▲▲ */}

          {/* ▼▼▼ TAMBAHKAN PAGINATION UI ▼▼▼ */}
          {/* (Ditempatkan di dalam CardContent, setelah blok ternary) */}
          {totalPages > 1 && ( // Hanya tampilkan jika lebih dari 1 halaman
            <Pagination className="mt-6">
              <PaginationContent>
                {/* Tombol Previous */}
                <PaginationItem>
                  <PaginationPrevious
                    href="#" // href="#" agar tidak pindah halaman
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage((prev) => Math.max(1, prev - 1));
                    }}
                    // Nonaktifkan jika di halaman pertama
                    className={
                      currentPage === 1 ? "pointer-events-none opacity-50" : ""
                    }
                    aria-disabled={currentPage === 1}
                  />
                </PaginationItem>

                {/* Nomor Halaman (Logika sederhana) */}
                {/* TODO: Untuk pagination yang lebih kompleks (ellipsis, dll.) 
                  perlu logika tambahan untuk generate nomor halaman 
                  (misal: hanya tampilkan 1, ..., 4, 5, 6, ..., 10)
                */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(page);
                        }}
                        // Tandai halaman aktif
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                {/* Bisa ditambahkan <PaginationEllipsis /> jika halamannya banyak */}

                {/* Tombol Next */}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                    }}
                    // Nonaktifkan jika di halaman terakhir
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
          {/* ▲▲▲ SELESAI PAGINATION UI ▲▲▲ */}
        </CardContent>
      </Card>

      {/* Dialog Edit Akun */}
      {editingAccount && (
        <EditAccountDialog
          account={editingAccount}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}

      {/* Dialog Konfirmasi Delete */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              account{" "}
              <strong>
                {sortedAccounts.find(
                  (acc: Account) => acc.id === accountIdToDelete
                )?.email || ""}
              </strong>
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Yes, delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
