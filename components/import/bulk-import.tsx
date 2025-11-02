"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useAccounts } from "@/contexts/account-context";
// Import types from Prisma
import type {
  AccountType,
  PlatformType as PrismaPlatformType,
} from "@prisma/client";
import { AlertCircle, Package, Calendar as CalendarIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
// Import constants for dropdown
import { PLATFORM_LIST } from "@/lib/constants";

// Helper profile count (no change)
const getDefaultProfileCount = (type: AccountType): number => {
  if (type === "private") return 8;
  if (type === "sharing") return 20;
  if (type === "vip") return 6;
  return 8;
};

export default function BulkImport() {
  const { toast } = useToast();
  const { addAccounts } = useAccounts();
  const [emails, setEmails] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("private");
  const [platform, setPlatform] = useState<PrismaPlatformType | "">(""); // Use Prisma type
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(
    addDays(new Date(), 30)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharedPassword, setSharedPassword] = useState("");
  const [inputMode, setInputMode] = useState<"email_password" | "email_only">(
    "email_password"
  );

  const handleAccountTypeChange = (type: AccountType) => {
    setAccountType(type);
  };

  // handleSubmit (ensure platform cast is correct)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const lines = emails
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      if (lines.length === 0)
        throw new Error("Masukkan setidaknya satu data akun.");
      if (!platform) throw new Error("Platform harus dipilih.");
      if (!expiresAt) throw new Error("Tanggal kadaluarsa harus dipilih.");
      const finalSharedPassword = sharedPassword.trim();
      if (inputMode === "email_only" && !finalSharedPassword) {
        throw new Error("Masukkan shared password.");
      }
      const accountsToAdd: {
        email: string;
        password: string;
        type: AccountType;
        platform: PrismaPlatformType;
      }[] = [];
      let parseErrorLine: string | null = null;
      lines.forEach((line) => {
        if (parseErrorLine) return;
        let email = "";
        let linePassword = "";
        if (inputMode === "email_password") {
          const parts = line.split(/[:\s,;\t]+/);
          if (parts.length >= 2 && parts[0].includes("@") && parts[1]) {
            email = parts[0].trim();
            linePassword = parts[1].trim();
          } else {
            parseErrorLine = `Format salah: "${line}". Harusnya email:password`;
            return;
          }
        } else {
          if (line.includes("@")) {
            email = line.trim();
            linePassword = finalSharedPassword;
          } else {
            parseErrorLine = `Format email salah: "${line}"`;
            return;
          }
        }
        accountsToAdd.push({
          email,
          password: linePassword,
          type: accountType,
          platform: platform as PrismaPlatformType,
        }); // Cast platform
      });
      if (parseErrorLine) throw new Error(parseErrorLine);
      if (accountsToAdd.length === 0) throw new Error("Tidak ada akun valid.");
      await addAccounts(accountsToAdd, expiresAt.toISOString()); // Call context function
      toast({
        title: "✅ Import Berhasil!",
        description: `Berhasil mengimpor ${
          accountsToAdd.length
        } akun ${accountType} (${
          PLATFORM_LIST.find((p) => p.key === platform)?.name || platform
        }) ke Stok Utama.`,
        duration: 5000,
      }); // Use PLATFORM_LIST for name in toast
      setEmails("");
      setPlatform("");
      setExpiresAt(addDays(new Date(), 30));
      setSharedPassword("");
      setError(null);
    } catch (error: any) {
      console.error("Bulk import error:", error);
      setError(error.message || "Gagal mengimpor akun.");
      toast({
        title: "❌ Gagal Import",
        description: error.message || "Terjadi kesalahan saat impor.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-3">
          <Label className="text-base font-semibold text-gray-700">
            Account Type
          </Label>
          <RadioGroup
            defaultValue="private"
            value={accountType}
            onValueChange={(value) =>
              handleAccountTypeChange(value as AccountType)
            }
            className="flex flex-wrap gap-x-6 gap-y-2"
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem
                value="private"
                id="private-bulk"
                className="w-5 h-5"
              />
              <Label htmlFor="private-bulk" className="text-base">
                Private ({getDefaultProfileCount("private")}p)
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem
                value="sharing"
                id="sharing-bulk"
                className="w-5 h-5"
              />
              <Label htmlFor="sharing-bulk" className="text-base">
                Sharing ({getDefaultProfileCount("sharing")}p)
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="vip" id="vip-bulk" className="w-5 h-5" />
              <Label htmlFor="vip-bulk" className="text-base">
                VIP ({getDefaultProfileCount("vip")}p)
              </Label>
            </div>
          </RadioGroup>
        </div>
        {/* Platform Dropdown Updated */}
        <div className="space-y-2">
          <Label
            htmlFor="bulk-platform"
            className="text-base font-semibold text-gray-700"
          >
            Platform (untuk semua)
          </Label>
          <Select
            value={platform}
            onValueChange={(value) => setPlatform(value as PrismaPlatformType)}
            disabled={isLoading}
          >
            <SelectTrigger id="bulk-platform" className="h-14 border-gray-300">
              <SelectValue placeholder="Pilih platform" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {PLATFORM_LIST.map(
                (
                  opt // Use PLATFORM_LIST
                ) => (
                  <SelectItem key={opt.key} value={opt.key}>
                    {opt.name}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
        {/* End Platform Update */}
        <div className="space-y-2">
          <Label
            htmlFor="bulk-expiresAt"
            className="text-base font-semibold text-gray-700"
          >
            Tanggal Kadaluarsa (untuk semua)
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                id="bulk-expiresAt"
                className={cn(
                  "w-full justify-start text-left font-normal h-14 border-gray-300",
                  !expiresAt && "text-muted-foreground"
                )}
                disabled={isLoading}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {expiresAt
                  ? format(expiresAt, "dd MMMM yyyy")
                  : "Pilih tanggal"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={expiresAt}
                onSelect={setExpiresAt}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today;
                }}
                defaultMonth={expiresAt || new Date()}
                fromMonth={new Date()}
                toYear={new Date().getFullYear() + 5}
                captionLayout="dropdown"
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label className="font-semibold">Mode Input Akun</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={inputMode === "email_password" ? "default" : "outline"}
              onClick={() => setInputMode("email_password")}
              disabled={isLoading}
            >
              Email:Password per Baris
            </Button>
            <Button
              type="button"
              size="sm"
              variant={inputMode === "email_only" ? "default" : "outline"}
              onClick={() => setInputMode("email_only")}
              disabled={isLoading}
            >
              Email per Baris + Shared Password
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          <Label
            htmlFor="bulk-emails"
            className="text-base font-semibold text-gray-700"
          >
            {inputMode === "email_password"
              ? "Data Akun (Email:Password per baris)"
              : "Email Akun (Satu email per baris)"}
          </Label>
          <Textarea
            id="bulk-emails"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder={
              inputMode === "email_password"
                ? "email1@contoh.com:pass1\nemail2@contoh.com:pass2"
                : "email1@contoh.com\nemail2@contoh.com"
            }
            className="min-h-[150px] border-gray-300"
            required
            disabled={isLoading}
          />
          <p className="text-sm text-gray-500">
            {inputMode === "email_password"
              ? "Pisahkan email & password dengan :, spasi, koma, atau tab."
              : "Satu email per baris."}
          </p>
        </div>
        {inputMode === "email_only" && (
          <div className="space-y-3">
            <Label
              htmlFor="bulk-shared-password"
              className="text-base font-semibold text-gray-700"
            >
              Shared Password (untuk semua email)
            </Label>
            <Input
              id="bulk-shared-password"
              type="text"
              value={sharedPassword}
              onChange={(e) => setSharedPassword(e.target.value)}
              placeholder="Enter shared password"
              className="h-14 border-gray-300"
              required={inputMode === "email_only"}
              disabled={isLoading}
            />
          </div>
        )}
        <p className="text-sm text-gray-500 pt-2">
          📦 Setiap akun akan dibuat dengan{" "}
          {getDefaultProfileCount(accountType)} profile dan masuk ke Stok Utama.
        </p>
        <Button
          type="submit"
          className="w-full h-16 text-lg font-bold bg-green-600 hover:bg-green-700"
          disabled={isLoading}
        >
          {isLoading ? "Importing..." : "📦 Import ke Stok Utama"}
        </Button>
      </form>
      {/* Info Panel (tidak berubah) */}
      {/* <div className="border border-gray-200 rounded-lg p-6">
        <h4 className="font-bold mb-4 text-gray-800 text-lg">
          💡 Info Mode Import:
        </h4>
        <div className="text-sm">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h5 className="font-semibold text-green-800 mb-2 flex items-center">
              <Package className="h-4 w-4 mr-2" /> Impor ke Stok Utama:
            </h5>
            <ul className="space-y-1 list-disc list-inside text-green-700">
              <li>
                Akun akan <strong>MASUK ke stok utama</strong>.
              </li>
              <li>
                Jumlah profil otomatis ({getDefaultProfileCount(accountType)}{" "}
                untuk {accountType}).
              </li>
              <li>Digunakan untuk menambah stok operasional.</li>
              <li>Akun ini bisa di-request oleh operator.</li>
              <li>Menambah hitungan "Available Profiles".</li>
            </ul>
          </div>
        </div>
      </div> */}
    </div>
  );
}
