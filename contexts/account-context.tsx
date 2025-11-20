"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useToast } from "@/hooks/use-toast";
import type { AccountType } from "@/lib/database-service";
import type {
  Account,
  GaransiAccount,
  ReportedAccount,
  CustomerAssignment,
  OperatorActivity,
  PlatformType as PrismaPlatformType,
  WhatsappAccount,
} from "@prisma/client";

// Tipe Data Laporan
type ReportedAccountWithAccount = ReportedAccount & {
  account: Pick<
    Account,
    "id" | "email" | "type" | "platform" | "password"
  > | null;
  operatorName?: string | null;
};

// Tipe Assignment
type CustomerAssignmentWithAccount = CustomerAssignment & {
  account: Pick<Account, "id" | "platform" | "expiresAt" | "password"> | null;
  whatsappAccount: Pick<WhatsappAccount, "name" | "number"> | null;
};

// Tipe Statistik
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

// Payload
export type AddCustomerAssignmentPayload = {
  customerIdentifier: string;
  whatsappAccountId?: string;
  accountId: string;
  accountEmail: string;
  accountType: AccountType;
  operatorName?: string;
};

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

// --- UPDATE DI SINI: Tambahkan customProfileCount ke Payload ---
type BulkAddAccountsPayload = {
  accounts: {
    email: string;
    password: string;
    type: AccountType;
    platform: PrismaPlatformType;
  }[];
  expiresAt: string;
  customProfileCount?: number; // <--- Parameter Baru
};

export type WhatsappAccountPayload = {
  name: string;
  number: string;
};

// Interface Context
interface AccountContextType {
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

  refreshData: () => Promise<void>;
  addAccount: (payload: AddAccountPayload) => Promise<Account | null>;

  // --- UPDATE DI SINI: Tambahkan parameter ke-3 di interface ---
  addAccounts: (
    accounts: BulkAddAccountsPayload["accounts"],
    expiresAt: string,
    customProfileCount?: number // <--- Parameter Baru
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
  resolveReport: (
    reportId: string,
    newPassword?: string,
    note?: string
  ) => Promise<boolean>;
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

  getAccountsByType: (type: AccountType) => Account[];
  getAccountByEmail: (email: string) => Account | undefined;
  getAvailableProfileCount: (type: AccountType) => number;
  getReportedAccounts: () => ReportedAccountWithAccount[];
  getRemainingDays: (account: Account | GaransiAccount) => number;
  getCustomerStatistics: () => CustomerStatisticsData | null;
  getOperatorStatistics: () => OperatorStatisticsData | null;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

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
      localStorage.removeItem("currentUser");
      localStorage.removeItem("authToken");
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
      throw new Error("Sesi tidak valid.");
    }
    if (res.status === 204) return null;

    if (!res.ok) {
      let errorBody: any = `Request failed with status ${res.status}`;
      try {
        errorBody = await res.json();
      } catch (e) {
        /* ignore */
      }
      const errorMessage =
        typeof errorBody === "object" && errorBody?.error
          ? errorBody.error
          : `Server error ${res.status}`;
      throw new Error(errorMessage);
    }

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await res.json();
    }
    return null;
  } catch (error) {
    console.error(`API Error ${endpoint}:`, error);
    throw error;
  }
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
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
  const [availableProfileCounts, setAvailableProfileCounts] = useState({
    private: 0,
    sharing: 0,
    vip: 0,
  });
  const [customerStatistics, setCustomerStatistics] =
    useState<CustomerStatisticsData | null>(null);
  const [operatorStatistics, setOperatorStatistics] =
    useState<OperatorStatisticsData | null>(null);

  const refreshData = useCallback(async () => {
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
        fetchFromAPI("/api/accounts").catch(() => []),
        fetchFromAPI("/api/garansi-accounts").catch(() => []),
        fetchFromAPI("/api/reported-accounts").catch(() => []),
        fetchFromAPI("/api/customer-assignments").catch(() => []),
        fetchFromAPI("/api/operator-activities").catch(() => []),
        fetchFromAPI("/api/whatsapp-accounts").catch(() => []),
        fetchFromAPI("/api/statistics/profiles/private").catch(() => ({
          count: 0,
        })),
        fetchFromAPI("/api/statistics/profiles/sharing").catch(() => ({
          count: 0,
        })),
        fetchFromAPI("/api/statistics/profiles/vip").catch(() => ({
          count: 0,
        })),
        fetchFromAPI("/api/statistics/customers").catch(() => null),
        fetchFromAPI("/api/statistics/operators").catch(() => null),
      ]);

      setAccounts(Array.isArray(aData) ? aData : []);
      setGaransiAccounts(Array.isArray(gData) ? gData : []);
      setReportedAccounts(Array.isArray(rData) ? rData : []);
      setCustomerAssignments(Array.isArray(cData) ? cData : []);
      setOperatorActivities(Array.isArray(oData) ? oData : []);
      setWhatsappAccounts(Array.isArray(waData) ? waData : []);
      setAvailableProfileCounts({
        private: (pCount as any)?.count ?? 0,
        sharing: (sCount as any)?.count ?? 0,
        vip: (vCount as any)?.count ?? 0,
      });
      setCustomerStatistics(custStats as any);
      setOperatorStatistics(opStats as any);
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      if (isLoading) setIsLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) refreshData();
  }, [refreshData, isLoading]);

  useEffect(() => {
    const i = setInterval(() => {
      if (!isLoading) refreshData();
    }, 300000);
    return () => clearInterval(i);
  }, [isLoading, refreshData]);

  // --- ACTIONS ---

  const addAccount = useCallback(
    async (payload: AddAccountPayload) => {
      try {
        const d = await fetchFromAPI("/api/accounts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        await refreshData();
        toast({ title: "✅ Berhasil", description: "Akun ditambahkan." });
        return d as Account;
      } catch (e: any) {
        toast({
          title: "❌ Gagal Tambah",
          description: e.message,
          variant: "destructive",
        });
        return null;
      }
    },
    [refreshData, toast]
  );

  // --- UPDATE DI SINI: Implementasi addAccounts menerima parameter ke-3 ---
  const addAccounts = useCallback(
    async (
      accounts: BulkAddAccountsPayload["accounts"],
      expiresAt: string,
      customProfileCount?: number // <--- Parameter Baru
    ) => {
      try {
        const payload: BulkAddAccountsPayload = {
          accounts,
          expiresAt,
          customProfileCount,
        };
        const res = await fetchFromAPI("/api/accounts/bulk", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        await refreshData();

        // Toast Detail Statistik
        const { processedCount, duplicateCount } = res as {
          processedCount: number;
          duplicateCount: number;
        };

        if (processedCount > 0) {
          toast({
            title: "✅ Import Selesai",
            description: `Sukses: ${processedCount} akun. ${
              duplicateCount > 0 ? `(Dilewati: ${duplicateCount} duplikat)` : ""
            }`,
          });
        } else if (duplicateCount > 0) {
          toast({
            title: "⚠️ Tidak ada akun baru",
            description: `Semua ${duplicateCount} akun sudah ada di database (duplikat).`,
            variant: "default",
          });
        }

        return res as { processedCount: number };
      } catch (e: any) {
        toast({
          title: "❌ Gagal Import",
          description: e.message,
          variant: "destructive",
        });
        throw e;
      }
    },
    [refreshData, toast]
  );
  // --- AKHIR UPDATE ---

  const updateAccount = useCallback(
    async (id: string, payload: UpdateAccountPayload) => {
      try {
        const d = await fetchFromAPI(`/api/accounts/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        await refreshData();
        toast({ title: "✅ Update Berhasil" });
        return d as Account;
      } catch (e: any) {
        toast({
          title: "❌ Gagal Update",
          description: e.message,
          variant: "destructive",
        });
        return null;
      }
    },
    [refreshData, toast]
  );

  const deleteAccount = useCallback(
    async (id: string) => {
      try {
        await fetchFromAPI(`/api/accounts/${id}`, { method: "DELETE" });
        await refreshData();
        toast({ title: "✅ Dihapus" });
        return true;
      } catch (e: any) {
        toast({
          title: "❌ Gagal Hapus",
          description: e.message,
          variant: "destructive",
        });
        return false;
      }
    },
    [refreshData, toast]
  );

  const searchAccountsByEmail = useCallback(async (q: string) => {
    if (!q?.trim()) return [];
    try {
      const d = await fetchFromAPI(
        `/api/accounts/search?email=${encodeURIComponent(q)}`
      );
      return Array.isArray(d) ? d : [];
    } catch {
      return [];
    }
  }, []);

  const addGaransiAccounts = useCallback(
    async (accounts: any[], expiresAt: string) => {
      try {
        await fetchFromAPI("/api/garansi-accounts", {
          method: "POST",
          body: JSON.stringify({ accounts, expiresAt }),
        });
        await refreshData();
        toast({ title: "✅ Garansi Ditambahkan" });
      } catch (e: any) {
        toast({
          title: "❌ Gagal",
          description: e.message,
          variant: "destructive",
        });
        throw e;
      }
    },
    [refreshData, toast]
  );

  const getGaransiAccountsByDate = useCallback(async (date: string) => {
    try {
      const d = await fetchFromAPI(`/api/garansi-accounts?date=${date}`);
      return Array.isArray(d) ? d : [];
    } catch {
      return [];
    }
  }, []);

  const getGaransiAccountsByExpiresAt = useCallback(async (date: string) => {
    try {
      const d = await fetchFromAPI(`/api/garansi-accounts?expires=${date}`);
      return Array.isArray(d) ? d : [];
    } catch {
      return [];
    }
  }, []);

  const reportAccount = useCallback(
    async (email: string, reason: string, operatorUsername: string) => {
      try {
        const acc = accounts.find(
          (a) => a.email.toLowerCase() === email.toLowerCase()
        );
        if (!acc) throw new Error("Akun tidak ditemukan.");
        await fetchFromAPI("/api/reported-accounts", {
          method: "POST",
          body: JSON.stringify({
            accountId: acc.id,
            reason,
            operatorName: operatorUsername,
          }),
        });
        await refreshData();
        toast({ title: "✅ Dilaporkan" });
        return true;
      } catch (e: any) {
        toast({
          title: "❌ Gagal Lapor",
          description: e.message,
          variant: "destructive",
        });
        return false;
      }
    },
    [accounts, refreshData, toast]
  );

  const resolveReport = useCallback(
    async (reportId: string, newPassword?: string, note?: string) => {
      try {
        await fetchFromAPI(`/api/reported-accounts/${reportId}`, {
          method: "PATCH",
          body: JSON.stringify({ newPassword, note }),
        });
        await refreshData();
        toast({ title: "✅ Diselesaikan" });
        return true;
      } catch (e: any) {
        toast({
          title: "❌ Gagal Resolve",
          description: e.message,
          variant: "destructive",
        });
        return false;
      }
    },
    [refreshData, toast]
  );

  const addCustomerAssignment = useCallback(
    async (payload: AddCustomerAssignmentPayload) => {
      try {
        const d = await fetchFromAPI("/api/customer-assignments", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        await refreshData();
        toast({ title: "✅ Assignment Berhasil" });
        return d as CustomerAssignment;
      } catch (e: any) {
        toast({
          title: "❌ Gagal",
          description: e.message,
          variant: "destructive",
        });
        return null;
      }
    },
    [refreshData, toast]
  );

  const isCustomerIdentifierUsed = useCallback(async (id: string) => {
    if (!id?.trim()) return false;
    try {
      const res = await fetchFromAPI(
        `/api/customer-assignments/check/${encodeURIComponent(id)}`
      );
      return (res as any)?.used === true;
    } catch {
      return false;
    }
  }, []);

  const getAvailableAccounts = useCallback(
    async (platform: PrismaPlatformType, type: AccountType) => {
      try {
        const d = await fetchFromAPI(
          `/api/accounts/available?platform=${platform}&type=${type}`
        );
        return Array.isArray(d) ? d : [];
      } catch {
        return [];
      }
    },
    []
  );

  const addWhatsappAccount = useCallback(
    async (payload: WhatsappAccountPayload) => {
      try {
        const d = await fetchFromAPI("/api/whatsapp-accounts", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        await refreshData();
        toast({ title: "✅ WA Ditambahkan" });
        return d as WhatsappAccount;
      } catch (e: any) {
        toast({
          title: "❌ Gagal",
          description: e.message,
          variant: "destructive",
        });
        return null;
      }
    },
    [refreshData, toast]
  );

  const updateWhatsappAccount = useCallback(
    async (id: string, payload: Partial<WhatsappAccountPayload>) => {
      try {
        const d = await fetchFromAPI(`/api/whatsapp-accounts/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        await refreshData();
        toast({ title: "✅ WA Diupdate" });
        return d as WhatsappAccount;
      } catch (e: any) {
        toast({
          title: "❌ Gagal",
          description: e.message,
          variant: "destructive",
        });
        return null;
      }
    },
    [refreshData, toast]
  );

  const deleteWhatsappAccount = useCallback(
    async (id: string) => {
      try {
        await fetchFromAPI(`/api/whatsapp-accounts/${id}`, {
          method: "DELETE",
        });
        await refreshData();
        toast({ title: "✅ WA Dihapus" });
        return true;
      } catch (e: any) {
        toast({
          title: "❌ Gagal",
          description: e.message,
          variant: "destructive",
        });
        return false;
      }
    },
    [refreshData, toast]
  );

  // Getters
  const getAccountsByType = useCallback(
    (t: AccountType) => accounts.filter((a) => a.type === t),
    [accounts]
  );
  const getAccountByEmail = useCallback(
    (e: string) =>
      accounts.find((a) => a.email.toLowerCase() === e.toLowerCase()),
    [accounts]
  );
  const getAvailableProfileCount = useCallback(
    (t: AccountType) => availableProfileCounts[t] ?? 0,
    [availableProfileCounts]
  );
  const getReportedAccounts = useCallback(
    () => reportedAccounts,
    [reportedAccounts]
  );
  const getRemainingDays = useCallback((acc: any) => {
    if (!acc?.expiresAt) return 0;
    const diff = new Date(acc.expiresAt).getTime() - new Date().getTime();
    return Math.max(-999, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, []);
  const getCustomerStatistics = useCallback(
    () => customerStatistics,
    [customerStatistics]
  );
  const getOperatorStatistics = useCallback(
    () => operatorStatistics,
    [operatorStatistics]
  );

  const value = useMemo(
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
      getAccountsByType,
      getAccountByEmail,
      getAvailableProfileCount,
      getReportedAccounts,
      getRemainingDays,
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
      getAccountsByType,
      getAccountByEmail,
      getAvailableProfileCount,
      getReportedAccounts,
      getRemainingDays,
      getCustomerStatistics,
      getOperatorStatistics,
    ]
  );

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}

export function useAccounts() {
  const context = useContext(AccountContext);
  if (!context)
    throw new Error("useAccounts must be used within AccountProvider");
  return context;
}
