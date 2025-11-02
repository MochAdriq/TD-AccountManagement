import type { Metadata } from "next";
import GaransiClientPage from "./GaransiClientPage"; // Impor client page baru

export const metadata: Metadata = {
  title: "Fitur Garansi | TrustDigital.ID",
  description: "Input dan Cek Akun Garansi TrustDigital.ID",
};

export default function GaransiPage() {
  return <GaransiClientPage />; // Render client page
}
