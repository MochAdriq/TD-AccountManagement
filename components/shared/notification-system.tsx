"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  X,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  FileText,
  User,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccounts } from "@/contexts/account-context";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Account } from "@prisma/client";

interface Notification {
  id: string;
  type: "warning" | "info" | "success" | "error";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  metadata?: {
    email?: string;
    platform?: string;

    // Data Tambahan untuk Operator
    password?: string; // <--- Password Baru
    adminNote?: string;
    resolvedAt?: string;

    // Data Tambahan untuk Admin
    reportReason?: string;
    operatorName?: string;
    reportedAt?: string;
  };
}

export default function NotificationSystem() {
  const {
    accounts,
    getAvailableProfileCount,
    reportedAccounts,
    getRemainingDays,
  } = useAccounts();

  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRead = localStorage.getItem("read_notifications");
      if (storedRead)
        try {
          setReadIds(new Set(JSON.parse(storedRead)));
        } catch (e) {}
      const storedDismissed = localStorage.getItem("dismissed_notifications");
      if (storedDismissed)
        try {
          setDismissedIds(new Set(JSON.parse(storedDismissed)));
        } catch (e) {}
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!accounts || !user || !isInitialized) return;

    const rawNotifications: Notification[] = [];
    const now = new Date();
    const isRead = (id: string) => readIds.has(id);

    // A. STOCK ALERTS
    const privateStock = getAvailableProfileCount("private");
    const sharingStock = getAvailableProfileCount("sharing");
    const vipStock = getAvailableProfileCount("vip");

    if (privateStock <= 5)
      rawNotifications.push({
        id: `low-private-${now.getDate()}`,
        type: "warning",
        title: "Stok Private Kritis",
        message: `Sisa ${privateStock} profil`,
        timestamp: now.toISOString(),
        read: isRead(`low-private-${now.getDate()}`),
      });
    if (sharingStock <= 10)
      rawNotifications.push({
        id: `low-sharing-${now.getDate()}`,
        type: "warning",
        title: "Stok Sharing Menipis",
        message: `Sisa ${sharingStock} profil`,
        timestamp: now.toISOString(),
        read: isRead(`low-sharing-${now.getDate()}`),
      });
    if (vipStock <= 3)
      rawNotifications.push({
        id: `low-vip-${now.getDate()}`,
        type: "warning",
        title: "Stok VIP Kritis",
        message: `Sisa ${vipStock} profil`,
        timestamp: now.toISOString(),
        read: isRead(`low-vip-${now.getDate()}`),
      });

    // B. EXPIRING (Admin)
    if (user.role === "admin") {
      const expiringAccounts = accounts.filter((account: Account) => {
        const daysLeft = getRemainingDays(account);
        return daysLeft > 0 && daysLeft <= 3;
      });
      if (expiringAccounts.length > 0) {
        const id = `expiring-${now.getDate()}`;
        rawNotifications.push({
          id,
          type: "warning",
          title: "Akun Akan Expired",
          message: `${expiringAccounts.length} akun expired dalam 3 hari`,
          timestamp: now.toISOString(),
          read: isRead(id),
        });
      }
    }

    // C. LAPORAN (LOGIC INTI)
    if (user.role === "admin") {
      // Admin: Lihat Laporan Masuk
      const unresolvedReports = reportedAccounts.filter((r) => !r.resolved);
      unresolvedReports.forEach((report) => {
        const id = `new-report-${report.id}`;
        rawNotifications.push({
          id,
          type: "error",
          title: "Laporan Masuk",
          message: `Akun ${report.account?.email} dilaporkan bermasalah.`,
          timestamp: report.reportedAt
            ? report.reportedAt.toString()
            : now.toISOString(),
          read: isRead(id),
          metadata: {
            email: report.account?.email,
            platform: report.account?.platform,
            reportReason: report.reportReason,
            operatorName: report.operatorName || "System",
            reportedAt: report.reportedAt?.toString(),
          },
        });
      });
    } else if (user.role === "operator") {
      // Operator: Lihat Laporan Selesai
      const myResolvedReports = reportedAccounts.filter((r) => {
        const isMyReport = r.operatorName === user.username;
        const isResolved = r.resolved === true;
        let isRecent = false;
        if (r.resolvedAt) {
          const resolvedTime = new Date(r.resolvedAt).getTime();
          const oneDayAgo = now.getTime() - 24 * 60 * 60 * 1000;
          isRecent = resolvedTime > oneDayAgo;
        }
        return isMyReport && isResolved && isRecent;
      });

      myResolvedReports.forEach((report) => {
        const id = `resolved-${report.id}`;
        rawNotifications.push({
          id,
          type: "success",
          title: "Laporan Diselesaikan",
          message: `Akun ${report.account?.email} telah beres. Klik untuk detail.`,
          timestamp: report.resolvedAt
            ? report.resolvedAt.toString()
            : now.toISOString(),
          read: isRead(id),
          metadata: {
            email: report.account?.email,
            platform: report.account?.platform,
            password: report.account?.password, // PASSWORD DARI DATABASE
            adminNote: report.resolutionNote || "",
            resolvedAt: report.resolvedAt?.toString(),
          },
        });
      });
    }

    const activeNotifications = rawNotifications.filter(
      (n) => !dismissedIds.has(n.id)
    );
    setNotifications((prev) => {
      return [...activeNotifications].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    });
  }, [
    accounts,
    reportedAccounts,
    user,
    getAvailableProfileCount,
    getRemainingDays,
    readIds,
    dismissedIds,
    isInitialized,
  ]);

  // HANDLERS (Sama seperti sebelumnya)
  const updateReadStorage = (newSet: Set<string>) => {
    setReadIds(newSet);
    localStorage.setItem(
      "read_notifications",
      JSON.stringify(Array.from(newSet))
    );
  };
  const updateDismissedStorage = (newSet: Set<string>) => {
    setDismissedIds(newSet);
    localStorage.setItem(
      "dismissed_notifications",
      JSON.stringify(Array.from(newSet))
    );
  };
  const markAsRead = (id: string) => {
    const newSet = new Set(readIds);
    newSet.add(id);
    updateReadStorage(newSet);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };
  const markAllAsRead = () => {
    const newSet = new Set(readIds);
    notifications.forEach((n) => newSet.add(n.id));
    updateReadStorage(newSet);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };
  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const newSet = new Set(dismissedIds);
    newSet.add(id);
    updateDismissedStorage(newSet);
  };
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.metadata) {
      setSelectedNotification(notification);
      setIsOpen(false);
    }
  };
  const getIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return "Baru saja";
      if (diffHours < 24) return `${diffHours}j lalu`;
      return `${Math.floor(diffHours / 24)}h lalu`;
    } catch {
      return "-";
    }
  };
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold">
                  Notifikasi
                </CardTitle>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs h-auto py-1 px-2"
                  >
                    Tandai dibaca
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Tidak ada notifikasi baru</p>
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? "bg-blue-50/60" : "bg-white"
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${
                              !notification.read
                                ? "font-bold text-gray-900"
                                : "font-medium text-gray-700"
                            } truncate`}
                          >
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center mt-1.5">
                            <Clock className="h-3 w-3 text-gray-400 mr-1" />
                            <span className="text-[10px] text-gray-400">
                              {formatTime(notification.timestamp)}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500 hover:bg-transparent"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>

      <Dialog
        open={!!selectedNotification}
        onOpenChange={(open) => !open && setSelectedNotification(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle
              className={`flex items-center gap-2 text-xl ${
                selectedNotification?.type === "error"
                  ? "text-red-700"
                  : "text-green-700"
              }`}
            >
              {selectedNotification?.type === "error" ? (
                <AlertTriangle className="h-6 w-6" />
              ) : (
                <CheckCircle className="h-6 w-6" />
              )}
              {selectedNotification?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedNotification?.type === "error"
                ? "Detail laporan masalah dari operator."
                : "Laporan telah diselesaikan oleh Admin."}
            </DialogDescription>
          </DialogHeader>

          {selectedNotification?.metadata && (
            <div className="space-y-4 py-2">
              {/* TAMPILAN PASSWORD UNTUK OPERATOR */}
              {selectedNotification.type === "success" && (
                <Alert className="bg-green-50 border-green-200">
                  <Info className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800 text-sm font-bold">
                    Password Akun
                  </AlertTitle>
                  <AlertDescription className="text-green-700 text-sm mt-1 font-mono font-bold bg-white p-2 rounded border border-green-300 select-all inline-block">
                    {selectedNotification.metadata.password || "Tidak ada data"}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">
                    Email Akun
                  </p>
                  <p
                    className="font-medium truncate"
                    title={selectedNotification.metadata.email}
                  >
                    {selectedNotification.metadata.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">
                    Platform
                  </p>
                  <p className="font-medium">
                    {selectedNotification.metadata.platform}
                  </p>
                </div>
                {selectedNotification.type === "error" ? (
                  <>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">
                        Pelapor
                      </p>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3 text-gray-400" />
                        <p className="font-medium">
                          {selectedNotification.metadata.operatorName}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">
                        Waktu Lapor
                      </p>
                      <p className="font-medium text-xs">
                        {selectedNotification.metadata.reportedAt
                          ? new Date(
                              selectedNotification.metadata.reportedAt
                            ).toLocaleString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "numeric",
                              month: "short",
                            })
                          : "-"}
                      </p>
                    </div>
                  </>
                ) : (
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold">
                      Waktu Selesai
                    </p>
                    <p className="font-medium text-xs">
                      {selectedNotification.metadata.resolvedAt
                        ? new Date(
                            selectedNotification.metadata.resolvedAt
                          ).toLocaleString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </p>
                  </div>
                )}
              </div>

              <div
                className={`p-3 rounded-lg border ${
                  selectedNotification.type === "error"
                    ? "bg-red-50 border-red-200"
                    : "bg-blue-50 border-blue-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <FileText
                    className={`h-4 w-4 ${
                      selectedNotification.type === "error"
                        ? "text-red-600"
                        : "text-blue-600"
                    }`}
                  />
                  <span
                    className={`text-xs font-bold uppercase ${
                      selectedNotification.type === "error"
                        ? "text-red-700"
                        : "text-blue-700"
                    }`}
                  >
                    {selectedNotification.type === "error"
                      ? "Masalah / Keluhan"
                      : "Catatan Admin"}
                  </span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {selectedNotification.type === "error"
                    ? selectedNotification.metadata.reportReason
                    : selectedNotification.metadata.adminNote ||
                      "Tidak ada catatan tambahan."}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedNotification(null)}
            >
              Tutup
            </Button>
            {selectedNotification?.type === "error" && (
              <Button
                className="bg-red-600 hover:bg-red-700 text-white gap-2"
                onClick={() => {
                  setSelectedNotification(null);
                  router.push("/dashboard/reported");
                }}
              >
                Tindak Lanjuti <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
