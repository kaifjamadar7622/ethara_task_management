import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { randomUUID } from "node:crypto";
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

type SQLiteDB = Database.Database;

const databasePath = resolveDatabasePath();
ensureParentDirectory(databasePath);

const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");

let initializationPromise: Promise<void> | null = null;

function resolveDatabasePath() {
  const configured = process.env.SQLITE_PATH?.trim();
  if (configured) {
    return isAbsolute(configured) ? configured : join(process.cwd(), configured);
  }

  return join(process.cwd(), "data", "ethara.sqlite");
}

function ensureParentDirectory(filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true });
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
    projects.reduce((total, project) => total + project.progress, 0) / Math.max(projects.length, 1),
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

function ensureSchema(connection: SQLiteDB) {
  connection.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      title TEXT NOT NULL,
      avatar TEXT NOT NULL,
      accent TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      progress INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      member_ids TEXT NOT NULL DEFAULT '[]',
      priority TEXT NOT NULL,
      focus TEXT NOT NULL,
      color TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      project_id TEXT NOT NULL,
      assignee_id TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      due_date TEXT NOT NULL,
      estimate TEXT NOT NULL,
      notes TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      message TEXT NOT NULL,
      detail TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      tone TEXT NOT NULL,
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

function toTextArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }

  return [];
}

function mapUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    role: row.role,
    title: row.title,
    avatar: row.avatar,
    accent: row.accent,
  };
}

function mapProject(row: any): Project {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    progress: Number(row.progress),
    dueDate: row.due_date,
    ownerId: row.owner_id,
    memberIds: toTextArray(row.member_ids),
    priority: row.priority,
    focus: row.focus,
    color: row.color,
  };
}

function mapTask(row: any): Task {
  return {
    id: row.id,
    title: row.title,
    projectId: row.project_id,
    assigneeId: row.assignee_id,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    estimate: row.estimate,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapActivity(row: any): StoreState["activity"][number] {
  return {
    id: row.id,
    actorId: row.actor_id,
    message: row.message,
    detail: row.detail,
    timestamp: row.timestamp,
    tone: row.tone,
  };
}

function readAllState(): StoreState {
  const users = db.prepare("SELECT * FROM users ORDER BY name ASC").all().map(mapUser);
  const projects = db.prepare("SELECT * FROM projects ORDER BY due_date ASC").all().map(mapProject);
  const tasks = db.prepare("SELECT * FROM tasks ORDER BY due_date ASC").all().map(mapTask);
  const activity = db.prepare("SELECT * FROM activity ORDER BY timestamp DESC").all().map(mapActivity);

  return { users, projects, tasks, activity };
}

function insertState(state: StoreState) {
  const insertUser = db.prepare(
    `
      INSERT INTO users (id, name, email, password, role, title, avatar, accent)
      VALUES (@id, @name, @email, @password, @role, @title, @avatar, @accent)
    `,
  );
  const insertProject = db.prepare(
    `
      INSERT INTO projects (id, name, status, progress, due_date, owner_id, member_ids, priority, focus, color)
      VALUES (@id, @name, @status, @progress, @dueDate, @ownerId, @memberIds, @priority, @focus, @color)
    `,
  );
  const insertTask = db.prepare(
    `
      INSERT INTO tasks (id, title, project_id, assignee_id, status, priority, due_date, estimate, notes, created_at)
      VALUES (@id, @title, @projectId, @assigneeId, @status, @priority, @dueDate, @estimate, @notes, @createdAt)
    `,
  );
  const insertActivity = db.prepare(
    `
      INSERT INTO activity (id, actor_id, message, detail, timestamp, tone)
      VALUES (@id, @actorId, @message, @detail, @timestamp, @tone)
    `,
  );

  const transaction = db.transaction((currentState: StoreState) => {
    db.exec("DELETE FROM activity; DELETE FROM tasks; DELETE FROM projects; DELETE FROM users;");

    for (const user of currentState.users) {
      insertUser.run(user);
    }

    for (const project of currentState.projects) {
      insertProject.run({ ...project, memberIds: JSON.stringify(project.memberIds) });
    }

    for (const task of currentState.tasks) {
      insertTask.run(task);
    }

    for (const item of currentState.activity) {
      insertActivity.run(item);
    }
  });

  transaction(state);
}

async function initialize() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      ensureSchema(db);
      const row = db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number } | undefined;
      if ((row?.count ?? 0) === 0) {
        insertState(seedState);
      }
    })();
  }

  await initializationPromise;
}

async function findUserByEmail(email: string) {
  await initialize();
  const row = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1").get(email);
  return row ?? null;
}

async function findUserById(id: string) {
  await initialize();
  const row = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(id);
  return row ?? null;
}

function mapStateUser(row: any): User {
  return mapUser(row);
}

export async function loadStore() {
  await initialize();
  return readAllState();
}

export async function saveStore(state: StoreState) {
  await initialize();
  insertState(state);
}

export async function getUserByEmail(email: string) {
  const row = await findUserByEmail(email);
  return row ? mapStateUser(row) : null;
}

export async function getUserById(id: string) {
  const row = await findUserById(id);
  return row ? mapStateUser(row) : null;
}

export async function authenticate(email: string, password: string) {
  const user = await getUserByEmail(email);
  if (!user || user.password !== password) {
    return null;
  }

  return user;
}

export async function buildDashboard(user: User): Promise<DashboardPayload> {
  await initialize();
  const state = readAllState();
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

  await initialize();

  const project = db.prepare("SELECT id, name FROM projects WHERE id = ? LIMIT 1").get(input.projectId) as
    | { id: string; name: string }
    | undefined;
  const assignee = db.prepare("SELECT id, name FROM users WHERE id = ? LIMIT 1").get(input.assigneeId) as
    | { id: string; name: string }
    | undefined;

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

  const insertTask = db.prepare(
    `
      INSERT INTO tasks (id, title, project_id, assignee_id, status, priority, due_date, estimate, notes, created_at)
      VALUES (@id, @title, @projectId, @assigneeId, @status, @priority, @dueDate, @estimate, @notes, @createdAt)
    `,
  );
  const insertActivity = db.prepare(
    `
      INSERT INTO activity (id, actor_id, message, detail, timestamp, tone)
      VALUES (@id, @actorId, @message, @detail, @timestamp, @tone)
    `,
  );

  const transaction = db.transaction(() => {
    insertTask.run(task);
    insertActivity.run({
      id: randomUUID(),
      actorId: actor.id,
      message: `${actor.name} created ${task.title}`,
      detail: `Assigned to ${assignee.name} inside ${project.name}.`,
      timestamp: new Date().toISOString(),
      tone: "success",
    });
  });

  transaction();
  return task;
}

export async function updateTaskStatus(actor: User, input: { taskId: string; status: TaskStatus }) {
  await initialize();
  const task = db.prepare(
    "SELECT id, title, project_id, assignee_id, status, priority, due_date, estimate, notes, created_at FROM tasks WHERE id = ? LIMIT 1",
  ).get(input.taskId) as
    | {
        id: string;
        title: string;
        project_id: string;
        assignee_id: string;
        status: TaskStatus;
        priority: Task["priority"];
        due_date: string;
        estimate: string;
        notes: string;
        created_at: string;
      }
    | undefined;

  if (!task) {
    throw new Error("NOT_FOUND");
  }

  if (actor.role !== "Admin" && task.assignee_id !== actor.id) {
    throw new Error("FORBIDDEN");
  }

  const updateTask = db.prepare("UPDATE tasks SET status = ? WHERE id = ?");
  const insertActivity = db.prepare(
    `
      INSERT INTO activity (id, actor_id, message, detail, timestamp, tone)
      VALUES (@id, @actorId, @message, @detail, @timestamp, @tone)
    `,
  );

  const transaction = db.transaction(() => {
    updateTask.run(input.status, input.taskId);
    insertActivity.run({
      id: randomUUID(),
      actorId: actor.id,
      message: `${actor.name} moved ${task.title} to ${input.status}`,
      detail: "The task now reflects the latest delivery state.",
      timestamp: new Date().toISOString(),
      tone: input.status === "Done" ? "success" : "info",
    });
  });

  transaction();

  return {
    id: task.id,
    title: task.title,
    projectId: task.project_id,
    assigneeId: task.assignee_id,
    status: input.status,
    priority: task.priority,
    dueDate: task.due_date,
    estimate: task.estimate,
    notes: task.notes,
    createdAt: task.created_at,
  } as Task;
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

  await initialize();

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

  const insertProject = db.prepare(
    `
      INSERT INTO projects (id, name, status, progress, due_date, owner_id, member_ids, priority, focus, color)
      VALUES (@id, @name, @status, @progress, @dueDate, @ownerId, @memberIds, @priority, @focus, @color)
    `,
  );
  const insertActivity = db.prepare(
    `
      INSERT INTO activity (id, actor_id, message, detail, timestamp, tone)
      VALUES (@id, @actorId, @message, @detail, @timestamp, @tone)
    `,
  );

  const transaction = db.transaction(() => {
    insertProject.run({ ...project, memberIds: JSON.stringify(project.memberIds) });
    insertActivity.run({
      id: randomUUID(),
      actorId: actor.id,
      message: `${actor.name} launched ${project.name}`,
      detail: "A new project stream is ready for planning and assignment.",
      timestamp: new Date().toISOString(),
      tone: "success",
    });
  });

  transaction();
  return project;
}

export async function inviteMember(actor: User, input: { name: string; email: string; title: string }) {
  if (actor.role !== "Admin") {
    throw new Error("FORBIDDEN");
  }

  await initialize();

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

  const insertUser = db.prepare(
    `
      INSERT INTO users (id, name, email, password, role, title, avatar, accent)
      VALUES (@id, @name, @email, @password, @role, @title, @avatar, @accent)
    `,
  );
  const insertActivity = db.prepare(
    `
      INSERT INTO activity (id, actor_id, message, detail, timestamp, tone)
      VALUES (@id, @actorId, @message, @detail, @timestamp, @tone)
    `,
  );

  const transaction = db.transaction(() => {
    insertUser.run(user);
    insertActivity.run({
      id: randomUUID(),
      actorId: actor.id,
      message: `${actor.name} invited ${user.name}`,
      detail: "The new team member was added with Member access.",
      timestamp: new Date().toISOString(),
      tone: "info",
    });
  });

  transaction();
  return publicUser(user);
}

export async function seedIfNeeded() {
  await initialize();
}

export { demoCredentials };