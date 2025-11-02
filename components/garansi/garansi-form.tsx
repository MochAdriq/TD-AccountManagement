"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAccounts } from "@/contexts/account-context";
// Import types from Prisma
import type {
  AccountType,
  PlatformType as PrismaPlatformType,
} from "@prisma/client";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// Import constants for dropdown
import { PLATFORM_LIST } from "@/lib/constants";

interface GaransiFormProps {
  onSuccess?: () => void; // <-- Tambahkan ini
}

export default function GaransiForm({ onSuccess }: GaransiFormProps) {
  const { addGaransiAccounts } = useAccounts();
  const { toast } = useToast();

  const [accountType, setAccountType] = useState<AccountType | "">(""); // Use Prisma AccountType if needed
  const [platform, setPlatform] = useState<PrismaPlatformType | "">(""); // Use Prisma PlatformType
  const [accountInput, setAccountInput] = useState("");
  const [sharedPassword, setSharedPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(
    addDays(new Date(), 30)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [inputMode, setInputMode] = useState<"email_password" | "email_only">(
    "email_password"
  );

  // handleSubmit (ensure platform cast is correct)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    if (!accountType) {
      setError("Pilih tipe akun.");
      setIsLoading(false);
      return;
    }
    if (!platform) {
      setError("Pilih platform.");
      setIsLoading(false);
      return;
    }
    if (!accountInput.trim()) {
      setError("Masukkan data akun.");
      setIsLoading(false);
      return;
    }
    if (inputMode === "email_only" && !sharedPassword.trim()) {
      setError("Masukkan shared password.");
      setIsLoading(false);
      return;
    }
    if (!expiresAt) {
      setError("Pilih tanggal kadaluarsa.");
      setIsLoading(false);
      return;
    }

    const lines = accountInput.trim().split("\n");
    const accountsToAdd: {
      email: string;
      password: string;
      type: AccountType;
      platform: PrismaPlatformType;
    }[] = [];
    let parseError = false;

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || parseError) return;
      let email = "";
      let password = "";
      if (inputMode === "email_password") {
        const parts = trimmedLine.split(/[:\s,;\t]+/);
        if (parts.length >= 2 && parts[0].includes("@")) {
          email = parts[0].trim();
          password = parts[1].trim();
        } else {
          setError(`Format salah: "${trimmedLine}". Harusnya email:password`);
          parseError = true;
          return;
        }
      } else {
        if (trimmedLine.includes("@")) {
          email = trimmedLine;
          password = sharedPassword.trim();
        } else {
          setError(`Format email salah: "${trimmedLine}"`);
          parseError = true;
          return;
        }
      }
      if (email && password) {
        accountsToAdd.push({
          email,
          password,
          type: accountType as AccountType,
          platform: platform as PrismaPlatformType,
        });
      } // Cast platform
    });

    if (parseError) {
      setIsLoading(false);
      return;
    }
    if (accountsToAdd.length === 0) {
      setError("Tidak ada akun valid.");
      setIsLoading(false);
      return;
    }

    try {
      await addGaransiAccounts(accountsToAdd, expiresAt.toISOString()); // Call context function
      toast({
        title: "🛡️ Akun Garansi Ditambahkan",
        description: `Berhasil menambahkan ${accountsToAdd.length} akun garansi baru.`,
        duration: 5000,
      });
      setAccountType("");
      setPlatform("");
      setAccountInput("");
      setSharedPassword("");
      setError("");
      setExpiresAt(addDays(new Date(), 30)); // Reset expiresAt too

      onSuccess?.(); // <-- Panggil onSuccess di sini
    } catch (err) {
      console.error("Error adding garansi accounts:", err);
      setError(
        err instanceof Error ? err.message : "Gagal menambahkan akun garansi."
      );
      toast({
        title: "❌ Gagal",
        description: "Terjadi kesalahan saat menyimpan akun garansi.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Akun akan masuk ke database garansi terpisah. Tanggal mulai garansi
          di-set ke hari ini.
        </AlertDescription>
      </Alert>

      {/* Tipe Akun */}
      <div className="space-y-2">
        <Label htmlFor="garansi-account-type" className="font-semibold">
          Tipe Akun
        </Label>
        <Select
          value={accountType}
          onValueChange={(value) => setAccountType(value as AccountType)}
          disabled={isLoading}
        >
          <SelectTrigger
            id="garansi-account-type"
            className="h-12 border-gray-300"
          >
            <SelectValue placeholder="Pilih tipe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="sharing">Sharing</SelectItem>
            <SelectItem value="vip">VIP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Platform Dropdown Updated */}
      <div className="space-y-2">
        <Label htmlFor="garansi-platform" className="font-semibold">
          Platform
        </Label>
        <Select
          value={platform}
          onValueChange={(value) => setPlatform(value as PrismaPlatformType)}
          disabled={isLoading}
        >
          <SelectTrigger id="garansi-platform" className="h-12 border-gray-300">
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
        <Label className="font-semibold">Mode Input Akun</Label>
        <div className="flex gap-4">
          <Button
            type="button"
            variant={inputMode === "email_password" ? "default" : "outline"}
            onClick={() => setInputMode("email_password")}
            disabled={isLoading}
          >
            Email:Password per Baris
          </Button>
          <Button
            type="button"
            variant={inputMode === "email_only" ? "default" : "outline"}
            onClick={() => setInputMode("email_only")}
            disabled={isLoading}
          >
            Email per Baris (Password Sama)
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="garansi-account-input" className="font-semibold">
          {inputMode === "email_password"
            ? "Data Akun (Email:Password per baris)"
            : "Email Akun (Satu email per baris)"}
        </Label>
        <Textarea
          id="garansi-account-input"
          value={accountInput}
          onChange={(e) => setAccountInput(e.target.value)}
          placeholder={
            inputMode === "email_password"
              ? "contoh@email.com:password123\n..."
              : "contoh@email.com\n..."
          }
          className="min-h-[120px] border-gray-300"
          required
          disabled={isLoading}
        />
        <p className="text-xs text-gray-500">
          Pisahkan email dan password dengan :, spasi, koma, atau tab jika mode
          Email:Password.
        </p>
      </div>
      {inputMode === "email_only" && (
        <div className="space-y-2">
          <Label htmlFor="garansi-shared-password" className="font-semibold">
            Shared Password
          </Label>
          <Input
            id="garansi-shared-password"
            type="text"
            value={sharedPassword}
            onChange={(e) => setSharedPassword(e.target.value)}
            placeholder="Password sama untuk semua email di atas"
            className="h-12 border-gray-300"
            required={inputMode === "email_only"}
            disabled={isLoading}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="garansi-date" className="font-semibold">
          Tanggal Kadaluarsa
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="garansi-date"
              className={cn(
                "w-full justify-start text-left font-normal h-12 border-gray-300",
                !expiresAt && "text-muted-foreground"
              )}
              disabled={isLoading}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {expiresAt ? format(expiresAt, "dd MMMM yyyy") : "Pilih tanggal"}
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
              captionLayout="dropdown"
              fromYear={new Date().getFullYear()}
              toYear={new Date().getFullYear() + 5}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <p className="text-xs text-gray-500">
          Pilih tanggal kadaluarsa akun ini.
        </p>
      </div>
      <Button
        type="submit"
        className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
        disabled={isLoading}
      >
        {isLoading ? "Menyimpan..." : "Tambah ke Database Garansi"}
      </Button>
    </form>
  );
}
