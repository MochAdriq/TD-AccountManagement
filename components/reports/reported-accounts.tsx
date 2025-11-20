"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react"; // Tambah useEffect & useRef
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccounts } from "@/contexts/account-context";
import { useAuth } from "@/lib/auth";
import { CheckCircle, Filter, X, Search, Loader2 } from "lucide-react"; // Tambah icon
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PlatformType, Account } from "@prisma/client"; // Import Account type
import { PLATFORM_DISPLAY_NAMES, PLATFORM_LIST } from "@/lib/constants";

export default function ReportedAccounts() {
  // Tambahkan searchAccountsByEmail
  const {
    getReportedAccounts,
    resolveReport,
    reportAccount,
    searchAccountsByEmail,
  } = useAccounts();
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";

  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // --- STATE FORM LAPORAN ---
  const [emailToReport, setEmailToReport] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  // --- STATE SUGESTI (AUTOCOMPLETE) ---
  const [suggestions, setSuggestions] = useState<Account[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null); // Untuk klik di luar

  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const reportedAccounts = getReportedAccounts();

  const filteredReports = reportedAccounts.filter((report) => {
    // 1. HANYA TAMPILKAN YANG BELUM RESOLVED
    if (report.resolved) return false;

    // 2. Filter Platform
    if (platformFilter === "all") return true;
    return report.account?.platform === platformFilter;
  });

  // --- LOGIC SUGGESTIONS ---
  // Handle ketikan user
  const handleEmailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmailToReport(value);

    if (value.trim().length > 2) {
      // Cari jika lebih dari 2 karakter
      setIsSearching(true);
      setShowSuggestions(true);
      try {
        const results = await searchAccountsByEmail(value);
        setSuggestions(results);
      } catch (error) {
        console.error("Error searching accounts:", error);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle klik sugesti
  const handleSelectSuggestion = (account: Account) => {
    setEmailToReport(account.email);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Tutup sugesti jika klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);
  // --- END LOGIC SUGGESTIONS ---

  const handleResolve = (reportId: string) => {
    setSelectedReport(reportId);
    setNewPassword("");
    setResolutionNote("");
    setIsDialogOpen(true);
  };

  const handleUpdatePassword = async () => {
    if (!selectedReport || !newPassword) return;
    const success = await resolveReport(
      selectedReport,
      newPassword,
      resolutionNote
    );
    if (success) {
      setIsDialogOpen(false);
      setSelectedReport(null);
      setNewPassword("");
      setResolutionNote("");
    }
  };

  const handleMarkAsResolved = async () => {
    if (!selectedReport) return;
    const success = await resolveReport(
      selectedReport,
      undefined,
      resolutionNote
    );
    if (success) {
      setIsDialogOpen(false);
      setSelectedReport(null);
      setResolutionNote("");
    }
  };

  const handleReportAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const operatorUsername = user?.username || "Unknown";
    setIsReporting(true);
    try {
      const success = await reportAccount(
        emailToReport,
        reportReason,
        operatorUsername
      );
      if (success) {
        setEmailToReport("");
        setReportReason("");
      }
    } catch (error) {
      console.error("Unexpected error in report form:", error);
    } finally {
      setIsReporting(false);
    }
  };

  const getPlatformDisplayName = (
    platformKey: PlatformType | null | undefined
  ): string => {
    if (!platformKey) return "N/A";
    const key = platformKey as keyof typeof PLATFORM_DISPLAY_NAMES;
    return PLATFORM_DISPLAY_NAMES[key] || platformKey;
  };

  return (
    <Tabs defaultValue="list" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger
          value="list"
          className="data-[state=active]:bg-luna-primary data-[state=active]:text-white"
        >
          Reported Accounts
        </TabsTrigger>
        <TabsTrigger
          value="report"
          className="data-[state=active]:bg-luna-primary data-[state=active]:text-white"
        >
          Report Account
        </TabsTrigger>
      </TabsList>

      <TabsContent value="list">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <div className="text-sm text-muted-foreground">
            Total Reports: <strong>{filteredReports.length}</strong>
          </div>
          <div className="flex items-center gap-2">
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[200px] bg-white">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <SelectValue placeholder="Filter Platform" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {PLATFORM_LIST.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {platformFilter !== "all" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPlatformFilter("all")}
                className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                title="Clear Filter"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <div className="text-center py-10 border rounded-lg bg-gray-50">
            {reportedAccounts.length === 0 ? (
              <>
                <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                <h3 className="text-base font-medium text-luna-primary dark:text-white mb-1">
                  No Reported Accounts
                </h3>
                <p className="text-sm text-muted-foreground">
                  All accounts are working properly.
                </p>
              </>
            ) : (
              <>
                <Filter className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <h3 className="text-base font-medium text-gray-900 mb-1">
                  No reports found
                </h3>
                <p className="text-sm text-muted-foreground">
                  No reports match the selected platform filter.
                </p>
                <Button
                  variant="link"
                  onClick={() => setPlatformFilter("all")}
                  className="mt-2 text-blue-600 h-auto p-0"
                >
                  Clear Filter
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="border rounded-md bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead>Reported At</TableHead>
                  <TableHead>Reported By</TableHead>
                  {isAdmin && (
                    <TableHead className="text-right">Action</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {report.account?.email || "Email N/A"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {getPlatformDisplayName(report.account?.platform)}
                    </TableCell>
                    <TableCell>{report.reportReason}</TableCell>
                    <TableCell>
                      {new Date(report.reportedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      {report.operatorName || "N/A"}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-luna-primary border-luna-primary hover:bg-luna-primary hover:text-white"
                          onClick={() => handleResolve(report.id)}
                        >
                          Resolve
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="report">
        <form onSubmit={handleReportAccount} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* --- INPUT EMAIL DENGAN SUGGESTION --- */}
            <div className="space-y-2 relative" ref={wrapperRef}>
              <Label htmlFor="email-to-report">Account Email</Label>
              <div className="relative">
                <Input
                  id="email-to-report"
                  type="email"
                  value={emailToReport}
                  onChange={handleEmailChange}
                  onFocus={() => {
                    if (emailToReport.length > 2) setShowSuggestions(true);
                  }}
                  placeholder="Start typing email..."
                  className="border-luna-primary/20 focus-visible:ring-luna-primary pr-10"
                  required
                  autoComplete="off"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                )}
              </div>

              {/* DROPDOWN SUGGESTION */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                  <ul className="py-1">
                    {suggestions.map((acc) => (
                      <li
                        key={acc.id}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                        onClick={() => handleSelectSuggestion(acc)}
                      >
                        <div className="font-medium text-sm text-gray-900">
                          {acc.email}
                        </div>
                        <div className="text-xs text-gray-500 flex justify-between">
                          <span>{getPlatformDisplayName(acc.platform)}</span>
                          <span className="uppercase bg-gray-100 px-1 rounded text-[10px]">
                            {acc.type}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {showSuggestions &&
                suggestions.length === 0 &&
                !isSearching &&
                emailToReport.length > 2 && (
                  <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 p-3 text-center text-xs text-gray-500">
                    Tidak ditemukan akun yang cocok.
                  </div>
                )}
            </div>
            {/* --- END INPUT EMAIL --- */}

            <div className="space-y-2">
              <Label htmlFor="report-reason">Issue Description</Label>
              <Input
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Describe the issue"
                className="border-luna-primary/20 focus-visible:ring-luna-primary"
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full bg-luna-primary hover:bg-luna-secondary"
            disabled={isReporting || !emailToReport || !reportReason}
          >
            {isReporting ? "Reporting..." : "Report Account"}
          </Button>
        </form>
      </TabsContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Selesaikan Masalah Akun</DialogTitle>
            <DialogDescription>
              Tindakan ini akan menghapus status "Reported" dari akun.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Password Baru (Opsional)</Label>
              <Input
                id="new-password"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Kosongkan jika tidak diganti"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolution-note">
                Catatan Penyelesaian (Opsional)
              </Label>
              <Textarea
                id="resolution-note"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Contoh: Sudah diganti profile C / Akun di-refund"
                className="h-24 resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Catatan ini akan berguna untuk riwayat dan notifikasi operator.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Batal
            </Button>
            <Button
              variant="secondary"
              onClick={handleMarkAsResolved}
              className="bg-green-100 text-green-800 hover:bg-green-200 border border-green-200"
            >
              Selesai (Tanpa Ganti Pass)
            </Button>
            <Button
              onClick={handleUpdatePassword}
              disabled={!newPassword}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Update Password & Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
