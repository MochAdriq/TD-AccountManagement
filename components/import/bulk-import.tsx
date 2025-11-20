"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useAccounts } from "@/contexts/account-context";
import type {
  AccountType,
  PlatformType as PrismaPlatformType,
} from "@prisma/client";
import {
  AlertCircle,
  Package,
  Calendar as CalendarIcon,
  Settings2,
} from "lucide-react";
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
import { PLATFORM_LIST } from "@/lib/constants";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function BulkImport() {
  const { toast } = useToast();
  const { addAccounts } = useAccounts();

  const [emails, setEmails] = useState("");

  // State Mode Import: 'private' | 'sharing' | 'vip' | 'custom'
  const [importMode, setImportMode] = useState<string>("private");

  // State Khusus Custom
  const [customType, setCustomType] = useState<AccountType>("private");
  const [customProfileCount, setCustomProfileCount] = useState<number>();

  const [platform, setPlatform] = useState<PrismaPlatformType | "">("");
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(
    addDays(new Date(), 30)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sharedPassword, setSharedPassword] = useState("");
  const [inputMode, setInputMode] = useState<"email_password" | "email_only">(
    "email_password"
  );

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

      // Tentukan Tipe Akun Final & Count
      let finalType: AccountType = "private";
      let finalCount: number | undefined = undefined;

      if (importMode === "custom") {
        finalType = customType;
        finalCount = customProfileCount; // Kirim angka manual user
      } else {
        finalType = importMode as AccountType;
        finalCount = undefined; // Gunakan default backend
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
          // --- FIX PARSING: Hanya split di delimiter pertama (: atau | atau spasi) ---
          let delimiter = "";
          if (line.includes(":")) delimiter = ":";
          else if (line.includes("|")) delimiter = "|";

          if (delimiter) {
            const idx = line.indexOf(delimiter);
            email = line.substring(0, idx).trim();
            linePassword = line.substring(idx + 1).trim();
          } else {
            // Fallback split spasi/tab
            const parts = line.split(/[\s\t]+/);
            if (parts.length >= 2) {
              email = parts[0].trim();
              linePassword = parts.slice(1).join(" ").trim();
            } else {
              parseErrorLine = `Format salah: "${line}". Gunakan 'email:password'`;
              return;
            }
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

        // Validasi Email Sederhana
        if (!email.includes("@")) {
          parseErrorLine = `Email tidak valid: "${email}"`;
          return;
        }

        accountsToAdd.push({
          email,
          password: linePassword,
          type: finalType,
          platform: platform as PrismaPlatformType,
        });
      });

      if (parseErrorLine) throw new Error(parseErrorLine);
      if (accountsToAdd.length === 0) throw new Error("Tidak ada akun valid.");

      // Kirim ke API dengan parameter customProfileCount
      await addAccounts(accountsToAdd, expiresAt.toISOString(), finalCount);

      // Reset Form jika sukses
      setEmails("");
      // Keep platform & options for rapid entry
      setError(null);
    } catch (error: any) {
      console.error("Bulk import error:", error);
      setError(error.message || "Gagal mengimpor akun.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <ScrollArea className="h-[500px] pr-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* PILIHAN TIPE AKUN (TERMASUK CUSTOM) */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <Label className="text-base font-semibold text-gray-700 flex items-center gap-2">
              <Package className="h-4 w-4" /> Konfigurasi Stok
            </Label>

            <RadioGroup
              value={importMode}
              onValueChange={setImportMode}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <div>
                <RadioGroupItem
                  value="private"
                  id="mode-private"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="mode-private"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:text-blue-600 cursor-pointer h-full"
                >
                  <span className="text-sm font-bold">PRIVATE</span>
                  <span className="text-xs text-gray-500 mt-1">
                    8 Profil (Default)
                  </span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="sharing"
                  id="mode-sharing"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="mode-sharing"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-purple-600 peer-data-[state=checked]:text-purple-600 cursor-pointer h-full"
                >
                  <span className="text-sm font-bold">SHARING</span>
                  <span className="text-xs text-gray-500 mt-1">
                    20 Profil (Default)
                  </span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="vip"
                  id="mode-vip"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="mode-vip"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-yellow-600 peer-data-[state=checked]:text-yellow-600 cursor-pointer h-full"
                >
                  <span className="text-sm font-bold">VIP</span>
                  <span className="text-xs text-gray-500 mt-1">
                    6 Profil (Default)
                  </span>
                </Label>
              </div>

              {/* TOMBOL CUSTOM */}
              <div>
                <RadioGroupItem
                  value="custom"
                  id="mode-custom"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="mode-custom"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-white p-4 hover:bg-gray-50 peer-data-[state=checked]:border-green-600 peer-data-[state=checked]:text-green-600 cursor-pointer h-full"
                >
                  <div className="flex items-center gap-1">
                    <Settings2 className="h-4 w-4" />
                    <span className="text-sm font-bold">CUSTOM</span>
                  </div>
                  <span className="text-xs text-gray-500 mt-1">
                    Atur Manual
                  </span>
                </Label>
              </div>
            </RadioGroup>

            {/* AREA SETTING CUSTOM (Hanya Muncul Jika Custom Dipilih) */}
            {importMode === "custom" && (
              <div className="mt-4 p-4 bg-white rounded border border-green-200 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-gray-500">
                      Tipe Akun Sebenarnya
                    </Label>
                    <Select
                      value={customType}
                      onValueChange={(v) => setCustomType(v as AccountType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="sharing">Sharing</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-gray-500">
                      Jumlah Stok (Profil)
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={customProfileCount}
                      onChange={(e) =>
                        setCustomProfileCount(parseInt(e.target.value) || 0)
                      }
                    />
                    <p className="text-[10px] text-gray-500">
                      Menentukan jumlah "Available Profiles" per akun.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-platform" className="font-semibold">
                Platform
              </Label>
              <Select
                value={platform}
                onValueChange={(value) =>
                  setPlatform(value as PrismaPlatformType)
                }
                disabled={isLoading}
              >
                <SelectTrigger id="bulk-platform" className="h-12">
                  <SelectValue placeholder="Pilih platform" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {PLATFORM_LIST.map((opt) => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-expiresAt" className="font-semibold">
                Tanggal Kadaluarsa
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-12",
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
                    defaultMonth={expiresAt || new Date()}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">Mode Input Akun</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={
                  inputMode === "email_password" ? "default" : "secondary"
                }
                onClick={() => setInputMode("email_password")}
              >
                Email:Password
              </Button>
              <Button
                type="button"
                size="sm"
                variant={inputMode === "email_only" ? "default" : "secondary"}
                onClick={() => setInputMode("email_only")}
              >
                Email Only + Shared Pass
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Textarea
              id="bulk-emails"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder={
                inputMode === "email_password"
                  ? "email1@contoh.com:pass1\nemail2@contoh.com:pass2"
                  : "email1@contoh.com\nemail2@contoh.com"
              }
              className="min-h-[100px] font-mono text-sm"
              required
              disabled={isLoading}
            />
          </div>

          {inputMode === "email_only" && (
            <div className="space-y-2">
              <Label className="font-semibold">Shared Password</Label>
              <Input
                type="text"
                value={sharedPassword}
                onChange={(e) => setSharedPassword(e.target.value)}
                placeholder="Password untuk semua akun"
                required
              />
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700"
            disabled={isLoading}
          >
            {isLoading ? "Memproses Import..." : "📦 Mulai Import"}
          </Button>
        </form>
      </ScrollArea>
    </div>
  );
}
