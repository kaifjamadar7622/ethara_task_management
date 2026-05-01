import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  demoCredentials,
  publicUser,
  publicUsers,
  seedState,
  type DashboardPayload,
  type Priority,
  type Project,
  type StoreState,
  type Task,
  type TaskStatus,
  type User,
} from "./mock-data";

const storageDirectory = path.join(process.cwd(), "data");
const storageFile = path.join(storageDirectory, "task-manager.json");

function cloneSeedState() {
  return structuredClone(seedState);
}

async function readState(): Promise<StoreState> {
  try {
    const raw = await fs.readFile(storageFile, "utf8");
    return JSON.parse(raw) as StoreState;
  } catch {
    await fs.mkdir(storageDirectory, { recursive: true });
    await fs.writeFile(storageFile, JSON.stringify(seedState, null, 2), "utf8");
    return cloneSeedState();
  }
}

async function writeState(state: StoreState) {
  await fs.mkdir(storageDirectory, { recursive: true });
  await fs.writeFile(storageFile, JSON.stringify(state, null, 2), "utf8");
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isOverdue(task: Task) {
  return task.status !== "Done" && new Date(task.dueDate) < startOfToday();
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((left, right) => {
    const leftScore = Number(new Date(left.dueDate)) + (left.status === "Done" ? 999999999 : 0);
    const rightScore = Number(new Date(right.dueDate)) + (right.status === "Done" ? 999999999 : 0);
    return leftScore - rightScore;
  });
}

function sortProjects(projects: Project[]) {
  return [...projects].sort((left, right) => Number(new Date(left.dueDate)) - Number(new Date(right.dueDate)));
}

function createSummary(projects: Project[], tasks: Task[]) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "Done").length;
  const overdueTasks = tasks.filter(isOverdue).length;
  const activeProjects = projects.filter((project) => project.progress < 100).length;
  const averageProgress = Math.round(
    projects.reduce((total, project) => total + project.progress, 0) /
      Math.max(projects.length, 1),
  );

  return {
    totalTasks,
    completedTasks,
    overdueTasks,
    activeProjects,
    completionRate: Math.round((completedTasks / Math.max(totalTasks, 1)) * 100),
    avgProgress: averageProgress,
  };
}

export async function loadStore() {
  return readState();
}

export async function saveStore(state: StoreState) {
  await writeState(state);
}

export async function getUserByEmail(email: string) {
  const state = await readState();
  return state.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function getUserById(id: string) {
  const state = await readState();
  return state.users.find((user) => user.id === id) ?? null;
}

export async function authenticate(email: string, password: string) {
  const user = await getUserByEmail(email);
  if (!user || user.password !== password) {
    return null;
  }

  return user;
}

export async function buildDashboard(user: User): Promise<DashboardPayload> {
  const state = await readState();
  const visibleProjects =
    user.role === "Admin"
      ? state.projects
      : state.projects.filter(
          (project) => project.ownerId === user.id || project.memberIds.includes(user.id),
        );
  const visibleTasks =
    user.role === "Admin"
      ? state.tasks
      : state.tasks.filter((task) =>
          visibleProjects.some((project) => project.id === task.projectId) || task.assigneeId === user.id,
        );

  const visibleTeamIds = new Set<string>([user.id]);
  for (const project of visibleProjects) {
    visibleTeamIds.add(project.ownerId);
    project.memberIds.forEach((memberId) => visibleTeamIds.add(memberId));
  }

  const visibleTeam = state.users.filter((member) => visibleTeamIds.has(member.id));
  const summary = createSummary(visibleProjects, visibleTasks);

  return {
    user: publicUser(user),
    metrics: summary,
    projects: sortProjects(visibleProjects),
    tasks: sortTasks(visibleTasks),
    team: publicUsers(visibleTeam),
    activity: state.activity.slice(0, user.role === "Admin" ? 8 : 5),
  };
}

export async function createTask(
  actor: User,
  input: {
    title: string;
    projectId: string;
    assigneeId: string;
    dueDate: string;
    priority: Priority;
    estimate: string;
    notes: string;
  },
) {
  if (actor.role !== "Admin") {
    throw new Error("FORBIDDEN");
  }

  const state = await readState();
  const project = state.projects.find((entry) => entry.id === input.projectId);
  const assignee = state.users.find((entry) => entry.id === input.assigneeId);

  if (!project || !assignee) {
    throw new Error("INVALID_REFERENCE");
  }

  const task: Task = {
    id: randomUUID(),
    title: input.title.trim(),
    projectId: project.id,
    assigneeId: assignee.id,
    status: "Backlog",
    priority: input.priority,
    dueDate: input.dueDate,
    estimate: input.estimate.trim() || "3h",
    notes: input.notes.trim() || "No notes added.",
    createdAt: new Date().toISOString(),
  };

  state.tasks.unshift(task);
  state.activity.unshift({
    id: randomUUID(),
    actorId: actor.id,
    message: `${actor.name} created ${task.title}`,
    detail: `Assigned to ${assignee.name} inside ${project.name}.`,
    timestamp: new Date().toISOString(),
    tone: "success",
  });

  state.activity = state.activity.slice(0, 10);
  await writeState(state);
  return task;
}

export async function updateTaskStatus(
  actor: User,
  input: { taskId: string; status: TaskStatus },
) {
  const state = await readState();
  const task = state.tasks.find((entry) => entry.id === input.taskId);

  if (!task) {
    throw new Error("NOT_FOUND");
  }

  if (actor.role !== "Admin" && task.assigneeId !== actor.id) {
    throw new Error("FORBIDDEN");
  }

  task.status = input.status;
  state.activity.unshift({
    id: randomUUID(),
    actorId: actor.id,
    message: `${actor.name} moved ${task.title} to ${input.status}`,
    detail: `The task now reflects the latest delivery state.`,
    timestamp: new Date().toISOString(),
    tone: input.status === "Done" ? "success" : "info",
  });

  state.activity = state.activity.slice(0, 10);
  await writeState(state);
  return task;
}

export async function createProject(
  actor: User,
  input: {
    name: string;
    focus: string;
    dueDate: string;
    priority: Priority;
    color: string;
  },
) {
  if (actor.role !== "Admin") {
    throw new Error("FORBIDDEN");
  }

  const state = await readState();
  const project: Project = {
    id: randomUUID(),
    name: input.name.trim(),
    status: "Planned",
    progress: 8,
    dueDate: input.dueDate,
    ownerId: actor.id,
    memberIds: [actor.id],
    priority: input.priority,
    focus: input.focus.trim(),
    color: input.color,
  };

  state.projects.unshift(project);
  state.activity.unshift({
    id: randomUUID(),
    actorId: actor.id,
    message: `${actor.name} launched ${project.name}`,
    detail: "A new project stream is ready for planning and assignment.",
    timestamp: new Date().toISOString(),
    tone: "success",
  });

  state.activity = state.activity.slice(0, 10);
  await writeState(state);
  return project;
}

export async function inviteMember(
  actor: User,
  input: { name: string; email: string; title: string },
) {
  if (actor.role !== "Admin") {
    throw new Error("FORBIDDEN");
  }

  const state = await readState();
  const user: User = {
    id: randomUUID(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password: "welcome-01",
    role: "Member",
    title: input.title.trim() || "Contributor",
    avatar: input.name
      .split(" ")
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("")
      .slice(0, 2),
    accent: "#f59e0b",
  };

  state.users.unshift(user);
  state.activity.unshift({
    id: randomUUID(),
    actorId: actor.id,
    message: `${actor.name} invited ${user.name}`,
    detail: `The new team member was added with Member access.`,
    timestamp: new Date().toISOString(),
    tone: "info",
  });

  state.activity = state.activity.slice(0, 10);
  await writeState(state);
  return publicUser(user);
}

export async function seedIfNeeded() {
  await readState();
}

export { demoCredentials };