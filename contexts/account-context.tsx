"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useEffect,
  useCallback,
  useMemo, // Pastikan useCallback diimpor
} from "react";
import { useToast } from "@/hooks/use-toast";
// Hanya impor AccountType dari service (untuk string literal 'private'|'sharing'|'vip')
import type { AccountType } from "@/lib/database-service";
// Impor tipe-tipe Model dan Enum dari Prisma Client
import type {
  Account,
  GaransiAccount,
  ReportedAccount,
  CustomerAssignment,
  OperatorActivity,
  PlatformType as PrismaPlatformType, // Gunakan alias agar jelas
  WhatsappAccount, // <-- Tipe baru diimpor
} from "@prisma/client";

// Tipe Data Laporan (dengan detail Akun)
type ReportedAccountWithAccount = ReportedAccount & {
  account: Pick<Account, "id" | "email" | "type" | "platform"> | null;
  operatorName?: string | null;
};

// Tipe ini menggabungkan CustomerAssignment dengan relasi 'account' dan 'whatsappAccount'
type CustomerAssignmentWithAccount = CustomerAssignment & {
  account: Pick<Account, "id" | "platform" | "expiresAt" | "password"> | null;
  whatsappAccount: Pick<WhatsappAccount, "name" | "number"> | null; // <-- Relasi baru
};

// Tipe Data Statistik (sesuai API)
export interface CustomerStatisticsData {
  totalCustomers: number;
  totalAssignments: number;
  privateAccounts: number;
  sharingAccounts: number;
  vipAccounts: number;
}
export interface OperatorStats {
  total: number;
  private: number;
  sharing: number;
  vip: number;
  byDate: Record<string, number>;
}
export type OperatorStatisticsData = Record<string, OperatorStats>;

// Tipe Payload Assignment (di-export)
export type AddCustomerAssignmentPayload = {
  customerIdentifier: string;
  whatsappAccountId?: string; // <-- Sesuai skema baru
  accountId: string;
  accountEmail: string;
  accountType: AccountType;
  operatorName?: string;
};

// Tipe Payload Lain (gunakan tipe Prisma)
type AddAccountPayload = {
  email: string;
  password: string;
  type: AccountType;
  platform: PrismaPlatformType;
  expiresAt?: string;
};
export type UpdateAccountPayload = {
  email?: string;
  password?: string;
  expiresAt?: string;
  platform?: PrismaPlatformType;
};
type BulkAddAccountsPayload = {
  accounts: {
    email: string;
    password: string;
    type: AccountType;
    platform: PrismaPlatformType;
  }[];
  expiresAt: string;
};
// Payload untuk CRUD WA (baru)
export type WhatsappAccountPayload = {
  name: string;
  number: string;
};

// Interface/Tipe untuk Context Provider
interface AccountContextType {
  // States
  accounts: Account[];
  garansiAccounts: GaransiAccount[];
  reportedAccounts: ReportedAccountWithAccount[];
  customerAssignments: CustomerAssignmentWithAccount[];
  operatorActivities: OperatorActivity[];
  whatsappAccounts: WhatsappAccount[];
  isLoading: boolean;
  availableProfileCounts: { private: number; sharing: number; vip: number };
  customerStatistics: CustomerStatisticsData | null;
  operatorStatistics: OperatorStatisticsData | null;

  // Actions (Async - Panggil API)
  refreshData: () => Promise<void>;
  addAccount: (payload: AddAccountPayload) => Promise<Account | null>;
  addAccounts: (
    accounts: BulkAddAccountsPayload["accounts"],
    expiresAt: string
  ) => Promise<{ processedCount?: number } | null>;
  addGaransiAccounts: (
    accounts: {
      email: string;
      password: string;
      type: AccountType;
      platform: PrismaPlatformType;
    }[],
    expiresAt: string
  ) => Promise<void>;
  updateAccount: (
    id: string,
    payload: UpdateAccountPayload
  ) => Promise<Account | null>;
  deleteAccount: (id: string) => Promise<boolean>;
  searchAccountsByEmail: (emailQuery: string) => Promise<Account[]>;
  getGaransiAccountsByDate: (date: string) => Promise<GaransiAccount[]>;
  getGaransiAccountsByExpiresAt: (date: string) => Promise<GaransiAccount[]>;
  reportAccount: (
    email: string,
    reason: string,
    operatorUsername: string
  ) => Promise<boolean>;
  resolveReport: (reportId: string, newPassword?: string) => Promise<boolean>;
  addCustomerAssignment: (
    payload: AddCustomerAssignmentPayload
  ) => Promise<CustomerAssignment | null>;
  isCustomerIdentifierUsed: (identifier: string) => Promise<boolean>;
  getAvailableAccounts: (
    platform: PrismaPlatformType,
    type: AccountType
  ) => Promise<Account[]>;
  addWhatsappAccount: (
    payload: WhatsappAccountPayload
  ) => Promise<WhatsappAccount | null>;
  updateWhatsappAccount: (
    id: string,
    payload: Partial<WhatsappAccountPayload>
  ) => Promise<WhatsappAccount | null>;
  deleteWhatsappAccount: (id: string) => Promise<boolean>;

  // Getters (Sync - Baca State Client)
  getAccountsByType: (type: AccountType) => Account[];
  getAccountByEmail: (email: string) => Account | undefined;
  getAvailableProfileCount: (type: AccountType) => number;
  getReportedAccounts: () => ReportedAccountWithAccount[];
  getRemainingDays: (account: Account | GaransiAccount) => number;
  getCustomerStatistics: () => CustomerStatisticsData | null;
  getOperatorStatistics: () => OperatorStatisticsData | null;
}

// Buat Context
const AccountContext = createContext<AccountContextType | undefined>(undefined);

// Fungsi Helper Fetch (Sudah benar dengan token)
async function fetchFromAPI(endpoint: string, options?: RequestInit) {
  try {
    const token = localStorage.getItem("authToken");
    const headers = new Headers(options?.headers);
    if (options?.body) {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const fetchOptions: RequestInit = { ...options, headers: headers };
    const res = await fetch(endpoint, fetchOptions);

    if (res.status === 401 || res.status === 403) {
      console.error(
        `[Fetch] Unauthorized/Forbidden (401/403) on ${endpoint}. Logging out.`
      );
      localStorage.removeItem("currentUser");
      localStorage.removeItem("authToken");
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
      throw new Error("Sesi tidak valid atau telah kedaluwarsa.");
    }
    if (res.status === 204) {
      console.log(`[Fetch] Received 204 No Content from ${endpoint}`);
      return null;
    }
    if (!res.ok) {
      let errorBody: any = `Request failed with status ${res.status}`;
      try {
        errorBody = await res.json();
      } catch (e) {
        try {
          errorBody = await res.text();
        } catch (textErr) {
          /* ignore */
        }
      }
      const errorMessage =
        typeof errorBody === "object" && errorBody?.error
          ? errorBody.error
          : typeof errorBody === "string" && errorBody.length < 200
          ? errorBody
          : `Server error ${res.status} on ${endpoint}`;
      console.error(
        `[Fetch] API Error (${res.status} ${res.statusText}) on ${endpoint}:`,
        errorMessage,
        errorBody
      );
      throw new Error(errorMessage);
    }
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await res.json();
      console.log(`[Fetch] Success (JSON) from ${endpoint}`);
      return data;
    } else {
      console.warn(
        `[Fetch] Received non-JSON success response from ${endpoint}`
      );
      return null;
    }
  } catch (error) {
    console.error(
      `[Fetch] Network or processing error for ${endpoint}:`,
      error
    );
    throw error;
  }
}

// Provider Komponen
export function AccountProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // --- States ---
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [garansiAccounts, setGaransiAccounts] = useState<GaransiAccount[]>([]);
  const [reportedAccounts, setReportedAccounts] = useState<
    ReportedAccountWithAccount[]
  >([]);
  const [customerAssignments, setCustomerAssignments] = useState<
    CustomerAssignmentWithAccount[]
  >([]);
  const [operatorActivities, setOperatorActivities] = useState<
    OperatorActivity[]
  >([]);
  const [whatsappAccounts, setWhatsappAccounts] = useState<WhatsappAccount[]>(
    []
  );
  const [availableProfileCounts, setAvailableProfileCounts] = useState<{
    private: number;
    sharing: number;
    vip: number;
  }>({ private: 0, sharing: 0, vip: 0 });
  const [customerStatistics, setCustomerStatistics] =
    useState<CustomerStatisticsData | null>(null);
  const [operatorStatistics, setOperatorStatistics] =
    useState<OperatorStatisticsData | null>(null);

  // --- Fungsi Refresh Data ---
  const refreshData = useCallback(async () => {
    // setIsLoading(true); // Hindari set loading true di sini jika dipanggil dari action lain
    console.log("🔄 Refreshing all data...");
    try {
      const [
        aData,
        gData,
        rData,
        cData,
        oData,
        waData,
        pCount,
        sCount,
        vCount,
        custStats,
        opStats,
      ] = await Promise.all([
        fetchFromAPI("/api/accounts").catch((e) => {
          console.error("Failed accounts fetch:", e);
          return [];
        }),
        fetchFromAPI("/api/garansi-accounts").catch((e) => {
          console.error("Failed garansi fetch:", e);
          return [];
        }),
        fetchFromAPI("/api/reported-accounts").catch((e) => {
          console.error("Failed reported fetch:", e);
          return [];
        }),
        fetchFromAPI("/api/customer-assignments").catch((e) => {
          console.error("Failed assignments fetch:", e);
          return [];
        }),
        fetchFromAPI("/api/operator-activities").catch((e) => {
          console.error("Failed activities fetch:", e);
          return [];
        }),
        fetchFromAPI("/api/whatsapp-accounts").catch((e) => {
          console.error("Failed whatsapp accounts fetch:", e);
          return [];
        }),
        fetchFromAPI("/api/statistics/profiles/private").catch((e) => {
          console.error("Failed private count fetch:", e);
          return { count: 0 };
        }),
        fetchFromAPI("/api/statistics/profiles/sharing").catch((e) => {
          console.error("Failed sharing count fetch:", e);
          return { count: 0 };
        }),
        fetchFromAPI("/api/statistics/profiles/vip").catch((e) => {
          console.error("Failed vip count fetch:", e);
          return { count: 0 };
        }),
        fetchFromAPI("/api/statistics/customers").catch((e) => {
          console.error("Failed customer stats fetch:", e);
          return null;
        }),
        fetchFromAPI("/api/statistics/operators").catch((e) => {
          console.error("Failed operator stats fetch:", e);
          return null;
        }),
      ]);
      setAccounts(Array.isArray(aData) ? aData : []);
      setGaransiAccounts(Array.isArray(gData) ? gData : []);
      setReportedAccounts(Array.isArray(rData) ? rData : []);
      console.log("DEBUG: Isi cData dari API:", cData);
      setCustomerAssignments(Array.isArray(cData) ? cData : []);
      setOperatorActivities(Array.isArray(oData) ? oData : []);
      setWhatsappAccounts(Array.isArray(waData) ? waData : []);
      setAvailableProfileCounts({
        private: (pCount as { count: number })?.count ?? 0,
        sharing: (sCount as { count: number })?.count ?? 0,
        vip: (vCount as { count: number })?.count ?? 0,
      });
      setCustomerStatistics(custStats as CustomerStatisticsData | null);
      setOperatorStatistics(opStats as OperatorStatisticsData | null);
      console.log("✅ Data refreshed.");
    } catch (error) {
      console.error(
        "❌ Unexpected error during refreshData Promise.all:",
        error
      );
      toast({
        title: "⚠️ Error",
        description: "Terjadi kesalahan tidak terduga saat memuat data.",
        variant: "destructive",
      });
    } finally {
      // Hanya set isLoading false jika ini adalah panggilan refresh awal
      if (isLoading) setIsLoading(false);
      console.log("🏁 Refresh complete.");
    }
  }, [toast, isLoading]); // Tambahkan isLoading agar bisa cek panggilan awal

  // useEffects
  useEffect(() => {
    // Panggil refreshData saat komponen pertama kali mount
    if (isLoading) {
      // Panggil hanya jika isLoading masih true (awal)
      refreshData();
    }
  }, [refreshData, isLoading]); // Tambahkan isLoading di dependency

  useEffect(() => {
    // Interval refresh tetap jalan seperti biasa
    const i = setInterval(() => {
      if (!isLoading) refreshData();
    }, 300000); // 5 menit
    return () => clearInterval(i);
  }, [isLoading, refreshData]);

  // --- Implementasi Fungsi CRUD & Lainnya ---

  // Akun Utama
  const addAccount = useCallback(
    async (payload: AddAccountPayload): Promise<Account | null> => {
      try {
        const d = await fetchFromAPI("/api/accounts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        await refreshData();
        toast({
          title: "✅ Akun Ditambahkan",
          description: `${payload.email} berhasil.`,
        });
        return d as Account | null;
      } catch (e: any) {
        toast({
          title: "❌ Gagal Tambah",
          description: e.message || "Error.",
          variant: "destructive",
        });
        return null;
      }
    },
    [refreshData, toast]
  );

  const addAccounts = useCallback(
    async (
      accounts: BulkAddAccountsPayload["accounts"],
      expiresAt: string
    ): Promise<{ processedCount?: number } | null> => {
      try {
        const payload: BulkAddAccountsPayload = { accounts, expiresAt };
        const result = await fetchFromAPI("/api/accounts/bulk", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        await refreshData();
        // Tampilkan toast sukses untuk bulk import
        toast({
          title: "✅ Bulk Import Selesai",
          description: `${
            result?.processedCount ?? 0
          } akun baru berhasil ditambahkan.`,
        });
        return result as { processedCount?: number } | null;
      } catch (error: any) {
        toast({
          title: "❌ Gagal Bulk Import",
          description: error.message || "Error.",
          variant: "destructive",
        });
        throw error; // Tetap lempar error agar bisa ditangani di komponen jika perlu
      }
    },
    [refreshData, toast]
  );

  const updateAccount = useCallback(
    async (
      id: string,
      payload: UpdateAccountPayload
    ): Promise<Account | null> => {
      try {
        const d = await fetchFromAPI(`/api/accounts/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        await refreshData();
        toast({ title: "✅ Akun Diupdate" });
        return d as Account | null;
      } catch (e: any) {
        toast({
          title: "❌ Gagal Update",
          description: e.message || "Error.",
          variant: "destructive",
        });
        return null;
      }
    },
    [refreshData, toast]
  );

  const deleteAccount = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await fetchFromAPI(`/api/accounts/${id}`, { method: "DELETE" });
        await refreshData();
        toast({ title: "✅ Akun Dihapus" });
        return true;
      } catch (e: any) {
        toast({
          title: "❌ Gagal Hapus",
          description: e.message || "Error.",
          variant: "destructive",
        });
        return false;
      }
    },
    [refreshData, toast]
  );

  const searchAccountsByEmail = useCallback(
    async (emailQuery: string): Promise<Account[]> => {
      if (!emailQuery?.trim()) return [];
      try {
        const q = encodeURIComponent(emailQuery);
        const d = await fetchFromAPI(`/api/accounts/search?email=${q}`);
        return Array.isArray(d) ? d : [];
      } catch (e: any) {
        toast({
          title: "❌ Gagal Cari",
          description: e.message || "Error.",
          variant: "destructive",
        });
        return [];
      }
    },
    [toast]
  );

  // Akun Garansi
  const addGaransiAccounts = useCallback(
    async (
      newAccounts: {
        email: string;
        password: string;
        type: AccountType;
        platform: PrismaPlatformType;
      }[],
      expiresAt: string
    ) => {
      try {
        await fetchFromAPI("/api/garansi-accounts", {
          method: "POST",
          body: JSON.stringify({ accounts: newAccounts, expiresAt }),
        });
        await refreshData();
        toast({ title: "✅ Garansi Ditambahkan" });
      } catch (error: any) {
        toast({
          title: "❌ Gagal Tambah Garansi",
          description: error.message || "Error.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [refreshData, toast]
  );

  const getGaransiAccountsByDate = useCallback(
    async (date: string): Promise<GaransiAccount[]> => {
      try {
        const d = await fetchFromAPI(`/api/garansi-accounts?date=${date}`);
        return Array.isArray(d) ? d : [];
      } catch (e: any) {
        toast({
          title: "❌ Gagal Cari Garansi",
          description: e.message || "Error.",
          variant: "destructive",
        });
        return [];
      }
    },
    [toast]
  );

  const getGaransiAccountsByExpiresAt = useCallback(
    async (date: string): Promise<GaransiAccount[]> => {
      try {
        const d = await fetchFromAPI(`/api/garansi-accounts?expires=${date}`);
        return Array.isArray(d) ? d : [];
      } catch (e: any) {
        toast({
          title: "❌ Gagal Cari Garansi",
          description: e.message || "Error.",
          variant: "destructive",
        });
        return [];
      }
    },
    [toast]
  );

  // Report & Resolve
  const getAccountByEmail = useCallback(
    (email: string): Account | undefined => {
      if (!Array.isArray(accounts) || !email) return undefined;
      return accounts.find(
        (a) => a.email.toLowerCase() === email.toLowerCase()
      );
    },
    [accounts]
  );

  const reportAccount = useCallback(
    async (
      email: string,
      reason: string,
      operatorUsername: string
    ): Promise<boolean> => {
      try {
        const account = getAccountByEmail(email);
        if (!account) throw new Error("Akun tidak ditemukan.");
        await fetchFromAPI("/api/reported-accounts", {
          method: "POST",
          body: JSON.stringify({
            accountId: account.id,
            reason,
            operatorName: operatorUsername,
          }),
        });
        await refreshData();
        toast({ title: "✅ Akun Dilaporkan" });
        return true;
      } catch (e: any) {
        toast({
          title: "❌ Gagal Lapor",
          description: e.message || "Error.",
          variant: "destructive",
        });
        return false;
      }
    },
    [getAccountByEmail, refreshData, toast]
  );

  const resolveReport = useCallback(
    async (reportId: string, newPassword?: string): Promise<boolean> => {
      try {
        await fetchFromAPI(`/api/reported-accounts/${reportId}`, {
          method: "PATCH",
          body: JSON.stringify({ newPassword }),
        });
        await refreshData();
        toast({ title: "✅ Laporan Diselesaikan" });
        return true;
      } catch (e: any) {
        toast({
          title: "❌ Gagal Resolve",
          description: e.message || "Error.",
          variant: "destructive",
        });
        return false;
      }
    },
    [refreshData, toast]
  );

  // --- PERBAIKAN REFRESH ---
  // Assignment: Panggil refreshData setelah sukses
  const addCustomerAssignment = useCallback(
    async (
      payload: AddCustomerAssignmentPayload
    ): Promise<CustomerAssignment | null> => {
      try {
        const newAssignment = await fetchFromAPI("/api/customer-assignments", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        // --- Panggil refreshData di sini ---
        await refreshData();
        // --- AKHIR Panggil refreshData di sini ---

        toast({ title: "✅ Assignment Berhasil" });
        return newAssignment as CustomerAssignment | null;
      } catch (e: any) {
        toast({
          title: "❌ Gagal Assignment",
          description: e.message || "Error.",
          variant: "destructive",
        });
        return null;
      }
    },
    // --- Tambahkan refreshData di dependencies ---
    [toast, refreshData]
    // --- AKHIR Tambahkan refreshData di dependencies ---
  );
  // --- AKHIR PERBAIKAN REFRESH ---

  const isCustomerIdentifierUsed = useCallback(
    async (identifier: string): Promise<boolean> => {
      if (!identifier?.trim()) return false;
      try {
        const encoded = encodeURIComponent(identifier);
        const result = await fetchFromAPI(
          `/api/customer-assignments/check/${encoded}`
        );
        return (result as { used: boolean })?.used === true;
      } catch (e: any) {
        console.error("Gagal check customer:", e);
        return false;
      }
    },
    []
  );

  const getAvailableAccounts = useCallback(
    async (
      platform: PrismaPlatformType,
      type: AccountType
    ): Promise<Account[]> => {
      try {
        if (!platform || !type) return [];
        const available = await fetchFromAPI(
          `/api/accounts/available?platform=${platform}&type=${type}`
        );
        return Array.isArray(available) ? available : [];
      } catch (e: any) {
        toast({
          title: "❌ Gagal Ambil Akun",
          description: `Tidak dapat memuat akun ${platform} tipe ${type}. Coba refresh.`,
          variant: "destructive",
        });
        return [];
      }
    },
    [toast]
  );

  // --- Implementasi fungsi CRUD WA ---
  // --- WHATSAPP ACCOUNTS ---
  const addWhatsappAccount = useCallback(
    async (
      payload: WhatsappAccountPayload
    ): Promise<WhatsappAccount | null> => {
      try {
        const newWa = await fetchFromAPI("/api/whatsapp-accounts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        await refreshData(); // Refresh semua data agar state terupdate
        toast({
          title: "✅ Akun WA Ditambahkan",
          description: `${payload.name} berhasil.`,
        });
        return newWa as WhatsappAccount | null;
      } catch (e: any) {
        toast({
          title: "❌ Gagal Tambah Akun WA",
          description: e.message || "Error.",
          variant: "destructive",
        });
        return null;
      }
    },
    [refreshData, toast]
  );

  const updateWhatsappAccount = useCallback(
    async (
      id: string,
      payload: Partial<WhatsappAccountPayload>
    ): Promise<WhatsappAccount | null> => {
      try {
        const updatedWa = await fetchFromAPI(`/api/whatsapp-accounts/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        await refreshData(); // Refresh semua data
        toast({
          title: "✅ Akun WA Diupdate",
          description: `${payload.name || ""} berhasil diupdate.`,
        });
        return updatedWa as WhatsappAccount | null;
      } catch (e: any) {
        toast({
          title: "❌ Gagal Update Akun WA",
          description: e.message || "Error.",
          variant: "destructive",
        });
        return null;
      }
    },
    [refreshData, toast]
  );

  const deleteWhatsappAccount = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await fetchFromAPI(`/api/whatsapp-accounts/${id}`, {
          method: "DELETE",
        });
        await refreshData(); // Refresh semua data
        toast({ title: "✅ Akun WA Dihapus" });
        return true;
      } catch (e: any) {
        toast({
          title: "❌ Gagal Hapus Akun WA",
          description: e.message || "Error.",
          variant: "destructive",
        });
        return false;
      }
    },
    [refreshData, toast]
  );
  // --- AKHIR Implementasi fungsi CRUD WA ---

  // --- Getters ---
  const getCustomerStatistics = useCallback(
    (): CustomerStatisticsData | null => customerStatistics,
    [customerStatistics]
  );
  const getOperatorStatistics = useCallback(
    (): OperatorStatisticsData | null => operatorStatistics,
    [operatorStatistics]
  );
  const getRemainingDays = useCallback(
    (account: Account | GaransiAccount): number => {
      if (!account?.expiresAt) return 0;
      try {
        const now = new Date();
        const expires = new Date(account.expiresAt);
        if (isNaN(expires.getTime())) return 0;
        const diff = expires.getTime() - now.getTime();
        return Math.max(-999, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      } catch {
        return 0;
      }
    },
    []
  );
  const getAccountsByType = useCallback(
    (type: AccountType): Account[] => accounts.filter((a) => a.type === type),
    [accounts]
  );
  const getAvailableProfileCount = useCallback(
    (type: AccountType): number => availableProfileCounts[type] ?? 0,
    [availableProfileCounts]
  );
  const getReportedAccounts = useCallback(
    (): ReportedAccountWithAccount[] =>
      reportedAccounts.filter((r) => !r.resolved),
    [reportedAccounts]
  );

  // --- Provider Value ---
  const contextValue = useMemo(
    () => ({
      accounts,
      garansiAccounts,
      reportedAccounts,
      customerAssignments,
      operatorActivities,
      whatsappAccounts,
      isLoading,
      availableProfileCounts,
      customerStatistics,
      operatorStatistics,
      refreshData,
      addAccount,
      addAccounts,
      addGaransiAccounts,
      updateAccount,
      deleteAccount,
      searchAccountsByEmail,
      getGaransiAccountsByDate,
      getGaransiAccountsByExpiresAt,
      reportAccount,
      resolveReport,
      addCustomerAssignment,
      isCustomerIdentifierUsed,
      getAvailableAccounts,
      addWhatsappAccount,
      updateWhatsappAccount,
      deleteWhatsappAccount,
      getRemainingDays,
      getAccountsByType,
      getAccountByEmail,
      getAvailableProfileCount,
      getReportedAccounts,
      getCustomerStatistics,
      getOperatorStatistics,
    }),
    [
      accounts,
      garansiAccounts,
      reportedAccounts,
      customerAssignments,
      operatorActivities,
      whatsappAccounts,
      isLoading,
      availableProfileCounts,
      customerStatistics,
      operatorStatistics,
      refreshData,
      addAccount,
      addAccounts,
      addGaransiAccounts,
      updateAccount,
      deleteAccount,
      searchAccountsByEmail,
      getGaransiAccountsByDate,
      getGaransiAccountsByExpiresAt,
      reportAccount,
      resolveReport,
      addCustomerAssignment,
      isCustomerIdentifierUsed,
      getAvailableAccounts,
      addWhatsappAccount,
      updateWhatsappAccount,
      deleteWhatsappAccount,
      getRemainingDays,
      getAccountsByType,
      getAccountByEmail,
      getAvailableProfileCount,
      getReportedAccounts,
      getCustomerStatistics,
      getOperatorStatistics,
    ]
  );

  return (
    <AccountContext.Provider value={contextValue}>
      {children}
    </AccountContext.Provider>
  );
}

// Hook useAccounts
export function useAccounts(): AccountContextType {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error("useAccounts must be used within an AccountProvider");
  }
  return context;
}
