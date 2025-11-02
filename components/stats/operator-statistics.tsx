"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useAccounts,
  type OperatorStatisticsData,
} from "@/contexts/account-context"; // Import context & tipe
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Users, Calendar, AlertTriangle } from "lucide-react"; // Tambah AlertTriangle
import { useMemo } from "react"; // Import useMemo

export default function OperatorStatistics() {
  // --- AMBIL DATA DARI CONTEXT ---
  const {
    getOperatorStatistics, // Getter baru untuk data agregat
    isLoading: isContextLoading, // Ambil status loading
  } = useAccounts();
  // --- AKHIR AMBIL DATA ---

  // --- AMBIL DATA STATISTIK AGREGAT ---
  const operatorStats: OperatorStatisticsData | null = getOperatorStatistics();
  // --- AKHIR AMBIL DATA STATISTIK ---

  // --- Gunakan useMemo untuk menghitung total ---
  const totals = useMemo(() => {
    if (!operatorStats) return { operators: 0, requests: 0, today: 0 };

    const todayStr = new Date().toISOString().split("T")[0]; // Format YYYY-MM-DD
    let totalRequests = 0;
    let todayRequests = 0;

    Object.values(operatorStats).forEach((stat) => {
      totalRequests += stat.total;
      todayRequests += stat.byDate[todayStr] || 0;
    });

    return {
      operators: Object.keys(operatorStats).length,
      requests: totalRequests,
      today: todayRequests,
    };
  }, [operatorStats]); // Hitung ulang hanya jika operatorStats berubah
  // --- AKHIR PERHITUNGAN TOTAL ---

  // Tampilan loading
  if (isContextLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="animate-pulse">
            <CardHeader className="pb-2">
              <CardTitle className="h-4 bg-gray-200 rounded w-3/4"></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardHeader className="pb-2">
              <CardTitle className="h-4 bg-gray-200 rounded w-3/4"></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
          <Card className="animate-pulse">
            <CardHeader className="pb-2">
              <CardTitle className="h-4 bg-gray-200 rounded w-3/4"></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        </div>
        {/* Skeleton Table */}
        <Card>
          <CardHeader>
            <CardTitle className="h-6 bg-gray-200 rounded w-1/4"></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tampilan jika error fetch data statistik
  if (!operatorStats) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-red-600">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          Gagal memuat data statistik operator. Coba refresh halaman.
        </CardContent>
      </Card>
    );
  }

  // --- TAMPILAN UTAMA (JSX) DIPERBARUI ---
  return (
    <div className="space-y-6">
      {/* Cards Statistik Total (gunakan data dari totals) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Operators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-5 w-5 text-gray-500 mr-2" />
              <div className="text-2xl font-bold">{totals.operators}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BarChart className="h-5 w-5 text-gray-500 mr-2" />
              <div className="text-2xl font-bold">{totals.requests}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Today's Requests
            </CardTitle>
          </CardHeader>{" "}
          {/* Ubah judul */}
          <CardContent>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-500 mr-2" />
              <div className="text-2xl font-bold">{totals.today}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Statistik per Operator (gunakan data asli operatorStats) */}
      <Card>
        <CardHeader>
          <CardTitle>Statistik per Operator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-md">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Operator</TableHead>
                  <TableHead>Total Requests</TableHead>
                  <TableHead>Private</TableHead>
                  <TableHead>Sharing</TableHead>
                  <TableHead>VIP</TableHead> {/* Tambah kolom VIP */}
                  <TableHead>Hari Ini</TableHead>
                  <TableHead>Aktivitas Terakhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Looping data dari operatorStats */}
                {Object.entries(operatorStats).map(([operatorName, stats]) => {
                  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
                  const todayCount = stats.byDate[todayStr] || 0;

                  // Cari tanggal terakhir dari keys byDate
                  const dateKeys = Object.keys(stats.byDate);
                  const lastActivityDate =
                    dateKeys.length > 0
                      ? new Date(dateKeys.sort().pop()!).toLocaleDateString(
                          "id-ID",
                          { day: "2-digit", month: "short", year: "numeric" }
                        ) // Format tanggal
                      : "-";

                  return (
                    <TableRow key={operatorName} className="text-sm">
                      <TableCell className="font-medium">
                        {operatorName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{stats.total}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-500">{stats.private}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-purple-500">{stats.sharing}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-yellow-500">{stats.vip}</Badge>
                      </TableCell>{" "}
                      {/* Tampilkan VIP */}
                      <TableCell>
                        <Badge
                          className={
                            todayCount > 0 ? "bg-green-500" : "bg-gray-400"
                          }
                        >
                          {todayCount}
                        </Badge>
                      </TableCell>{" "}
                      {/* Warna abu jika 0 */}
                      <TableCell className="text-xs text-gray-500">
                        {lastActivityDate}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Tampilan jika tidak ada data */}
                {Object.keys(operatorStats).length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-gray-500"
                    >
                      {" "}
                      {/* Update colSpan */}
                      Belum ada aktivitas operator yang tercatat.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail aktivitas per operator (tidak berubah signifikan) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {" "}
        {/* Layout grid bisa disesuaikan */}
        {Object.entries(operatorStats).map(([operatorName, stats]) => (
          <Card key={operatorName}>
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Aktivitas: {operatorName}
              </CardTitle>{" "}
              {/* Ukuran font */}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-xs text-gray-600 mb-2">
                  Aktivitas per hari (7 hari terakhir):
                </div>
                {Object.entries(stats.byDate)
                  // Urutkan berdasarkan tanggal terbaru (desc)
                  .sort(
                    ([dateA], [dateB]) =>
                      new Date(dateB).getTime() - new Date(dateA).getTime()
                  )
                  .slice(0, 7) // Ambil 7 teratas
                  .map(([date, count]) => (
                    <div
                      key={date}
                      className="flex justify-between items-center text-xs border-b pb-1"
                    >
                      {" "}
                      {/* Tambah border & padding */}
                      {/* Format tanggal */}
                      <span>
                        {new Date(date).toLocaleDateString("id-ID", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <Badge variant="secondary" className="px-1.5 py-0.5">
                        {count} req
                      </Badge>{" "}
                      {/* Badge lebih kecil */}
                    </div>
                  ))}
                {Object.keys(stats.byDate).length === 0 && (
                  <div className="text-xs text-gray-500 italic">
                    Belum ada aktivitas
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
  // --- AKHIR TAMPILAN UTAMA ---
}
