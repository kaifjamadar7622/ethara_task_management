import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserById, seedIfNeeded } from "@/lib/store";
import { publicUser } from "@/lib/mock-data";

export async function GET() {
  await seedIfNeeded();
  const cookieStore = cookies();
  const userId = cookieStore.get("ethara_task_manager_session")?.value;

  if (!userId) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await getUserById(userId);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user: publicUser(user) });
}