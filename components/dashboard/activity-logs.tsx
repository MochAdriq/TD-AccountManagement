"use client";

import { useState, useEffect, useMemo } from "react"; // Tambah useMemo
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/contexts/account-context"; // Import context
import {
  Activity,
  Download,
  Filter,
  Search,
  AlertTriangle,
} from "lucide-react"; // Tambah AlertTriangle
import { useToast } from "@/hooks/use-toast";
import type { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { OperatorActivity, AccountType } from "@prisma/client"; // Impor tipe asli dari Prisma
import { useAuth } from "@/lib/auth"; // Impor useAuth untuk cek admin

// Tipe log tidak lagi dibutuhkan
// interface ActivityLog { ... }

export default function ActivityLogs() {
  // --- GUNAKAN DATA ASLI DARI CONTEXT ---
  const { operatorActivities, isLoading: isContextLoading } = useAccounts(); // Ambil data asli dan status loading
  const { user: currentUser } = useAuth(); // Ambil user yg login
  const { toast } = useToast();
  // --- AKHIR PENGGUNAAN CONTEXT ---

  // State filter (tidak berubah)
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all"); // Tipe filter masih string 'all' | AccountType
  // Status tidak relevan lagi untuk OperatorActivity, bisa dihapus jika mau
  // const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // State untuk loading lokal (opsional, jika ingin loading spesifik di komponen ini)
  const [isLoading, setIsLoading] = useState(true);

  // Update loading lokal berdasarkan context loading
  useEffect(() => {
    setIsLoading(isContextLoading);
  }, [isContextLoading]);

  // --- HAPUS useEffect UNTUK SIMULASI LOG ---
  // useEffect(() => { ... generate activity logs ... }, [customerAssignments, accounts]);
  // --- AKHIR PENGHAPUSAN ---

  // --- FILTER LOGS MENGGUNAKAN DATA ASLI ---
  const filteredLogs = useMemo(() => {
    // Gunakan useMemo agar filtering tidak berjalan setiap re-render
    let filtered: OperatorActivity[] = Array.isArray(operatorActivities)
      ? [...operatorActivities]
      : [];

    // Search filter (sesuaikan field)
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.operatorName.toLowerCase().includes(lowerSearch) ||
          log.action.toLowerCase().includes(lowerSearch) ||
          log.accountEmail.toLowerCase().includes(lowerSearch) ||
          log.accountType.toLowerCase().includes(lowerSearch)
      );
    }

    // Type filter (berdasarkan accountType)
    if (filterType !== "all") {
      filtered = filtered.filter((log) => log.accountType === filterType);
    }

    // Status filter DIHAPUS karena tidak ada di OperatorActivity

    // Date range filter (gunakan field 'date')
    if (dateRange?.from) {
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((log) => new Date(log.date) >= fromDate);
    }
    if (dateRange?.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((log) => new Date(log.date) <= toDate);
    }

    // Data dari context sudah diurutkan desc by date, jadi tidak perlu sort lagi
    return filtered;
  }, [operatorActivities, searchTerm, filterType, dateRange]); // Dependencies filtering
  // --- AKHIR FILTER LOGS ---

  // --- EXPORT LOGS DIPERBARUI ---
  const exportLogs = () => {
    const csvContent = [
      // Sesuaikan header
      ["Timestamp", "Operator", "Action", "Account Email", "Account Type"].join(
        ","
      ),
      ...filteredLogs.map((log) =>
        [
          // Sesuaikan field data
          new Date(log.date).toLocaleString("id-ID"), // Gunakan field 'date'
          log.operatorName,
          log.action,
          log.accountEmail,
          log.accountType,
        ]
          .map((field) => `"${String(field ?? "").replace(/"/g, '""')}"`) // Handle null/undefined dan escape quotes
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    let filename = "operator-activity-logs"; // Nama file lebih spesifik
    if (dateRange?.from)
      filename += `-from-${dateRange.from.toISOString().split("T")[0]}`;
    if (dateRange?.to)
      filename += `-to-${dateRange.to.toISOString().split("T")[0]}`;
    filename += ".csv";

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up object URL

    toast({
      title: "Export Successful",
      description: "Operator activity logs have been exported to CSV",
    });
  };
  // --- AKHIR EXPORT LOGS ---

  // --- Fungsi clearFilters & getStatusBadge/getTypeBadge tidak berubah ---
  const clearFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    // setFilterStatus("all"); // Hapus status
    setDateRange(undefined);
  };

  // Fungsi getStatusBadge tidak relevan lagi
  // const getStatusBadge = (status: string) => { ... };

  // getAccountTypeBadge (ganti nama dari getTypeBadge)
  const getAccountTypeBadge = (type: AccountType | string) => {
    const colors: Record<AccountType | string, string> = {
      // Tambah index signature
      private: "bg-blue-500",
      sharing: "bg-purple-500",
      vip: "bg-yellow-500", // Sesuaikan warna VIP jika perlu
    };
    return (
      <Badge className={colors[type] || "bg-gray-500"}>
        {" "}
        {/* Fallback */}
        {type}
      </Badge>
    );
  };
  // --- AKHIR FUNGSI HELPER ---

  // Cek admin (tidak berubah)
  const isAdmin = currentUser?.role === "admin";

  // Tampilan jika bukan admin (tidak berubah)
  if (!isAdmin && !isContextLoading) {
    // Tambah cek isContextLoading agar tidak tampil prematur
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-400" />{" "}
          {/* Icon beda */}
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Akses Ditolak
          </h3>
          <p className="text-gray-500">
            Log aktivitas hanya dapat dilihat oleh Administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Tampilan loading (tidak berubah)
  if (isLoading) {
    // Atau gunakan LoadingSpinner jika ada
    return <div className="text-center p-10">Memuat log aktivitas...</div>;
  }

  // --- TAMPILAN UTAMA (JSX) DIPERBARUI ---
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="mr-2 h-5 w-5" />
          Operator Activity Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-start">
            {/* Search Input */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cari operator, aksi, email..." // Placeholder lebih spesifik
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filter Dropdowns & Buttons */}
            <div className="flex flex-wrap gap-2">
              {" "}
              {/* Ganti ke flex-wrap */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-32">
                  {" "}
                  {/* Responsive width */}
                  <SelectValue placeholder="Tipe Akun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="sharing">Sharing</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
              {/* Hapus Select Status */}
              {/* <Select value={filterStatus} onValueChange={setFilterStatus}>...</Select> */}
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder="Filter tanggal" // Responsive width
              />
              {(searchTerm || filterType !== "all" || dateRange) && ( // Update kondisi clear
                <Button variant="outline" onClick={clearFilters} size="sm">
                  <Filter className="h-4 w-4 mr-1 sm:mr-2" />{" "}
                  {/* Margin responsive */}
                  <span className="hidden sm:inline">Clear</span>{" "}
                  {/* Teks di layar besar */}
                </Button>
              )}
              <Button
                onClick={exportLogs}
                className="bg-blue-600 hover:bg-blue-700"
                size="sm" // Samakan ukuran tombol
              >
                <Download className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>

          {/* Results summary (gunakan data asli) */}
          <div className="text-sm text-gray-500">
            {/* Total log dari context, filtered dari useMemo */}
            Menampilkan {filteredLogs.length} dari{" "}
            {operatorActivities?.length || 0} aktivitas
          </div>

          {/* Logs table (sesuaikan kolom) */}
          <div className="overflow-x-auto border rounded-md">
            {" "}
            {/* Tambah border */}
            <Table>
              <TableHeader className="bg-gray-50">
                {" "}
                {/* Header dengan background */}
                <TableRow>
                  <TableHead className="w-[150px]">Timestamp</TableHead>{" "}
                  {/* Lebar tetap */}
                  <TableHead>Operator</TableHead>
                  <TableHead className="min-w-[250px]">Action</TableHead>{" "}
                  {/* Lebar minimum */}
                  <TableHead>Account Email</TableHead>
                  <TableHead>Account Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5} // Sesuaikan colSpan
                      className="text-center py-8 text-gray-500" // Padding lebih besar
                    >
                      Tidak ada log aktivitas yang cocok dengan filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-gray-50 text-sm">
                      {" "}
                      {/* Ukuran font */}
                      <TableCell>
                        {new Date(log.date).toLocaleString("id-ID", {
                          // Format lengkap
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.operatorName}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {log.action}
                      </TableCell>{" "}
                      {/* Allow wrap */}
                      <TableCell className="font-mono">
                        {log.accountEmail}
                      </TableCell>
                      <TableCell>
                        {getAccountTypeBadge(log.accountType)}
                      </TableCell>
                      {/* Hapus kolom Status & Details */}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
  // --- AKHIR TAMPILAN UTAMA ---
}
