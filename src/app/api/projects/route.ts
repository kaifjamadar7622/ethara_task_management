import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createProject, getUserById, seedIfNeeded } from "@/lib/store";

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
    | { name?: string; focus?: string; dueDate?: string; priority?: string; color?: string }
    | null;

  if (!body?.name || !body.focus || !body.dueDate || !body.priority || !body.color) {
    return NextResponse.json({ error: "Missing project fields." }, { status: 400 });
  }

  try {
    const project = await createProject(actor, {
      name: body.name,
      focus: body.focus,
      dueDate: body.dueDate,
      priority: body.priority as never,
      color: body.color,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}