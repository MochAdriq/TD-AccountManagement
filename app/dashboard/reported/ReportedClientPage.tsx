"use client";

import { AccountProvider } from "@/contexts/account-context";
import ReportedAccounts from "@/components/reports/reported-accounts";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function ReportedClientPage() {
  return (
    <AccountProvider>
      <div className="min-h-screen bg-zenith-bg relative overflow-hidden">
        <div className="floating-elements"></div>

        {/* Header Section */}
        <header className="zenith-card mx-4 mt-4 border-0 relative z-20">
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h1 className="text-xl font-bold gradient-text">
                Manajemen Akun Bermasalah
              </h1>
            </div>

            {/* Tombol Kembali ke Dashboard Utama */}
            <Link href="/dashboard" passHref>
              <Button
                variant="outline"
                className="bg-white/80 border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl px-4 font-semibold"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali ke Dashboard
              </Button>
            </Link>
          </div>
        </header>

        <main className="container mx-auto py-8 px-4 relative z-10">
          <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-white/40 shadow-soft">
            <ReportedAccounts />
          </div>
        </main>
      </div>
    </AccountProvider>
  );
}
