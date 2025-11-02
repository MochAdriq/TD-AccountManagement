"use client";

import { useState, useEffect } from "react";
import { Bell, X, AlertTriangle, Info, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccounts } from "@/contexts/account-context";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Account } from "@prisma/client"; // Impor tipe Account

interface Notification {
  id: string;
  type: "warning" | "info" | "success" | "error";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export default function NotificationSystem() {
  // Ambil getRemainingDays juga untuk perhitungan sisa hari
  const {
    accounts,
    getAvailableProfileCount,
    getReportedAccounts,
    getRemainingDays,
  } = useAccounts();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Generate notifications based on system state
  useEffect(() => {
    // Pastikan accounts sudah ter-load sebelum generate notif
    if (!accounts || accounts.length === 0) {
      return; // Jangan lakukan apa-apa jika data akun belum siap
    }

    const newNotifications: Notification[] = [];

    // Check for low stock (tidak berubah)
    const privateStock = getAvailableProfileCount("private");
    const sharingStock = getAvailableProfileCount("sharing");
    const vipStock = getAvailableProfileCount("vip"); // Cek VIP juga

    if (privateStock <= 5) {
      newNotifications.push({
        id: `low-private-${new Date().getDay()}`, // ID dibuat lebih stabil per hari
        type: "warning",
        title: "Low Private Stock",
        message: `Hanya ${privateStock} profil private tersisa`,
        timestamp: new Date().toISOString(),
        read: false,
      });
    }
    if (sharingStock <= 10) {
      newNotifications.push({
        id: `low-sharing-${new Date().getDay()}`,
        type: "warning",
        title: "Low Sharing Stock",
        message: `Hanya ${sharingStock} profil sharing tersisa`,
        timestamp: new Date().toISOString(),
        read: false,
      });
    }
    if (vipStock <= 3) {
      // Threshold VIP
      newNotifications.push({
        id: `low-vip-${new Date().getDay()}`,
        type: "warning",
        title: "Low VIP Stock",
        message: `Hanya ${vipStock} profil VIP tersisa`,
        timestamp: new Date().toISOString(),
        read: false,
      });
    }

    // --- PERBAIKAN CEK EXPIRED ---
    // Check for expiring accounts (within 3 days)
    const expiringAccounts = accounts.filter((account: Account) => {
      // Beri tipe Account
      // Gunakan getRemainingDays dari context yang sudah benar (camelCase)
      const daysLeft = getRemainingDays(account);
      // Notifikasi jika sisa 1, 2, atau 3 hari (tidak termasuk 0 atau negatif)
      return daysLeft > 0 && daysLeft <= 3;
    });

    if (expiringAccounts.length > 0) {
      newNotifications.push({
        id: `expiring-${new Date().getDay()}`, // ID stabil per hari
        type: "warning",
        title: "Akun Akan Kadaluarsa",
        message: `${expiringAccounts.length} akun akan expired dalam 3 hari`,
        timestamp: new Date().toISOString(),
        read: false,
      });
    }
    // --- AKHIR PERBAIKAN ---

    // Check for reported accounts (tidak berubah)
    const reportedAccounts = getReportedAccounts(); // Getter ini sudah filter resolved=false
    if (reportedAccounts.length > 0) {
      newNotifications.push({
        id: `reported-${new Date().getDay()}`, // ID stabil per hari
        type: "error",
        title: "Laporan Belum Selesai",
        message: `${reportedAccounts.length} akun dilaporkan & butuh perhatian`,
        timestamp: new Date().toISOString(),
        read: false,
      });
    }

    // Update notifications (logika menghindari duplikat disederhanakan)
    setNotifications((prevNotifications) => {
      const incomingNotifMap = new Map(newNotifications.map((n) => [n.id, n]));
      const prevFiltered = prevNotifications.filter(
        (n) => !incomingNotifMap.has(n.id)
      );
      const combined = [...newNotifications, ...prevFiltered];
      // Urutkan berdasarkan timestamp terbaru
      combined.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return combined.slice(0, 20); // Batasi 20 notifikasi
    });
  }, [
    accounts,
    getAvailableProfileCount,
    getReportedAccounts,
    getRemainingDays,
  ]); // Tambah getRemainingDays dependency

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };
  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };
  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Fungsi getIcon dan formatTime (tidak berubah)
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
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // JSX (tidak berubah)
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500 text-white text-xs">
              {" "}
              {unreadCount > 9 ? "9+" : unreadCount}{" "}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                      !notification.read ? "bg-blue-50" : ""
                    }`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2 flex-1">
                        {getIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center mt-1">
                            <Clock className="h-3 w-3 text-gray-400 mr-1" />
                            <span className="text-xs text-gray-400">
                              {formatTime(notification.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(notification.id);
                        }}
                        className="h-6 w-6 p-0 hover:bg-gray-200"
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
  );
}
