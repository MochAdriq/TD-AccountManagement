import type { Metadata } from "next"
import DashboardClientPage from "./DashboardClientPage"

export const metadata: Metadata = {
  title: "Dashboard | TrustDigital.ID Account Management",
  description: "Manage and distribute Netflix accounts with TrustDigital.ID",
}

export default function DashboardPage() {
  return <DashboardClientPage />
}
