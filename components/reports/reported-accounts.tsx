"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CheckCircle, Filter, X } from "lucide-react"; // Tambah icon Filter & X
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
} from "@/components/ui/select"; // Tambah komponen Select
import type { PlatformType } from "@prisma/client";
// Import constants
import { PLATFORM_DISPLAY_NAMES, PLATFORM_LIST } from "@/lib/constants"; // Tambah PLATFORM_LIST

export default function ReportedAccounts() {
  const { getReportedAccounts, resolveReport, reportAccount } = useAccounts();
  const { user } = useAuth();

  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [emailToReport, setEmailToReport] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  // --- STATE FILTER ---
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const reportedAccounts = getReportedAccounts(); // Data asli

  // --- LOGIKA FILTER ---
  const filteredReports = reportedAccounts.filter((report) => {
    if (platformFilter === "all") return true;
    return report.account?.platform === platformFilter;
  });

  const handleResolve = (reportId: string) => {
    setSelectedReport(reportId);
    setNewPassword("");
    setIsDialogOpen(true);
  };
  const handleUpdatePassword = async () => {
    if (!selectedReport || !newPassword) return;
    const success = await resolveReport(selectedReport, newPassword);
    if (success) {
      setIsDialogOpen(false);
      setSelectedReport(null);
      setNewPassword("");
    }
  };
  const handleMarkAsResolved = async () => {
    if (!selectedReport) return;
    const success = await resolveReport(selectedReport);
    if (success) {
      setIsDialogOpen(false);
      setSelectedReport(null);
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

  // Helper function to get platform display name
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
        {/* --- FILTER SECTION --- */}
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

            {/* Tombol Hapus Filter (Hanya muncul jika filter aktif) */}
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

        {/* --- CONTENT SECTION --- */}
        {filteredReports.length === 0 ? (
          <div className="text-center py-10 border rounded-lg bg-gray-50">
            {reportedAccounts.length === 0 ? (
              // Case 1: Database kosong
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
              // Case 2: Ada data tapi tidak cocok dengan filter
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
                  <TableHead>Action</TableHead>
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
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-luna-primary border-luna-primary hover:bg-luna-primary hover:text-white"
                        onClick={() => handleResolve(report.id)}
                      >
                        Resolve
                      </Button>
                    </TableCell>
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
            <div className="space-y-2">
              <Label htmlFor="email-to-report">Account Email</Label>
              <Input
                id="email-to-report"
                type="email"
                value={emailToReport}
                onChange={(e) => setEmailToReport(e.target.value)}
                placeholder="Enter email address"
                className="border-luna-primary/20 focus-visible:ring-luna-primary"
                required
              />
            </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Account Issue</DialogTitle>
            <DialogDescription>
              You can update the password for this account or mark the issue as
              resolved without changes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password (Optional)</Label>
              <Input
                id="new-password"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank if you want to mark the issue as resolved without
                changing the password.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleMarkAsResolved}>
              Mark as Resolved
            </Button>
            <Button onClick={handleUpdatePassword} disabled={!newPassword}>
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
