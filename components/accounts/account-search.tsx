"use client";

import type React from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAccounts } from "@/contexts/account-context";
import type { Account, PlatformType } from "@prisma/client"; // Import PlatformType
// Import constants
import { PLATFORM_DISPLAY_NAMES } from "@/lib/constants";
import { Search, Copy, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface AccountSearchProps {
  onClose?: () => void;
}

// Helper Profile Type
type Profile = { profile: string; pin: string; used: boolean };

export default function AccountSearch({ onClose }: AccountSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { searchAccountsByEmail, getRemainingDays, accounts } = useAccounts();
  const { toast } = useToast();
  const [searchResult, setSearchResult] = useState<Account | null>(null);

  // Handle Search (no change needed here)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSearch = searchTerm.trim();
    if (!trimmedSearch) {
      toast({
        title: "Error",
        description: "Please enter an email to search",
        variant: "destructive",
      });
      return;
    }
    setIsSearching(true);
    setSearchResult(null);
    try {
      console.log("=== SEARCHING VIA API ===", "Search term:", trimmedSearch);
      const results: Account[] = await searchAccountsByEmail(trimmedSearch);
      console.log("API Results:", results);
      if (results && results.length > 0) {
        const firstResult = results[0];
        setSearchResult(firstResult);
        console.log("Displaying first result:", firstResult);
        toast({
          title: "✅ Account Found",
          description: `Found account: ${firstResult.email}${
            results.length > 1 ? ` (+${results.length - 1} more)` : ""
          }`,
        });
      } else {
        setSearchResult(null);
        toast({
          title: "❌ Account Not Found",
          description: `No account found with email containing: "${trimmedSearch}"`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred during search.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Helper function for platform name
  const getPlatformDisplayName = (
    platformKey: PlatformType | null | undefined
  ): string => {
    if (!platformKey) return "N/A";
    const key = platformKey as keyof typeof PLATFORM_DISPLAY_NAMES;
    return PLATFORM_DISPLAY_NAMES[key] || platformKey;
  };

  // Updated Copy function
  const copyToClipboard = () => {
    if (!searchResult) return;
    let profilesArray: Profile[] = [];
    if (typeof searchResult.profiles === "string") {
      try {
        profilesArray = JSON.parse(searchResult.profiles);
      } catch {}
    } else if (Array.isArray(searchResult.profiles)) {
      profilesArray = searchResult.profiles as unknown as Profile[];
    }
    const firstAvailableProfile = profilesArray.find(
      (p): p is Profile =>
        typeof p === "object" &&
        p !== null &&
        typeof p.profile === "string" &&
        typeof p.pin === "string" &&
        typeof p.used === "boolean" &&
        !p.used
    );
    const platformName = getPlatformDisplayName(searchResult.platform); // Use helper
    const accountTypeFormatted =
      searchResult.type.charAt(0).toUpperCase() + searchResult.type.slice(1);
    const daysLeft = getRemainingDays(searchResult);
    const accountText = `!!! ${platformName.toUpperCase()} - TRUSTDIGITAL.ID !!!\n\n1. Login hanya di 1 DEVICE !!\n2. Garansi akun 23 Hari\n3. Ketika ada kendala akun :\n - Hapus chache app\n - (DIBACA) GUNAKAN DATA SELULER/HOTSPOT SAAT LOGIN SAJA\n - Install Ulang App\n4. Dilarang mengubah Nama profile, Pin, membuka pengaturan akun !!\n\n💌 Email: ${
      searchResult.email
    }\n🔑 Password: ${searchResult.password}\n👤 Profil: ${
      firstAvailableProfile?.profile || "No available profiles"
    }\nPIN: ${
      firstAvailableProfile?.pin || "N/A"
    }\nTipe: ${accountTypeFormatted}\n⏱️ Sisa hari: ${daysLeft} hari\n\nMelanggar? Akun ditarik + denda Rp300K\nTerima kasih telah memesan di TrustDigital.ID\nContact: @TRUSTDIGITAL001 | IG: @trustdigital.indonesia\nWebsite: https://trustdigital.id\n\nKRITIK DAN SARAN:\nhttps://docs.google.com/forms/d/e/1FAIpQLScSpnLbo4ouMf2hH1rYgJi-xIdV6s8i2euLBTY9Fg1tzVrWyw/viewform?usp=header`;
    navigator.clipboard.writeText(accountText);
    toast({
      title: "📋 Copied",
      description: `Details for ${platformName} account copied!`,
    });
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchResult(null);
  };

  // JSX Updated
  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Enter email address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-8"
            />
            {searchTerm && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-gray-500 hover:text-gray-800"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Button type="submit" disabled={isSearching || !searchTerm.trim()}>
            <Search className="h-4 w-4 mr-2" />
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </div>
        <div className="text-xs text-gray-500">
          💡 Tips: Partial email search supported.
        </div>
      </form>

      {searchResult && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
              ✅ Account Found
            </h3>
            <Button variant="ghost" size="sm" onClick={copyToClipboard}>
              <Copy className="h-4 w-4 mr-1" />
              Copy Details (Formatted)
            </Button>
          </div>
          <div className="space-y-3 font-mono text-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <span className="font-semibold text-gray-600 dark:text-gray-400">
                  📧 Email:
                </span>
                <div className="bg-white dark:bg-gray-700 p-2 rounded border dark:border-gray-600 break-all">
                  {searchResult.email}
                </div>
              </div>
              <div>
                <span className="font-semibold text-gray-600 dark:text-gray-400">
                  🔑 Password:
                </span>
                <div className="bg-white dark:bg-gray-700 p-2 rounded border dark:border-gray-600">
                  {searchResult.password}
                </div>
              </div>
              <div>
                <span className="font-semibold text-gray-600 dark:text-gray-400">
                  📱 Type:
                </span>
                <div className="mt-1">
                  <Badge
                    variant={
                      searchResult.type === "private"
                        ? "secondary"
                        : searchResult.type === "vip"
                        ? "default"
                        : "outline"
                    }
                  >
                    {searchResult.type.charAt(0).toUpperCase() +
                      searchResult.type.slice(1)}
                  </Badge>
                </div>
              </div>
              {/* Platform Updated */}
              <div>
                <span className="font-semibold text-gray-600 dark:text-gray-400">
                  <span role="img" aria-label="Platform">
                    🌐
                  </span>{" "}
                  Platform:
                </span>
                <div className="mt-1">
                  <Badge variant="outline">
                    {getPlatformDisplayName(searchResult.platform)}
                  </Badge>
                </div>
              </div>
              {/* End Platform Update */}
              <div>
                <span className="font-semibold text-gray-600 dark:text-gray-400">
                  ⏰ Days Left:
                </span>
                <div className="mt-1">
                  {(() => {
                    const daysLeft = getRemainingDays(searchResult);
                    const variant: "destructive" | "secondary" | "default" =
                      daysLeft < 0
                        ? "destructive"
                        : daysLeft === 0
                        ? "secondary"
                        : daysLeft <= 7
                        ? "secondary"
                        : "default";
                    const text =
                      daysLeft < 0
                        ? `Expired (${Math.abs(daysLeft)}d ago)`
                        : daysLeft === 0
                        ? "Expires Today"
                        : `${daysLeft} days`;
                    return <Badge variant={variant}>{text}</Badge>;
                  })()}
                </div>
              </div>
            </div>
            {/* Available Profiles */}
            <div>
              <span className="font-semibold text-gray-600 dark:text-gray-400">
                👥 Available Profiles:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                {(() => {
                  let profilesArray: Profile[] = [];
                  if (typeof searchResult.profiles === "string") {
                    try {
                      profilesArray = JSON.parse(searchResult.profiles);
                    } catch {}
                  } else if (Array.isArray(searchResult.profiles)) {
                    profilesArray =
                      searchResult.profiles as unknown as Profile[];
                  }
                  const available = profilesArray.filter(
                    (p): p is Profile =>
                      typeof p === "object" &&
                      p !== null &&
                      typeof p.profile === "string" &&
                      typeof p.pin === "string" &&
                      typeof p.used === "boolean" &&
                      !p.used
                  );
                  if (available.length === 0) {
                    return (
                      <div className="col-span-full text-xs text-red-500 p-2 bg-red-100 dark:bg-red-900 rounded">
                        ❌ No available profiles
                      </div>
                    );
                  }
                  return available.map((profile, index) => (
                    <div
                      key={index}
                      className="text-xs p-2 bg-green-100 dark:bg-green-800 dark:text-green-100 rounded border border-green-200 dark:border-green-700"
                    >
                      <div className="font-medium">{profile.profile}</div>
                      <div className="text-gray-600 dark:text-gray-400">
                        PIN: {profile.pin}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
            {/* Used Profiles */}
            {(() => {
              let profilesArray: Profile[] = [];
              if (typeof searchResult.profiles === "string") {
                try {
                  profilesArray = JSON.parse(searchResult.profiles);
                } catch {}
              } else if (Array.isArray(searchResult.profiles)) {
                profilesArray = searchResult.profiles as unknown as Profile[];
              }
              const used = profilesArray.filter(
                (p): p is Profile =>
                  typeof p === "object" &&
                  p !== null &&
                  typeof p.profile === "string" &&
                  typeof p.pin === "string" &&
                  typeof p.used === "boolean" &&
                  p.used
              );
              if (used.length === 0) return null;
              return (
                <div>
                  <span className="font-semibold text-gray-600 dark:text-gray-400">
                    🚫 Used Profiles:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                    {used.map((profile, index) => (
                      <div
                        key={index}
                        className="text-xs p-2 bg-gray-100 dark:bg-gray-700 rounded border dark:border-gray-600 opacity-60"
                      >
                        <div className="font-medium">{profile.profile}</div>
                        <div className="text-gray-600 dark:text-gray-400">
                          PIN: {profile.pin}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {process.env.NODE_ENV === "development" && (
        <div className="text-xs text-gray-400 p-2 bg-gray-100 dark:bg-gray-900 rounded mt-4">
          <strong>Debug Info:</strong>
          <br />
          Total accounts in context: {accounts.length}
          <br />
          Search term: "{searchTerm}"<br />
          Last search API call: {isSearching ? "In progress..." : "Completed"}
        </div>
      )}
    </div>
  );
}
