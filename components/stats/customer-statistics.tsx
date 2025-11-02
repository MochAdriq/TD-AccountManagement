"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccounts } from "@/contexts/account-context"; // Import context
import {
  BarChart,
  PieChart,
  Users,
  Calendar,
  Download,
  AlertTriangle,
} from "lucide-react"; // Tambah AlertTriangle
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo } from "react"; // Tambah useMemo
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OperatorStatistics from "@/components/stats/operator-statistics";
import { useAuth } from "@/lib/auth"; // Import useAuth

export default function CustomerStatistics() {
  // --- AMBIL DATA DARI CONTEXT ---
  const {
    customerAssignments, // Tetap dipakai untuk tabel history
    getCustomerStatistics, // Getter baru untuk data agregat
    isLoading: isContextLoading, // Ambil status loading
  } = useAccounts();
  const { user: currentUser } = useAuth(); // Ambil user
  const { toast } = useToast();
  // --- AKHIR AMBIL DATA ---

  // State filter (tidak berubah)
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // --- AMBIL DATA STATISTIK AGREGAT ---
  // Data ini sudah di-fetch oleh refreshData di context
  const aggregateStats = getCustomerStatistics();
  // --- AKHIR AMBIL DATA STATISTIK ---

  // --- Filter customer history (LOGIKA LAMA TETAP DIPAKAI UNTUK TABEL) ---
  const filteredCustomers = useMemo(() => {
    const customerMap = new Map<string, typeof customerAssignments>();
    (customerAssignments || []).forEach((assignment) => {
      // Handle jika assignments null/undefined
      if (!customerMap.has(assignment.customerIdentifier)) {
        customerMap.set(assignment.customerIdentifier, []);
      }
      customerMap.get(assignment.customerIdentifier)?.push(assignment);
    });

    return Array.from(customerMap.entries())
      .filter(
        ([customer]) =>
          customer?.toLowerCase().includes(searchTerm.toLowerCase()) // Handle customer null/undefined
      )
      .map(([customer, assignments]) => {
        let filteredAssignments = [...assignments];
        if (dateRange?.from) {
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          filteredAssignments = filteredAssignments.filter(
            (a) => new Date(a.assignedAt) >= fromDate
          );
        }
        if (dateRange?.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          filteredAssignments = filteredAssignments.filter(
            (a) => new Date(a.assignedAt) <= toDate
          );
        }
        return [customer, filteredAssignments] as [
          string,
          typeof customerAssignments
        ];
      })
      .filter(([, assignments]) => assignments.length > 0)
      .sort(([, assignmentsA], [, assignmentsB]) => {
        const latestA = new Date(
          Math.max(...assignmentsA.map((a) => new Date(a.assignedAt).getTime()))
        );
        const latestB = new Date(
          Math.max(...assignmentsB.map((a) => new Date(a.assignedAt).getTime()))
        );
        return latestB.getTime() - latestA.getTime();
      });
  }, [customerAssignments, searchTerm, dateRange]); // Dependencies tetap sama
  // --- AKHIR FILTER HISTORY ---

  // --- PERUBAHAN: Fungsi Ekspor CSV Diperbarui ---
  const exportToExcel = () => {
    const data = filteredCustomers.flatMap(([customer, assignments]) =>
      assignments.map((assignment) => ({
        Customer: customer,
        Email: assignment.accountEmail,
        Password: assignment.account?.password || "N/A",
        Platform: assignment.account?.platform || "N/A",
        Type: assignment.accountType,
        Profile: assignment.profileName,
        "Nama WA": assignment.whatsappAccount?.name || "N/A", // <-- Kolom Baru
        "No WA": assignment.whatsappAccount?.number || "N/A", // <-- Kolom Baru
        Operator: assignment.operatorName || "Unknown",
        Date: new Date(assignment.assignedAt).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "numeric",
          year: "numeric",
        }),
      }))
    );

    // --- PERUBAHAN: Headers diupdate ---
    const headers = [
      "Customer",
      "Email",
      "Password",
      "Platform",
      "Type",
      "Profile",
      "Nama WA", // <-- Header Baru
      "No WA", // <-- Header Baru
      "Operator",
      "Date",
    ];
    // --- AKHIR PERUBAHAN ---

    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            // Mengambil nilai sel, handle jika key tidak ada di row
            const cellValue = row[header as keyof typeof row] ?? "";
            const cell = String(cellValue).replace(/"/g, '""');
            return `"${cell}"`;
          })
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    let filename = "customer-data";
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
    URL.revokeObjectURL(url);
    toast({
      title: "Export Successful",
      description: "Customer data has been exported to CSV",
    });
  };
  // --- AKHIR PERUBAHAN ---

  const clearFilters = () => {
    setSearchTerm("");
    setDateRange(undefined);
  };

  const isAdmin = currentUser?.role === "admin";

  return (
    <Tabs defaultValue="customers" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="customers">Customer Statistics</TabsTrigger>
        {isAdmin && (
          <TabsTrigger value="operators">Operator Statistics</TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="customers">
        <div className="space-y-6">
          {/* --- BAGIAN STATS CARDS DIPERBARUI --- */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Tampilkan loading atau data */}
            {isContextLoading ? (
              // Tampilan loading sederhana untuk cards
              <>
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
                <Card className="animate-pulse">
                  <CardHeader className="pb-2">
                    <CardTitle className="h-4 bg-gray-200 rounded w-3/4"></CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              </>
            ) : aggregateStats ? (
              // Tampilkan data jika ada
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">
                      Total Customers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-gray-500 mr-2" />
                      <div className="text-2xl font-bold">
                        {aggregateStats.totalCustomers}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">
                      Total Assignments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-gray-500 mr-2" />
                      <div className="text-2xl font-bold">
                        {aggregateStats.totalAssignments}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">
                      Private Accounts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <BarChart className="h-5 w-5 text-gray-500 mr-2" />
                      <div className="text-2xl font-bold">
                        {aggregateStats.privateAccounts}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">
                      Sharing Accounts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <PieChart className="h-5 w-5 text-gray-500 mr-2" />
                      <div className="text-2xl font-bold">
                        {aggregateStats.sharingAccounts}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* Tambahkan Card VIP jika ada datanya */}
                {/* <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">VIP Accounts</CardTitle></CardHeader><CardContent><div className="flex items-center">...<div className="text-2xl font-bold">{aggregateStats.vipAccounts}</div></div></CardContent></Card> */}
              </>
            ) : (
              // Tampilan jika data stats tidak ada (error fetch)
              <Card className="md:col-span-4">
                <CardContent className="p-6 text-center text-red-600">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                  Gagal memuat data statistik customer. Coba refresh halaman.
                </CardContent>
              </Card>
            )}
          </div>
          {/* --- AKHIR BAGIAN STATS CARDS --- */}

          {/* --- BAGIAN TABEL HISTORY (TIDAK BERUBAH BANYAK) --- */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Assignment History</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filter controls (tidak berubah) */}
              <div className="flex flex-col md:flex-row gap-4 mb-4 items-start">
                <div className="w-full md:w-auto flex-1">
                  {" "}
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />{" "}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {" "}
                  {/* Tambah flex-wrap */}
                  <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    placeholder="Filter by date"
                  />
                  {(searchTerm || dateRange) && (
                    <Button variant="outline" onClick={clearFilters} size="sm">
                      Clear Filters
                    </Button>
                  )}
                  <Button
                    onClick={exportToExcel}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {" "}
                    <Download className="h-4 w-4 mr-2" /> Export CSV{" "}
                  </Button>
                </div>
              </div>

              {/* Tabel History (gunakan filteredCustomers) */}
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Accounts</TableHead>
                      <TableHead>Operator</TableHead>
                      <TableHead>Last Assignment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isContextLoading ? ( // Tampilkan loading di tabel juga
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <div className="animate-pulse">Memuat history...</div>
                        </TableCell>
                      </TableRow>
                    ) : filteredCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-8 text-gray-500"
                        >
                          No customer data found matching filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCustomers.map(([customer, assignments]) => {
                        const sortedAssignments = [...assignments].sort(
                          (a, b) =>
                            new Date(b.assignedAt).getTime() -
                            new Date(a.assignedAt).getTime()
                        );
                        const latestAssignment = sortedAssignments[0];
                        const assignmentDate = new Date(
                          latestAssignment.assignedAt
                        );
                        return (
                          <TableRow
                            key={customer}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                          >
                            <TableCell className="font-medium">
                              {customer}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 max-w-xs">
                                {" "}
                                {/* Batasi lebar */}
                                {sortedAssignments.map((assignment, index) => (
                                  <div
                                    key={index}
                                    className="flex items-center text-xs flex-wrap"
                                  >
                                    {" "}
                                    {/* Ukuran font & wrap */}
                                    <Badge
                                      className={`${
                                        assignment.accountType === "private"
                                          ? "bg-blue-500"
                                          : assignment.accountType === "sharing"
                                          ? "bg-purple-500"
                                          : "bg-yellow-500"
                                      } mr-1 mb-1 px-1.5 py-0.5`}
                                    >
                                      {" "}
                                      {assignment.accountType}{" "}
                                    </Badge>{" "}
                                    {/* Warna VIP & padding */}
                                    <span className="font-mono mr-1 mb-1 break-all">
                                      {assignment.accountEmail}
                                    </span>{" "}
                                    {/* Break email */}
                                    <span className="text-gray-500 whitespace-nowrap mb-1">
                                      (
                                      {new Date(
                                        assignment.assignedAt
                                      ).toLocaleDateString("id-ID", {
                                        day: "numeric",
                                        month: "short",
                                      })}
                                      )
                                    </span>{" "}
                                    {/* Format tanggal */}
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {latestAssignment.operatorName || "Unknown"}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {assignmentDate.toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          {/* --- AKHIR BAGIAN TABEL HISTORY --- */}
        </div>
      </TabsContent>

      {/* Tab Operator Statistics (tidak berubah) */}
      {isAdmin && (
        <TabsContent value="operators">
          <OperatorStatistics />
        </TabsContent>
      )}
    </Tabs>
  );
}
