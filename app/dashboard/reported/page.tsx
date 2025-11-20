import type { Metadata } from "next";
import ReportedClientPage from "./ReportedClientPage";

export const metadata: Metadata = {
  title: "Reported Accounts | TrustDigital.ID",
  description: "Manajemen akun bermasalah dan penyelesaian laporan.",
};

export default function ReportedPage() {
  return <ReportedClientPage />;
}
