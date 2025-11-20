import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database-service";
import { verifyAuth } from "@/lib/auth-server";

export async function PATCH(
  req: Request,
  { params }: { params: { reportId: string } }
) {
  try {
    const auth = await verifyAuth(req);
    if (!auth || auth.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Baca note dari body request
    const { newPassword, note } = await req.json();

    if (!params.reportId) {
      return NextResponse.json(
        { error: "Report ID required" },
        { status: 400 }
      );
    }

    // Kirim note ke DatabaseService
    await DatabaseService.resolveReport(params.reportId, newPassword, note);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to resolve report" },
      { status: 500 }
    );
  }
}
