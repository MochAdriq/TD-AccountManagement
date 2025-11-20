"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input"; // Import Input
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccounts } from "@/contexts/account-context";
import { ListFilter, Edit, Trash, Filter, X, Search } from "lucide-react"; // Import Search Icon
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
import { useAuth } from "@/lib/auth";
import type { Account, PlatformType } from "@prisma/client";
import { PLATFORM_DISPLAY_NAMES, PLATFORM_LIST } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
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
  const ITEMS_PER_PAGE = 10;
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

  // --- STATE FILTER & SEARCH ---
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState(""); // State Search Baru

  useEffect(() => {
    if (!isContextLoading) {
      const timer = setTimeout(() => setIsLoading(false), 200);
      return () => clearTimeout(timer);
    } else {
      setIsLoading(true);
    }
  }, [isContextLoading]);

  // Reset halaman ke 1 jika filter/search berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [platformFilter, searchQuery]);

  const handleEdit = useCallback((account: Account) => {
    setEditingAccount(account);
    setIsEditDialogOpen(true);
  }, []);

  const handleDelete = useCallback((accountId: string) => {
    setAccountIdToDelete(accountId);
    setIsDeleteDialogOpen(true);
  }, []);

  // 1. Ambil data berdasarkan Tipe Akun
  const accountsByType = getAccountsByType(type);

  // 2. Filter Kombinasi (Platform + Search)
  const filteredAccounts = accountsByType.filter((acc) => {
    // Filter Platform
    const matchesPlatform =
      platformFilter === "all" || acc.platform === platformFilter;

    // Filter Search (Email)
    const matchesSearch =
      searchQuery.trim() === "" ||
      acc.email.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesPlatform && matchesSearch;
  });

  // 3. Sorting
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
        setCurrentPage(newTotalPages);
      } else if (newTotalItems === 0) {
        setCurrentPage(1);
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
      setCurrentPage(totalPages);
    } else if (totalPages === 0) {
      setCurrentPage(1);
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
          <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center">
              <ListFilter className="mr-2 h-5 w-5" />
              {getTitle(type)} Accounts
            </div>

            {/* AREA FILTER & SEARCH DI HEADER */}
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              {/* INPUT SEARCH (BARU) */}
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                <Input
                  placeholder="Cari email..."
                  className="h-9 pl-8 w-full sm:w-[200px] bg-white border-transparent text-gray-900 placeholder:text-gray-500 focus:ring-white/20 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {/* Tombol Clear Search */}
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* DROPDOWN FILTER PLATFORM */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select
                  value={platformFilter}
                  onValueChange={setPlatformFilter}
                >
                  <SelectTrigger className="w-full sm:w-[180px] h-9 bg-white border-transparent text-gray-900 focus:ring-white/20">
                    <div className="flex items-center gap-2 truncate">
                      <Filter className="h-3.5 w-3.5 text-gray-500" />
                      <SelectValue placeholder="Filter Platform" />
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

                {/* Tombol Reset Filter Platform (Hanya muncul jika filter aktif) */}
                {platformFilter !== "all" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPlatformFilter("all")}
                    className="h-9 w-9 text-white/70 hover:text-white hover:bg-blue-500"
                    title="Reset Filter Platform"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-6">
          {/* --- TABLE CONTENT --- */}
          {sortedAccounts.length === 0 ? (
            <div className="text-center py-10 border rounded-lg bg-gray-50">
              {accountsByType.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  No {type} accounts found in database.
                </p>
              ) : (
                <>
                  <Search className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                  <p className="text-gray-900 font-medium">Tidak ditemukan</p>
                  <p className="text-sm text-gray-500">
                    Tidak ada akun yang cocok dengan filter/pencarian Anda.
                  </p>
                  <Button
                    variant="link"
                    onClick={() => {
                      setPlatformFilter("all");
                      setSearchQuery("");
                    }}
                    className="mt-2 text-blue-600"
                  >
                    Reset Pencarian
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Platform</TableHead>
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
                        profileDisplay = "Error";
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
                      profileDisplay = "N/A";
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

          {/* Pagination */}
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
                      currentPage === 1 ? "pointer-events-none opacity-50" : ""
                    }
                    aria-disabled={currentPage === 1}
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <PaginationItem key={page}>
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
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1));
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
        </CardContent>
      </Card>

      {/* Dialogs */}
      {editingAccount && (
        <EditAccountDialog
          account={editingAccount}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
        />
      )}

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
                {sortedAccounts.find((acc) => acc.id === accountIdToDelete)
                  ?.email || ""}
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
