import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createTask, getUserById, seedIfNeeded, updateTaskStatus } from "@/lib/store";

async function getActor() {
  const cookieStore = cookies();
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
    | {
        title?: string;
        projectId?: string;
        assigneeId?: string;
        dueDate?: string;
        priority?: string;
        estimate?: string;
        notes?: string;
      }
    | null;

  if (!body?.title || !body.projectId || !body.assigneeId || !body.dueDate || !body.priority) {
    return NextResponse.json({ error: "Missing task fields." }, { status: 400 });
  }

  try {
    const task = await createTask(actor, {
      title: body.title,
      projectId: body.projectId,
      assigneeId: body.assigneeId,
      dueDate: body.dueDate,
      priority: body.priority as never,
      estimate: body.estimate ?? "3h",
      notes: body.notes ?? "",
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "FORBIDDEN" ? 403 : message === "INVALID_REFERENCE" ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  await seedIfNeeded();
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { taskId?: string; status?: string }
    | null;

  if (!body?.taskId || !body.status) {
    return NextResponse.json({ error: "Missing task update fields." }, { status: 400 });
  }

  try {
    const task = await updateTaskStatus(actor, {
      taskId: body.taskId,
      status: body.status as never,
    });

    return NextResponse.json({ task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "FORBIDDEN" ? 403 : message === "NOT_FOUND" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}