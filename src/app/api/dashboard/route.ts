import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildDashboard, getUserById, seedIfNeeded } from "@/lib/store";

export async function GET() {
  await seedIfNeeded();
  const cookieStore = await cookies();
  const userId = cookieStore.get("ethara_task_manager_session")?.value;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await buildDashboard(user));
}