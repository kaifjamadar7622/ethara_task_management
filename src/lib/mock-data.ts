export type Role = "Admin" | "Member";
export type TaskStatus = "Backlog" | "In Progress" | "Review" | "Done";
export type Priority = "Low" | "Medium" | "High" | "Critical";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  title: string;
  avatar: string;
  accent: string;
}

export interface Project {
  id: string;
  name: string;
  status: string;
  progress: number;
  dueDate: string;
  ownerId: string;
  memberIds: string[];
  priority: Priority;
  focus: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  projectId: string;
  assigneeId: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  estimate: string;
  notes: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  actorId: string;
  message: string;
  detail: string;
  timestamp: string;
  tone: "success" | "warning" | "info";
}

export interface StoreState {
  users: User[];
  projects: Project[];
  tasks: Task[];
  activity: Activity[];
}

export interface DashboardMetrics {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  activeProjects: number;
  completionRate: number;
  avgProgress: number;
}

export type PublicUser = Omit<User, "password">;

export interface DashboardPayload {
  user: PublicUser;
  metrics: DashboardMetrics;
  projects: Project[];
  tasks: Task[];
  team: PublicUser[];
  activity: Activity[];
}

export const seedState: StoreState = {
  users: [
    {
      id: "user_maya",
      name: "Maya Chen",
      email: "maya@ethara.ai",
      password: "orbit-82",
      role: "Admin",
      title: "Product Lead",
      avatar: "MC",
      accent: "#22d3ee",
    },
    {
      id: "user_jordan",
      name: "Jordan Lee",
      email: "jordan@ethara.ai",
      password: "spark-14",
      role: "Member",
      title: "Frontend Engineer",
      avatar: "JL",
      accent: "#60a5fa",
    },
    {
      id: "user_priya",
      name: "Priya Shah",
      email: "priya@ethara.ai",
      password: "beam-19",
      role: "Member",
      title: "Design Ops",
      avatar: "PS",
      accent: "#34d399",
    },
  ],
  projects: [
    {
      id: "project_helios",
      name: "Helios Launch",
      status: "On track",
      progress: 78,
      dueDate: "2026-05-18",
      ownerId: "user_maya",
      memberIds: ["user_maya", "user_jordan", "user_priya"],
      priority: "High",
      focus: "Launch the customer onboarding and reporting flow with production polish.",
      color: "#22d3ee",
    },
    {
      id: "project_northstar",
      name: "North Star Ops",
      status: "In review",
      progress: 54,
      dueDate: "2026-05-11",
      ownerId: "user_maya",
      memberIds: ["user_maya", "user_jordan"],
      priority: "Critical",
      focus: "Stabilize admin workflows, permissions, and the escalation pipeline.",
      color: "#60a5fa",
    },
    {
      id: "project_aurora",
      name: "Aurora Insights",
      status: "Shaping",
      progress: 32,
      dueDate: "2026-05-24",
      ownerId: "user_priya",
      memberIds: ["user_maya", "user_priya"],
      priority: "Medium",
      focus: "Design the visual reporting layer for sprint summaries and trends.",
      color: "#34d399",
    },
  ],
  tasks: [
    {
      id: "task_signup",
      title: "Refine signup and login states",
      projectId: "project_helios",
      assigneeId: "user_jordan",
      status: "In Progress",
      priority: "High",
      dueDate: "2026-05-03",
      estimate: "4h",
      notes: "Tighten validation, empty states, and button loading feedback.",
      createdAt: "2026-05-01T08:12:00Z",
    },
    {
      id: "task_dashboard",
      title: "Implement dashboard KPI cards",
      projectId: "project_northstar",
      assigneeId: "user_maya",
      status: "Review",
      priority: "Critical",
      dueDate: "2026-05-02",
      estimate: "5h",
      notes: "Wire completion, overdue, and throughput metrics into the overview.",
      createdAt: "2026-04-30T13:20:00Z",
    },
    {
      id: "task_tasks_api",
      title: "Create task assignment API",
      projectId: "project_northstar",
      assigneeId: "user_jordan",
      status: "Backlog",
      priority: "High",
      dueDate: "2026-05-06",
      estimate: "3h",
      notes: "Add validation, project lookup, and role-based permissions.",
      createdAt: "2026-04-29T16:45:00Z",
    },
    {
      id: "task_design",
      title: "Polish the task board visual system",
      projectId: "project_aurora",
      assigneeId: "user_priya",
      status: "Done",
      priority: "Medium",
      dueDate: "2026-04-30",
      estimate: "2h",
      notes: "Refined spacing, chip styles, and team activity cards.",
      createdAt: "2026-04-27T09:30:00Z",
    },
    {
      id: "task_railway",
      title: "Prepare Railway deployment config",
      projectId: "project_helios",
      assigneeId: "user_maya",
      status: "In Progress",
      priority: "Critical",
      dueDate: "2026-05-01",
      estimate: "2h",
      notes: "Finalize env vars, runtime, and production start command.",
      createdAt: "2026-05-01T06:50:00Z",
    },
    {
      id: "task_qa",
      title: "Write demo script and checklist",
      projectId: "project_aurora",
      assigneeId: "user_priya",
      status: "Review",
      priority: "Medium",
      dueDate: "2026-05-04",
      estimate: "2h",
      notes: "Create a 25 minute walkthrough with selection-ready highlights.",
      createdAt: "2026-04-30T18:15:00Z",
    },
  ],
  activity: [
    {
      id: "activity_1",
      actorId: "user_maya",
      message: "Maya created the dashboard KPI workstream",
      detail: "The overview now has a premium metric layer and overdue radar.",
      timestamp: "2026-05-01T09:10:00Z",
      tone: "success",
    },
    {
      id: "activity_2",
      actorId: "user_jordan",
      message: "Jordan moved the login refinement into progress",
      detail: "Validation and loading states are now part of the auth flow.",
      timestamp: "2026-05-01T08:35:00Z",
      tone: "info",
    },
    {
      id: "activity_3",
      actorId: "user_priya",
      message: "Priya completed the task board visual polish",
      detail: "Glass cards, rounded panels, and status chips were refined.",
      timestamp: "2026-04-30T17:42:00Z",
      tone: "success",
    },
    {
      id: "activity_4",
      actorId: "user_maya",
      message: "Railway deployment prep is underway",
      detail: "Runtime and production startup details are being finalized.",
      timestamp: "2026-05-01T06:55:00Z",
      tone: "warning",
    },
    {
      id: "activity_5",
      actorId: "user_jordan",
      message: "Task API validation rules were expanded",
      detail: "Project lookup, assignment checks, and role permissions now apply.",
      timestamp: "2026-04-29T20:10:00Z",
      tone: "info",
    },
    {
      id: "activity_6",
      actorId: "user_maya",
      message: "Selection-ready demo flow has been assembled",
      detail: "Auth, projects, tasks, team, and dashboard interactions are linked.",
      timestamp: "2026-04-29T19:25:00Z",
      tone: "success",
    },
  ],
};

export const demoCredentials = [
  { name: "Maya Chen", email: "maya@ethara.ai", password: "orbit-82", role: "Admin" as Role },
  { name: "Jordan Lee", email: "jordan@ethara.ai", password: "spark-14", role: "Member" as Role },
];

export function publicUser(user: User): PublicUser {
  const { password, ...rest } = user;
  return rest;
}

export function publicUsers(users: User[]): PublicUser[] {
  return users.map(publicUser);
}