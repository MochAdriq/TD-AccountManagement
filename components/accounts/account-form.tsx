"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
// Import tipe AccountType dari service, PlatformType dari Prisma
import type { AccountType } from "@/lib/database-service";
import type { PlatformType as PrismaPlatformType } from "@prisma/client";
import { useAccounts } from "@/contexts/account-context";
// Import constants for dropdown
import { PLATFORM_LIST } from "@/lib/constants";

interface AccountFormProps {
  type: AccountType;
  onSuccess?: () => void;
}

export default function AccountForm({ type, onSuccess }: AccountFormProps) {
  const { addAccount } = useAccounts();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [platform, setPlatform] = useState<PrismaPlatformType | "">(""); // Use Prisma type
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(
    addDays(new Date(), 30)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    if (!platform) {
      setError("Platform harus dipilih.");
      setIsLoading(false);
      return;
    }
    if (!expiresAt) {
      setError("Tanggal kadaluarsa harus dipilih.");
      setIsLoading(false);
      return;
    }
    try {
      const newAccount = await addAccount({
        email,
        password,
        type,
        platform: platform as PrismaPlatformType,
        expiresAt: expiresAt.toISOString(),
      });
      if (newAccount) {
        setEmail("");
        setPassword("");
        setPlatform("");
        setExpiresAt(addDays(new Date(), 30));
        setError(null);
        onSuccess?.();
      } else {
        setError("Gagal menambahkan akun. Periksa log atau coba lagi.");
      }
    } catch (err: any) {
      console.error("Error submitting account form:", err);
      setError(err.message || "Terjadi kesalahan tak terduga.");
    } finally {
      setIsLoading(false);
    }
  };

  const getFriendlyTypeName = (accountType: AccountType): string => {
    switch (accountType) {
      case "private":
        return "Private";
      case "sharing":
        return "Sharing";
      case "vip":
        return "VIP";
      default:
        return accountType;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      {error && (
        <p className="text-sm text-red-600 px-1 py-2 bg-red-50 rounded border border-red-200">
          {error}
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor={`${type}-email`}>Email</Label>
        <Input
          id={`${type}-email`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={`Enter ${getFriendlyTypeName(type)} account email`}
          className="border-gray-300 focus-visible:ring-blue-500"
          required
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${type}-password`}>Password</Label>
        <Input
          id={`${type}-password`}
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter account password"
          className="border-gray-300 focus-visible:ring-blue-500"
          required
          disabled={isLoading}
        />
      </div>
      {/* Platform Dropdown Updated */}
      <div className="space-y-2">
        <Label htmlFor={`${type}-platform`}>Platform</Label>
        <Select
          value={platform}
          onValueChange={(value) => setPlatform(value as PrismaPlatformType)}
          disabled={isLoading}
        >
          <SelectTrigger id={`${type}-platform`} className="border-gray-300">
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
        <Label htmlFor={`${type}-expiresAt`}>Tanggal Kadaluarsa</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id={`${type}-expiresAt`}
              className={cn(
                "w-full justify-start text-left font-normal border-gray-300",
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
              fromMonth={new Date()}
              toYear={new Date().getFullYear() + 5}
              captionLayout="dropdown"
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="pt-2">
        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={isLoading}
        >
          {isLoading ? "Adding..." : `Add ${getFriendlyTypeName(type)} Account`}
        </Button>
      </div>
    </form>
  );
}
