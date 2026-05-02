import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserById, inviteMember, seedIfNeeded } from "@/lib/store";

async function getActor() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("ethara_task_manager_session")?.value;
  if (!userId) return null;
  return getUserById(userId);
}

export async function POST(request: Request) {
  await seedIfNeeded();
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { name?: string; email?: string; title?: string }
    | null;

  if (!body?.name || !body.email || !body.title) {
    return NextResponse.json({ error: "Missing member fields." }, { status: 400 });
  }

  try {
    const member = await inviteMember(actor, {
      name: body.name,
      email: body.email,
      title: body.title,
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}