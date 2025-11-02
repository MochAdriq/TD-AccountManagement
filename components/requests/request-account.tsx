"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
// Impor hook DAN tipe payload assignment
import {
  useAccounts,
  type AddCustomerAssignmentPayload,
} from "@/contexts/account-context";
import {
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Loader2,
  UserCheck,
  List,
  MessageSquare, // <-- Impor ikon baru
} from "lucide-react"; // Tambah ikon
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import type {
  Account,
  AccountType as PrismaAccountType, // Tipe Akun dari Prisma (enum)
  PlatformType as PrismaPlatformType, // Tipe Platform dari Prisma (enum)
  CustomerAssignment, // Tipe hasil assignment
} from "@prisma/client";
// Impor constants untuk dropdown platform & display name
import { PLATFORM_LIST, PLATFORM_DISPLAY_NAMES } from "@/lib/constants";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Untuk pilih akun
import { Badge } from "@/components/ui/badge";

// Tipe Profile (untuk parsing JSON internal)
interface Profile {
  profile: string;
  pin: string;
  used: boolean;
}

// --- PERUBAHAN: Tipe lokal dirombak ---
// Tipe lokal untuk detail hasil assignment yang ditampilkan
interface AssignmentResultDetails extends Account {
  assignedProfileName: string; // Nama profil yg dipilih backend
  assignedProfilePin: string; // Pin profil yg dipilih backend
  assignedCustomerIdentifier: string;
  whatsappAccountName?: string; // Nama WA yg dipakai (cth: WA META)
  whatsappAccountNum?: string; // Nomor WA yg dipakai (cth: 0812...)
}
// --- AKHIR PERUBAHAN ---

// Helper parse Profiles (tidak berubah)
function parseProfiles(profilesData: unknown): Profile[] {
  if (!profilesData) return [];
  try {
    let parsed: unknown;
    if (typeof profilesData === "string") {
      if (profilesData.trim() === "") return [];
      parsed = JSON.parse(profilesData);
    } else {
      parsed = profilesData;
    }
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (p): p is Profile =>
          typeof p === "object" &&
          p !== null &&
          typeof p.profile === "string" &&
          typeof p.pin === "string" &&
          typeof p.used === "boolean"
      );
    } else {
      console.warn("Parsed profiles data is not an array:", parsed);
      return [];
    }
  } catch (e) {
    console.error("Error parsing profiles:", e, "Data:", profilesData);
    return [];
  }
}

// Helper hitung sisa profil (client-side)
function countAvailableProfiles(profilesData: unknown): number {
  const profiles = parseProfiles(profilesData);
  return profiles.filter((p) => !p.used).length;
}

export default function RequestAccount() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const {
    getAvailableAccounts, // Fungsi sudah diupdate di context
    isCustomerIdentifierUsed, // Cek customer
    addCustomerAssignment, // Assign akun (backend pilih profil)
    getRemainingDays, // Helper
    whatsappAccounts, // <-- PERUBAHAN: Ambil daftar WA
  } = useAccounts();

  // --- States ---
  const [accountType, setAccountType] = useState<PrismaAccountType | "">(""); // Tipe akun yg diassign
  const [selectedPlatform, setSelectedPlatform] = useState<
    PrismaPlatformType | ""
  >(""); // Platform yg dipilih
  const [customerIdentifier, setCustomerIdentifier] = useState("");
  // const [customerWhatsapp, setCustomerWhatsapp] = useState(""); // <-- DIHAPUS
  const [selectedWaId, setSelectedWaId] = useState<string>(""); // <-- PERUBAHAN: State baru
  const [availableAccounts, setAvailableAccounts] = useState<Account[]>([]); // Daftar akun dari API
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null
  ); // Hanya ID akun yg dipilih
  const [assignmentResult, setAssignmentResult] =
    useState<AssignmentResultDetails | null>(null); // Hasil assignment (termasuk profil random)

  // Loading states
  const [isFetchingAccounts, setIsFetchingAccounts] = useState(false); // Loading saat fetch akun
  const [isAssigning, setIsAssigning] = useState(false); // Loading saat proses assignment
  const [isCheckingCustomer, setIsCheckingCustomer] = useState(false); // Loading saat cek customer

  // Error/Status states
  const [stockDepleted, setStockDepleted] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  // --- Akhir States ---

  // Fungsi checkCustomer (tambah state loading)
  const checkCustomer = useCallback(async () => {
    if (!customerIdentifier.trim()) {
      setCustomerError(null);
      return;
    }
    setIsCheckingCustomer(true); // Mulai loading cek
    try {
      const used = await isCustomerIdentifierUsed(customerIdentifier.trim());
      if (used) {
        setCustomerError("Customer ini sudah pernah mendapatkan akun.");
      } else {
        setCustomerError(null);
      }
    } finally {
      setIsCheckingCustomer(false); // Selesai loading cek
    }
  }, [customerIdentifier, isCustomerIdentifierUsed]);
  // Debounce checkCustomer (tidak berubah)
  useEffect(() => {
    const handler = setTimeout(() => {
      checkCustomer();
    }, 500);
    return () => {
      clearTimeout(handler);
    };
  }, [customerIdentifier, checkCustomer]);

  // --- PERBAIKAN #5: Fetch Akun Tersedia ---
  // Di-update agar bergantung pada TIPE dan PLATFORM
  useEffect(() => {
    async function fetchAccounts() {
      // Guard clause: Membutuhkan KEDUA Tipe dan Platform
      if (!selectedPlatform || !accountType) {
        setAvailableAccounts([]); // Kosongkan daftar jika salah satu belum dipilih
        // Reset juga state terkait pilihan akun
        setSelectedAccountId(null);
        setStockDepleted(false);
        setAssignmentResult(null);
        return;
      }

      setIsFetchingAccounts(true);
      setStockDepleted(false);
      setSelectedAccountId(null);
      setAssignmentResult(null); // Reset pilihan & hasil

      try {
        // Panggil dengan KEDUA argumen
        console.log(
          `[RequestAccount] Fetching available accounts for Platform: ${selectedPlatform}, Type: ${accountType}`
        ); // <-- Log Tambahan
        const accounts = await getAvailableAccounts(
          selectedPlatform,
          accountType
        );
        console.log(
          `[RequestAccount] Received ${accounts.length} available accounts.`
        ); // <-- Log Tambahan
        setAvailableAccounts(accounts);
        if (accounts.length === 0) {
          setStockDepleted(true);
        }
      } finally {
        setIsFetchingAccounts(false);
      }
    }
    fetchAccounts();
  }, [selectedPlatform, accountType, getAvailableAccounts]); // <-- Tambahkan accountType di dependency array
  // --- AKHIR PERBAIKAN #5 ---

  // --- Handle Request (Logika tidak berubah, tapi pastikan console.log ada) ---
  const handleRequest = async () => {
    // 1. Validasi Input (tidak berubah)
    if (!accountType) {
      toast({
        title: "Error",
        description: "Pilih tipe akun",
        variant: "destructive",
      });
      return;
    }
    if (!selectedPlatform) {
      toast({
        title: "Error",
        description: "Pilih platform",
        variant: "destructive",
      });
      return;
    }
    if (!customerIdentifier.trim()) {
      toast({
        title: "Error",
        description: "Masukkan info customer",
        variant: "destructive",
      });
      return;
    }
    if (!selectedAccountId) {
      toast({
        title: "Error",
        description: "Pilih akun yang akan diberikan",
        variant: "destructive",
      });
      return;
    }
    await checkCustomer();
    if (customerError) {
      toast({
        title: "Error",
        description: customerError,
        variant: "destructive",
      });
      return;
    }
    // Validasi WA (opsional, bisa ditambahkan)
    if (!selectedWaId) {
      toast({
        title: "Error",
        description: "Pilih WA Operator yang digunakan",
        variant: "destructive",
      });
      return;
    }

    setIsAssigning(true);
    setAssignmentResult(null);

    try {
      // 2. Cari detail akun (tidak berubah)
      const selectedAccount = availableAccounts.find(
        (acc) => acc.id === selectedAccountId
      );
      if (!selectedAccount)
        throw new Error("Akun terpilih tidak ditemukan. Refresh data?");

      // 3. Siapkan payload (PERUBAHAN)
      const operatorUsername = currentUser?.username || "Unknown";
      const assignmentPayload: AddCustomerAssignmentPayload = {
        customerIdentifier: customerIdentifier.trim(),
        // customerWhatsapp: customerWhatsapp.trim() || undefined, // <-- DIHAPUS
        whatsappAccountId: selectedWaId || undefined, // <-- DIGANTI
        accountId: selectedAccount.id,
        accountEmail: selectedAccount.email,
        accountType: accountType,
        operatorName: operatorUsername,
      };

      // 4. Panggil API addCustomerAssignment via Context
      console.log(
        "[RequestAccount] Sending assignment payload:",
        assignmentPayload
      ); // <-- Log 1
      const newAssignmentResult: CustomerAssignment | null =
        await addCustomerAssignment(assignmentPayload);

      // --- LOG SETELAH API KEMBALI ---
      console.log(
        "[RequestAccount] Received assignment result from context/API:",
        newAssignmentResult
      ); // <-- Log 2: Cek hasil dari API

      // 5. Tangani Hasil dari Backend
      if (!newAssignmentResult || !newAssignmentResult.profileName) {
        console.error(
          "[RequestAccount] ERROR: Assignment result invalid or missing profileName",
          newAssignmentResult
        ); // <-- Log 3: Error jika hasil API aneh
        throw new Error(
          newAssignmentResult === null
            ? "Gagal menyimpan assignment."
            : "Assignment berhasil tapi detail profil tidak diterima dari server."
        );
      }

      console.log(
        "[RequestAccount] Assignment result seems valid. Profile Name:",
        newAssignmentResult.profileName
      ); // <-- Log 4: Pastikan profileName ada

      // Cari PIN profil yang dipilih backend
      const profiles = parseProfiles(selectedAccount.profiles);
      const assignedProfileData = profiles.find(
        (p) => p.profile === newAssignmentResult.profileName
      );

      // --- LOG SETELAH MENCARI PROFIL LOKAL ---
      console.log("[RequestAccount] Local profiles parsed:", profiles); // <-- Log 5: Lihat hasil parse profil
      console.log(
        "[RequestAccount] Found assigned profile data locally:",
        assignedProfileData
      ); // <-- Log 6: Cek apakah profil ditemukan

      if (!assignedProfileData) {
        console.error(
          // <-- Log 7 (Opsional, error handling sudah ada)
          "Assigned profile name from backend not found in local account data!",
          newAssignmentResult.profileName,
          profiles
        );
        throw new Error(
          "Profil yang diassign server tidak ditemukan di data lokal."
        );
      }

      // --- PERUBAHAN: Cari detail WA yang dipilih ---
      const selectedWaAccount = whatsappAccounts.find(
        (wa) => wa.id === selectedWaId
      );
      const waName = selectedWaAccount?.name || "N/A";
      const waNumber = selectedWaAccount?.number || "N/A";
      // --- AKHIR PERUBAHAN ---

      // 6. Sukses! Siapkan detail lengkap untuk ditampilkan (PERUBAHAN)
      const details: AssignmentResultDetails = {
        ...selectedAccount,
        assignedProfileName: newAssignmentResult.profileName,
        assignedProfilePin: assignedProfileData.pin,
        assignedCustomerIdentifier: customerIdentifier.trim(),
        // customerWhatsapp: customerWhatsapp.trim() || undefined, // <-- DIHAPUS
        whatsappAccountName: waName, // <-- DIGANTI
        whatsappAccountNum: waNumber, // <-- DIGANTI
      };

      // --- LOG SEBELUM SET STATE ---
      console.log(
        "[RequestAccount] Preparing to set assignmentResult state:",
        details
      ); // <-- Log 8: Cek data sebelum di-set

      setAssignmentResult(details); // <-- STATE DIISI DI SINI!

      // --- LOG SETELAH SET STATE ---
      console.log("[RequestAccount] assignmentResult state has been set."); // <-- Log 9: Konfirmasi state sudah di-set

      toast({
        title: "✅ Sukses",
        description: `Akun ${selectedAccount.email} (Profil ${details.assignedProfileName}) berhasil ditugaskan!`,
      });

      setSelectedAccountId(null); // Reset pilihan akun
      // Reset pilihan WA dan Customer
      setSelectedWaId("");
      setCustomerIdentifier("");
    } catch (error: any) {
      console.error("[RequestAccount] Error caught in handleRequest:", error); // <-- Log 10: Tangkap error apa pun
      toast({
        title: "Error Saat Assign",
        description: error.message || "Gagal.",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false); // Selesai loading assignment
    }
  };
  // --- Akhir Handle Request ---

  // Format Expiration Date (tidak berubah)
  const formatExpirationDate = (dateSource: string | Date | null): string => {
    if (!dateSource) return "N/A";
    try {
      const date = new Date(dateSource);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "Date Error";
    }
  };

  // Get platform display name helper (tidak berubah)
  const getPlatformDisplayName = (
    platformKey: PrismaPlatformType | null | undefined
  ): string => {
    if (!platformKey) return "Platform";
    const key = platformKey as keyof typeof PLATFORM_DISPLAY_NAMES;
    return PLATFORM_DISPLAY_NAMES[key] || platformKey;
  };

  // --- PERUBAHAN: Copy function diupdate ---
  const copyDetailsToClipboard = () => {
    if (!assignmentResult) return;
    const platformName = getPlatformDisplayName(assignmentResult.platform);
    const accountTypeFormatted =
      assignmentResult.type.charAt(0).toUpperCase() +
      assignmentResult.type.slice(1);
    const daysLeft = getRemainingDays(assignmentResult);

    const textToCopy = `!!! ${platformName.toUpperCase()} - TRUSTDIGITAL.ID !!!\n\n1. Login hanya di 1 DEVICE !!\n2. Garansi akun 23 Hari\n3. Ketika ada kendala akun :\n - Hapus chache app\n - (DIBACA) GUNAKAN DATA SELULER/HOTSPOT SAAT LOGIN SAJA\n - Install Ulang App\n4. Dilarang mengubah Nama profile, Pin, membuka pengaturan akun !!\n\n💌 Email: ${
      assignmentResult.email
    }\n🔑 Password: ${assignmentResult.password}\n👤 Profil: ${
      assignmentResult.assignedProfileName
    }\nPIN: ${
      assignmentResult.assignedProfilePin
    }\nTipe: ${accountTypeFormatted}\n📱 Customer: ${
      assignmentResult.assignedCustomerIdentifier
    }${
      // --- PERUBAHAN ---
      assignmentResult.whatsappAccountName &&
      assignmentResult.whatsappAccountName !== "N/A"
        ? `\n📞 WA Operator: ${assignmentResult.whatsappAccountName} (${assignmentResult.whatsappAccountNum})`
        : ""
      // --- AKHIR PERUBAHAN ---
    }\n👨‍💼 Operator: ${
      currentUser?.username || "Unknown"
    }\n⏱️ Berlaku sampai: ${formatExpirationDate(
      assignmentResult.expiresAt
    )} (${daysLeft} hari lagi)\n\nMelanggar? Akun ditarik + denda Rp300K\nTerima kasih telah memesan di TrustDigital.ID\nContact: @TRUSTDIGITAL001 | IG: @trustdigital.indonesia\nWebsite: https://trustdigital.id\n\nKRITIK DAN SARAN:\nhttps://docs.google.com/forms/d/e/1FAIpQLScSpnLbo4ouMf2hH1rYgJi-xIdV6s8i2euLBTY9Fg1tzVrWyw/viewform?usp=header`;

    navigator.clipboard.writeText(textToCopy);
    toast({
      title: "📋 Copied",
      description: `Detail akun ${platformName} disalin!`,
    });
  };
  // --- AKHIR PERUBAHAN ---

  // --- JSX (tidak berubah) ---
  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="bg-blue-600 text-white rounded-t-lg">
        <CardTitle>
          {" "}
          Request Account - TrustDigital.ID{" "}
          {currentUser && (
            <div className="text-sm font-normal mt-1 opacity-90">
              Operator: {currentUser.name || currentUser.username}
            </div>
          )}{" "}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Kolom Kiri: Form Request */}
          <div className="space-y-4">
            {/* 1. Tipe Akun */}
            <div className="space-y-2">
              <Label htmlFor="account-type" className="font-semibold">
                Pilih Tipe Akun
              </Label>
              <Select
                value={accountType}
                onValueChange={(value) =>
                  setAccountType(value as PrismaAccountType)
                }
                disabled={isAssigning || isFetchingAccounts}
              >
                <SelectTrigger id="account-type" className="h-11">
                  <SelectValue placeholder="Pilih tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="sharing">Sharing</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 2. Platform */}
            <div className="space-y-2">
              <Label htmlFor="platform-select" className="font-semibold">
                Pilih Platform
              </Label>
              <Select
                value={selectedPlatform}
                onValueChange={(value) =>
                  setSelectedPlatform(value as PrismaPlatformType)
                }
                disabled={isAssigning || isFetchingAccounts || !accountType}
              >
                <SelectTrigger id="platform-select" className="h-11">
                  <SelectValue placeholder="Pilih platform..." />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_LIST.map((p) => (
                    <SelectItem key={p.key} value={p.key}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Customer Info */}
            <div className="space-y-2">
              <Label htmlFor="customer-identifier" className="font-semibold">
                Info Customer (Nama / No.Hp)
              </Label>
              <div className="relative">
                <Input
                  id="customer-identifier"
                  type="text"
                  value={customerIdentifier}
                  onChange={(e) => setCustomerIdentifier(e.target.value)}
                  placeholder="Nama Customer/No.Hp"
                  className={`h-11 pr-10 ${
                    customerError
                      ? "border-red-500 focus-visible:ring-red-500"
                      : "border-gray-300 focus-visible:ring-blue-500"
                  }`}
                  required
                  disabled={isAssigning || isFetchingAccounts}
                />
                {isCheckingCustomer ? (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                ) : customerError ? (
                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                ) : customerIdentifier.trim() && !customerError ? (
                  <UserCheck className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                ) : null}
              </div>
              {customerError && (
                <p className="text-sm text-red-600 mt-1">{customerError}</p>
              )}
            </div>

            {/* --- PERUBAHAN: Input Teks diganti Dropdown --- */}
            <div className="space-y-2">
              <Label htmlFor="wa-select" className="font-semibold">
                Pilih WA Operator
              </Label>
              <Select
                value={selectedWaId}
                onValueChange={(value) => setSelectedWaId(value)}
                disabled={isAssigning || isFetchingAccounts}
              >
                <SelectTrigger id="wa-select" className="h-11">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-500" />
                    <SelectValue placeholder="Pilih WA yang dipakai..." />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {whatsappAccounts.length === 0 && (
                    <SelectItem value="loading" disabled>
                      Memuat data WA...
                    </SelectItem>
                  )}
                  {whatsappAccounts.map((wa) => (
                    <SelectItem key={wa.id} value={wa.id}>
                      {wa.name} ({wa.number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* --- AKHIR PERUBAHAN --- */}

            {/* 4. Pilih AKUN (BUKAN PROFIL) */}
            {selectedPlatform && accountType && (
              <div className="space-y-3 border rounded-md p-4 bg-gray-50">
                <Label className="font-semibold block mb-2">
                  Pilih Akun Tersedia
                </Label>
                {isFetchingAccounts ? (
                  <div className="flex items-center justify-center h-20 text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Mencari
                    akun...
                  </div>
                ) : stockDepleted ? (
                  <Alert variant="destructive" className="bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Stok Habis</AlertTitle>
                    <AlertDescription>
                      Tidak ada akun {getPlatformDisplayName(selectedPlatform)}{" "}
                      tipe {accountType || "?"} yang tersedia.
                    </AlertDescription>
                  </Alert>
                ) : availableAccounts.length === 0 ? (
                  <p className="text-sm text-center text-gray-500 py-4">
                    Tidak ada akun ditemukan.
                  </p>
                ) : (
                  <ScrollArea className="h-48 border rounded-md bg-white">
                    <RadioGroup
                      value={selectedAccountId ?? undefined}
                      onValueChange={(value) => setSelectedAccountId(value)}
                      className="p-2 space-y-1"
                    >
                      {availableAccounts.map((account) => {
                        const availableCount = countAvailableProfiles(
                          account.profiles
                        );
                        if (availableCount === 0) return null;
                        return (
                          <Label
                            key={account.id}
                            htmlFor={`acc-${account.id}`}
                            className={`flex items-center justify-between border rounded-md p-2 text-sm cursor-pointer hover:bg-blue-50 ${
                              selectedAccountId === account.id
                                ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                                : "border-gray-200"
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value={account.id}
                                id={`acc-${account.id}`}
                                className="h-4 w-4"
                              />
                              <span className="font-mono">{account.email}</span>
                            </div>
                            <Badge
                              variant={
                                availableCount <= 2
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {availableCount} slot
                            </Badge>
                          </Label>
                        );
                      })}
                    </RadioGroup>
                  </ScrollArea>
                )}
              </div>
            )}

            {/* Tombol Assign */}
            <Button
              onClick={handleRequest}
              className="w-full bg-green-600 hover:bg-green-700 h-11 text-base mt-6"
              disabled={
                isAssigning ||
                isFetchingAccounts ||
                !accountType ||
                !selectedPlatform ||
                !customerIdentifier ||
                !!customerError ||
                !selectedWaId || // <-- PERUBAHAN: Validasi WA ID
                !selectedAccountId ||
                stockDepleted
              }
            >
              {isAssigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                  Processing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" /> Assign Akun Terpilih
                </>
              )}
            </Button>
          </div>

          {/* Kolom Kanan: Hasil Assignment */}
          <div className="border-l pl-6 sticky top-6 self-start">
            {assignmentResult ? (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-center text-green-700">
                  ✅ Berhasil Ditugaskan!
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md font-mono text-xs whitespace-pre-wrap border border-gray-200 dark:border-gray-700 max-h-1000 overflow-y-auto">
                  {/* Template Teks Hasil Assignment */}
                  {`!!! ${getPlatformDisplayName(
                    assignmentResult.platform
                  ).toUpperCase()} - TRUSTDIGITAL.ID !!!\n\n1. Login hanya di 1 DEVICE !!\n2. Garansi akun 23 Hari\n3. Ketika ada kendala akun :\n - Hapus chache app\n - (DIBACA) GUNAKAN DATA SELULER/HOTSPOT SAAT LOGIN SAJA\n - Install Ulang App\n4. Dilarang mengubah Nama profile, Pin, membuka pengaturan akun !!\n\n💌 Email: ${
                    assignmentResult.email
                  }\n🔑 Password: ${assignmentResult.password}\n👤 Profil: ${
                    assignmentResult.assignedProfileName
                  }\nPIN: ${assignmentResult.assignedProfilePin}\nTipe: ${
                    assignmentResult.type.charAt(0).toUpperCase() +
                    assignmentResult.type.slice(1)
                  }\n📱 Customer: ${
                    assignmentResult.assignedCustomerIdentifier
                  }${
                    // --- PERUBAHAN: Template Teks dirombak ---
                    assignmentResult.whatsappAccountName &&
                    assignmentResult.whatsappAccountName !== "N/A"
                      ? `\n📞 WA Operator: ${assignmentResult.whatsappAccountName}` // Nomor WA telah dihapus dari sini
                      : ""
                    // --- AKHIR PERUBAHAN ---
                  }\n👨‍💼 Operator: ${
                    currentUser?.username || "Unknown"
                  }\n⏱️ Berlaku sampai: ${formatExpirationDate(
                    assignmentResult.expiresAt
                  )} (${getRemainingDays(
                    assignmentResult
                  )} hari lagi)\n\nMelanggar? Akun ditarik + denda Rp300K\nTerima kasih telah memesan di TrustDigital.ID\nContact: @TRUSTDIGITAL001 | IG: @trustdigital.indonesia\nWebsite: https://trustdigital.id\n\nKRITIK DAN SARAN:\nhttps://docs.google.com/forms/d/e/1FAIpQLScSpnLbo4ouMf2hH1rYgJi-xIdV6s8i2euLBTY9Fg1tzVrWyw/viewform?usp=header`}
                </div>
                <Button
                  onClick={copyDetailsToClipboard}
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-11 text-base"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Detail
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full border rounded-lg bg-gray-50 p-6 sticky top-6">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <List className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                  <p className="font-medium text-base">
                    Detail Akun Hasil Assignment
                  </p>
                  <p className="text-sm mt-2">
                    Pilih Tipe, Platform, isi Info Customer, lalu pilih Akun
                    yang tersedia.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
