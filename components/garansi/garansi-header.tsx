"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

export function GaransiHeader() {
  return (
    <header className="zenith-card mx-4 mt-4 border-0 relative z-20">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Shield className="h-6 w-6 text-zenith-primary" />
          <h1 className="text-xl font-bold gradient-text">
            Fitur Garansi Akun
          </h1>
        </div>
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
  );
}
