import { NextResponse } from "next/server";
import { authenticate, seedIfNeeded } from "@/lib/store";

export async function POST(request: Request) {
  await seedIfNeeded();
  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;

  const email = body?.email?.trim();
  const password = body?.password?.trim();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await authenticate(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const response = NextResponse.json({ user: { ...user, password: undefined } });
  response.cookies.set("ethara_task_manager_session", user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}