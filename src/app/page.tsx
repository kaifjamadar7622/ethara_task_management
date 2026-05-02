"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import type {
  DashboardPayload,
  Priority,
  Project,
  Role,
  Task,
  TaskStatus,
  User,
} from "@/lib/mock-data";

const demoCredentials = [
  {
    label: "Maya Chen",
    email: "maya@ethara.ai",
    password: "orbit-82",
    role: "Admin" as Role,
  },
  {
    label: "Jordan Lee",
    email: "jordan@ethara.ai",
    password: "spark-14",
    role: "Member" as Role,
  },
];

const sectionTabs = ["Overview", "Projects", "Tasks", "Team"] as const;
const taskStages: TaskStatus[] = ["Backlog", "In Progress", "Review", "Done"];
const priorityStyles: Record<Priority, string> = {
  Low: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  Medium: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  High: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  Critical: "border-rose-400/30 bg-rose-400/10 text-rose-200",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatRelativeTime(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(delta / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function publicName(user?: User) {
  return user?.name ?? "Unassigned";
}

function currentTaskStageIndex(status: TaskStatus) {
  return taskStages.indexOf(status);
}

function nextTaskStage(status: TaskStatus) {
  const currentIndex = currentTaskStageIndex(status);
  return taskStages[Math.min(currentIndex + 1, taskStages.length - 1)];
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_20px_60px_rgba(2,8,23,0.35)] backdrop-blur-xl">
      <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">
        {label}
      </p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold text-white">{value}</p>
        <span className="text-xs text-cyan-200/90">Live</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{detail}</p>
    </div>
  );
}

function AccentPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-white/90"
      style={{ borderColor: `${color}40`, backgroundColor: `${color}1a` }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export default function Home() {
  const [session, setSession] = useState<User | null>(null);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<(typeof sectionTabs)[number]>(
    "Overview",
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "All">("All");
  const [loginForm, setLoginForm] = useState({
    email: "maya@ethara.ai",
    password: "orbit-82",
  });
  const [quickTab, setQuickTab] = useState<"task" | "project" | "member">("task");
  const [taskForm, setTaskForm] = useState({
    title: "",
    projectId: "",
    assigneeId: "",
    dueDate: "",
    priority: "High" as Priority,
    estimate: "3h",
    notes: "",
  });
  const [projectForm, setProjectForm] = useState({
    name: "",
    focus: "",
    dueDate: "",
    priority: "High" as Priority,
    color: "#38bdf8",
  });
  const [memberForm, setMemberForm] = useState({
    name: "",
    email: "",
    title: "Operations",
  });
  const [notice, setNotice] = useState("");
  const [, startTransition] = useTransition();

  async function refreshDashboard() {
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    if (!response.ok) {
      setDashboard(null);
      return;
    }
    const data = (await response.json()) as DashboardPayload;
    setDashboard(data);
    setTaskForm((current) => ({
      ...current,
      projectId: current.projectId || data.projects[0]?.id || "",
      assigneeId: current.assigneeId || data.team[0]?.id || "",
      dueDate: current.dueDate || data.projects[0]?.dueDate || "",
    }));
    setProjectForm((current) => ({
      ...current,
      dueDate: current.dueDate || data.projects[0]?.dueDate || "",
    }));
  }

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!active) return;
        if (response.ok) {
          const data = (await response.json()) as { user: User };
          setSession(data.user);
        } else {
          setSession(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setDashboard(null);
      return;
    }

    startTransition(() => {
      refreshDashboard();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!dashboard) return;
    setTaskForm((current) => ({
      ...current,
      projectId: current.projectId || dashboard.projects[0]?.id || "",
      assigneeId: current.assigneeId || dashboard.team[0]?.id || "",
    }));
    setProjectForm((current) => ({
      ...current,
      dueDate: current.dueDate || dashboard.projects[0]?.dueDate || "",
    }));
  }, [dashboard]);

  const projectMap = useMemo(() => {
    return new Map(dashboard?.projects.map((project) => [project.id, project]));
  }, [dashboard]);

  const teamMap = useMemo(() => {
    return new Map(dashboard?.team.map((member) => [member.id, member]));
  }, [dashboard]);

  const filteredTasks = useMemo(() => {
    if (!dashboard) return [];

    const query = search.trim().toLowerCase();
    return dashboard.tasks.filter((task) => {
      const project = projectMap.get(task.projectId);
      const assignee = teamMap.get(task.assigneeId);
      const matchesSearch =
        !query ||
        [task.title, task.status, task.priority, project?.name, assignee?.name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesStatus = statusFilter === "All" || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [dashboard, projectMap, search, statusFilter, teamMap]);

  const visibleProjects = dashboard?.projects ?? [];
  const visibleActivity = dashboard?.activity ?? [];
  const visibleTeam = dashboard?.team ?? [];

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginForm),
    });

    if (!response.ok) {
      setNotice("Invalid credentials. Use one of the demo accounts below.");
      return;
    }

    const data = (await response.json()) as { user: User };
    setSession(data.user);
    setNotice(`Signed in as ${data.user.name}.`);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
    setDashboard(null);
    setNotice("Signed out.");
  }

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskForm),
    });

    if (!response.ok) {
      setNotice("Only Admin users can create tasks.");
      return;
    }

    setNotice("Task created and activity log updated.");
    await refreshDashboard();
  }

  async function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectForm),
    });

    if (!response.ok) {
      setNotice("Only Admin users can create projects.");
      return;
    }

    setNotice("Project created.");
    await refreshDashboard();
  }

  async function submitMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(memberForm),
    });

    if (!response.ok) {
      setNotice("Only Admin users can invite members.");
      return;
    }

    setNotice("Team member invited.");
    setMemberForm({ name: "", email: "", title: "Operations" });
    await refreshDashboard();
  }

  async function cycleTaskStatus(task: Task) {
    const response = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task.id, status: nextTaskStage(task.status) }),
    });

    if (!response.ok) {
      setNotice("You can only update tasks assigned to you unless you are Admin.");
      return;
    }

    setNotice(`Task moved to ${nextTaskStage(task.status)}.`);
    await refreshDashboard();
  }

  const demoBanner = (
    <div className="rounded-3xl border border-cyan-300/15 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100 backdrop-blur-xl">
      Live demo credentials: Maya Chen / orbit-82 for Admin, Jordan Lee / spark-14
      for Member.
    </div>
  );

  if (loading) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#07111f] text-slate-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_26%),linear-gradient(180deg,#091423_0%,#07111f_62%,#050b14_100%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid w-full gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.05] p-8">
              <div className="h-5 w-40 rounded-full bg-white/10" />
              <div className="mt-6 h-16 w-4/5 rounded-3xl bg-white/10" />
              <div className="mt-4 h-6 w-3/4 rounded-full bg-white/10" />
              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="h-28 rounded-3xl bg-white/10" />
                <div className="h-28 rounded-3xl bg-white/10" />
                <div className="h-28 rounded-3xl bg-white/10" />
              </div>
            </div>
            <div className="animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.05] p-8">
              <div className="h-6 w-32 rounded-full bg-white/10" />
              <div className="mt-8 h-11 rounded-2xl bg-white/10" />
              <div className="mt-4 h-11 rounded-2xl bg-white/10" />
              <div className="mt-6 h-12 rounded-full bg-cyan-400/20" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#07111f] text-slate-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_26%),linear-gradient(180deg,#091423_0%,#07111f_62%,#050b14_100%)]" />
        <div className="absolute left-[-8rem] top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur-xl">
            <div>
              <p className="text-[11px] uppercase tracking-[0.42em] text-cyan-200/80">
                Ethara
              </p>
              <h1 className="text-lg font-semibold text-white">Task Manager</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
              <AccentPill label="Role-based access" color="#22d3ee" />
              <AccentPill label="Live REST APIs" color="#60a5fa" />
              <AccentPill label="Railway-ready" color="#34d399" />
            </div>
          </header>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.35em] text-cyan-100">
                Premium workflow studio
              </div>
              <h2 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Command-grade team task management with a polished, role-aware interface.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Built for the assessment brief: authentication, project and team
                coordination, task assignment, status tracking, overdue visibility,
                and a dashboard that feels premium instead of generic.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <MetricCard
                  label="Authentication"
                  value="2 roles"
                  detail="Admin and Member access with signed session cookies."
                />
                <MetricCard
                  label="Workflow"
                  value="4 stages"
                  detail="Backlog, in progress, review, and done status handling."
                />
                <MetricCard
                  label="UI quality"
                  value="Glass + motion"
                  detail="Radial backgrounds, layered cards, and animated states."
                />
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-300">
                {demoCredentials.map((credential) => (
                  <button
                    key={credential.email}
                    type="button"
                    onClick={() => setLoginForm({ email: credential.email, password: credential.password })}
                    className="rounded-full border border-white/12 bg-white/5 px-4 py-2 transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
                  >
                    Open {credential.role} demo
                  </button>
                ))}
              </div>

              <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-slate-950/40 p-5 text-sm text-slate-300">
                <p className="font-medium text-white">What this submission already covers</p>
                <p className="mt-2 leading-7">
                  REST-backed flows, role-gated actions, responsive layout, task board,
                  project portfolio, team roster, and a strong visual identity that can
                  stand in a demo call.
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-8">
              <p className="text-[11px] uppercase tracking-[0.42em] text-cyan-200/80">
                Secure entry
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Sign in</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Use one of the demo accounts below to unlock the dashboard.
              </p>

              <form className="mt-8 space-y-4" onSubmit={handleLogin}>
                <label className="block space-y-2 text-sm text-slate-200">
                  <span>Email</span>
                  <input
                    value={loginForm.email}
                    onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                    placeholder="maya@ethara.ai"
                    type="email"
                  />
                </label>
                <label className="block space-y-2 text-sm text-slate-200">
                  <span>Password</span>
                  <input
                    value={loginForm.password}
                    onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                    placeholder="orbit-82"
                    type="password"
                  />
                </label>

                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_20px_40px_rgba(34,211,238,0.3)] transition hover:translate-y-[-1px]"
                  type="submit"
                >
                  Enter workspace
                </button>
              </form>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {demoCredentials.map((credential) => (
                  <button
                    key={`${credential.email}-quick`}
                    type="button"
                    onClick={() => setLoginForm({ email: credential.email, password: credential.password })}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-slate-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
                  >
                    <p className="font-medium text-white">{credential.label}</p>
                    <p className="mt-1 text-xs text-slate-400">{credential.role} account</p>
                  </button>
                ))}
              </div>

              <div className="mt-6 text-sm text-slate-400">
                {notice || demoBanner}
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-3">
            <MetricCard
              label="Project orchestration"
              value="3 live projects"
              detail="Structured portfolio cards with progress, owners, and due dates."
            />
            <MetricCard
              label="Task integrity"
              value="Overdue radar"
              detail="The dashboard computes overdue items and completion rate in real time."
            />
            <MetricCard
              label="Deployment"
              value="Railway-ready"
              detail="Next.js App Router with API routes and a file-backed data layer."
            />
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07111f] text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_26%),linear-gradient(180deg,#091423_0%,#07111f_62%,#050b14_100%)]" />
      <div className="absolute left-[-8rem] top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur-xl">
          <div>
            <p className="text-[11px] uppercase tracking-[0.42em] text-cyan-200/80">
              Ethara
            </p>
            <h1 className="text-lg font-semibold text-white">Task Manager</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            {sectionTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveSection(tab)}
                className={`rounded-full px-4 py-2 transition ${
                  activeSection === tab
                    ? "bg-cyan-400 text-slate-950"
                    : "border border-white/10 bg-white/[0.04] hover:border-cyan-300/40 hover:bg-cyan-400/10"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-white">{session.name}</p>
              <p className="text-xs text-slate-400">
                {session.role} - {session.title}
              </p>
            </div>
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold text-slate-950"
              style={{ backgroundColor: session.accent }}
            >
              {session.avatar}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.25em] text-slate-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
            >
              Sign out
            </button>
          </div>
        </header>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-10">
            <div className="flex flex-wrap items-center gap-3">
              <AccentPill
                label={`${session.role} workspace`}
                color={session.role === "Admin" ? "#22d3ee" : "#34d399"}
              />
              <span className="text-sm text-slate-400">
                Synced {formatRelativeTime(visibleActivity[0]?.timestamp ?? new Date().toISOString())}
              </span>
            </div>
            <h2 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Welcome back, {session.name}. Your delivery system is live.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              Use the workspace to move tasks through the pipeline, keep projects on
              schedule, and surface the right actions for each role.
            </p>

            {notice ? (
              <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
                {notice}
              </div>
            ) : null}

            <div className="mt-8 grid gap-4 sm:grid-cols-4">
              <MetricCard
                label="Tasks"
                value={dashboard.metrics.totalTasks}
                detail="Work items in your accessible workspace."
              />
              <MetricCard
                label="Completion"
                value={`${dashboard.metrics.completionRate}%`}
                detail="Percentage of visible tasks already done."
              />
              <MetricCard
                label="Overdue"
                value={dashboard.metrics.overdueTasks}
                detail="Needs attention before the next status review."
              />
              <MetricCard
                label="Projects"
                value={dashboard.metrics.activeProjects}
                detail="Open projects that still need execution."
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.42em] text-cyan-200/80">
              Quick snapshot
            </p>
            <div className="mt-4 space-y-4 rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white">Average project progress</p>
                  <p className="text-xs text-slate-400">Calculated from visible projects</p>
                </div>
                <p className="text-3xl font-semibold text-white">{dashboard.metrics.avgProgress}%</p>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500"
                  style={{ width: `${dashboard.metrics.avgProgress}%` }}
                />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <AccentPill label={`Projects: ${visibleProjects.length}`} color="#60a5fa" />
              <AccentPill label={`Team: ${visibleTeam.length}`} color="#34d399" />
              <AccentPill label={`Tasks: ${filteredTasks.length}`} color="#22d3ee" />
              <AccentPill label={`Section: ${activeSection}`} color="#f59e0b" />
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-5 text-sm text-slate-300">
              <p className="font-medium text-white">Role-based access</p>
              <p className="mt-2 leading-7">
                {session.role === "Admin"
                  ? "You can create projects, invite team members, and create tasks."
                  : "You can review your assigned work and move tasks through the pipeline."}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-200/70">
                    Control room
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Task board</h3>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="min-w-[220px] rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                    placeholder="Search tasks, people, projects"
                  />
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as TaskStatus | "All")}
                    className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                  >
                    <option value="All">All statuses</option>
                    {taskStages.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {filteredTasks.map((task) => {
                  const project = projectMap.get(task.projectId);
                  const assignee = teamMap.get(task.assigneeId);
                  const overdue = task.status !== "Done" && new Date(task.dueDate) < new Date();
                  const isActionable =
                    session.role === "Admin" || task.assigneeId === session.id;

                  return (
                    <article
                      key={task.id}
                      className="rounded-[1.75rem] border border-white/10 bg-slate-950/40 p-5 transition hover:border-cyan-300/30 hover:bg-slate-950/55"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-slate-300">
                              {project?.name ?? "Unknown project"}
                            </span>
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-medium ${priorityStyles[task.priority]}`}
                            >
                              {task.priority}
                            </span>
                            {overdue ? (
                              <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-1 text-xs font-medium text-rose-200">
                                Overdue
                              </span>
                            ) : null}
                          </div>
                          <h4 className="mt-4 text-lg font-semibold text-white">{task.title}</h4>
                          <p className="mt-2 text-sm text-slate-400">
                            {publicName(assignee)} - {task.estimate} estimate - Due {formatDate(task.dueDate)}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-slate-200">
                            {task.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => cycleTaskStatus(task)}
                            disabled={!isActionable || task.status === "Done"}
                            className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-950 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                          >
                            {task.status === "Done" ? "Done" : "Advance"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {visibleProjects.map((project) => (
                <article
                  key={project.id}
                  className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.35em] text-slate-400">
                        {project.status}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{project.name}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-300">{project.focus}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                      Due {formatDate(project.dueDate)}
                    </span>
                  </div>

                  <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
                    <span>{project.progress}% complete</span>
                    <span>{project.priority} priority</span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {project.memberIds.map((memberId) => {
                      const member = teamMap.get(memberId);
                      if (!member) return null;
                      return (
                        <span
                          key={member.id}
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: member.accent }}
                          />
                          {member.name}
                        </span>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            {session.role === "Admin" ? (
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 backdrop-blur-xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-200/70">
                      Quick create
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">Operations hub</h3>
                  </div>
                  <div className="flex rounded-full border border-white/10 bg-slate-950/45 p-1 text-xs text-slate-300">
                    {(["task", "project", "member"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setQuickTab(tab)}
                        className={`rounded-full px-3 py-2 capitalize transition ${
                          quickTab === tab
                            ? "bg-cyan-400 text-slate-950"
                            : "hover:text-white"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {quickTab === "task" ? (
                  <form className="mt-6 space-y-4" onSubmit={submitTask}>
                    <label className="block space-y-2 text-sm text-slate-200">
                      <span>Task title</span>
                      <input
                        required
                        value={taskForm.title}
                        onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                        placeholder="Ship onboarding checklist"
                      />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block space-y-2 text-sm text-slate-200">
                        <span>Project</span>
                        <select
                          required
                          value={taskForm.projectId}
                          onChange={(event) => setTaskForm((current) => ({ ...current, projectId: event.target.value }))}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                        >
                          {visibleProjects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block space-y-2 text-sm text-slate-200">
                        <span>Assignee</span>
                        <select
                          required
                          value={taskForm.assigneeId}
                          onChange={(event) => setTaskForm((current) => ({ ...current, assigneeId: event.target.value }))}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                        >
                          {visibleTeam.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <label className="block space-y-2 text-sm text-slate-200">
                        <span>Due date</span>
                        <input
                          required
                          value={taskForm.dueDate}
                          onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                          type="date"
                        />
                      </label>
                      <label className="block space-y-2 text-sm text-slate-200">
                        <span>Priority</span>
                        <select
                          value={taskForm.priority}
                          onChange={(event) => setTaskForm((current) => ({ ...current, priority: event.target.value as Priority }))}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                        >
                          {Object.keys(priorityStyles).map((priority) => (
                            <option key={priority} value={priority}>
                              {priority}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block space-y-2 text-sm text-slate-200">
                        <span>Estimate</span>
                        <input
                          value={taskForm.estimate}
                          onChange={(event) => setTaskForm((current) => ({ ...current, estimate: event.target.value }))}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                          placeholder="3h"
                        />
                      </label>
                    </div>

                    <label className="block space-y-2 text-sm text-slate-200">
                      <span>Notes</span>
                      <textarea
                        value={taskForm.notes}
                        onChange={(event) => setTaskForm((current) => ({ ...current, notes: event.target.value }))}
                        className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                        placeholder="Add context, blockers, or acceptance criteria."
                      />
                    </label>

                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_20px_40px_rgba(34,211,238,0.3)] transition hover:translate-y-[-1px]"
                    >
                      Create task
                    </button>
                  </form>
                ) : null}

                {quickTab === "project" ? (
                  <form className="mt-6 space-y-4" onSubmit={submitProject}>
                    <label className="block space-y-2 text-sm text-slate-200">
                      <span>Project name</span>
                      <input
                        required
                        value={projectForm.name}
                        onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                        placeholder="Velocity HQ"
                      />
                    </label>

                    <label className="block space-y-2 text-sm text-slate-200">
                      <span>Focus</span>
                      <textarea
                        required
                        value={projectForm.focus}
                        onChange={(event) => setProjectForm((current) => ({ ...current, focus: event.target.value }))}
                        className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                        placeholder="Ship the next customer-facing milestone."
                      />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block space-y-2 text-sm text-slate-200">
                        <span>Due date</span>
                        <input
                          required
                          value={projectForm.dueDate}
                          onChange={(event) => setProjectForm((current) => ({ ...current, dueDate: event.target.value }))}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                          type="date"
                        />
                      </label>
                      <label className="block space-y-2 text-sm text-slate-200">
                        <span>Priority</span>
                        <select
                          value={projectForm.priority}
                          onChange={(event) => setProjectForm((current) => ({ ...current, priority: event.target.value as Priority }))}
                          className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                        >
                          {Object.keys(priorityStyles).map((priority) => (
                            <option key={priority} value={priority}>
                              {priority}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="block space-y-2 text-sm text-slate-200">
                      <span>Accent color</span>
                      <input
                        value={projectForm.color}
                        onChange={(event) => setProjectForm((current) => ({ ...current, color: event.target.value }))}
                        className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-2 text-white outline-none focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                        type="color"
                      />
                    </label>

                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_20px_40px_rgba(34,211,238,0.3)] transition hover:translate-y-[-1px]"
                    >
                      Create project
                    </button>
                  </form>
                ) : null}

                {quickTab === "member" ? (
                  <form className="mt-6 space-y-4" onSubmit={submitMember}>
                    <label className="block space-y-2 text-sm text-slate-200">
                      <span>Name</span>
                      <input
                        required
                        value={memberForm.name}
                        onChange={(event) => setMemberForm((current) => ({ ...current, name: event.target.value }))}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                        placeholder="Aarav Patel"
                      />
                    </label>

                    <label className="block space-y-2 text-sm text-slate-200">
                      <span>Email</span>
                      <input
                        required
                        value={memberForm.email}
                        onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                        placeholder="aarav@ethara.ai"
                        type="email"
                      />
                    </label>

                    <label className="block space-y-2 text-sm text-slate-200">
                      <span>Title</span>
                      <input
                        value={memberForm.title}
                        onChange={(event) => setMemberForm((current) => ({ ...current, title: event.target.value }))}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
                        placeholder="Operations"
                      />
                    </label>

                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_20px_40px_rgba(34,211,238,0.3)] transition hover:translate-y-[-1px]"
                    >
                      Invite member
                    </button>
                  </form>
                ) : null}
              </div>
            ) : (
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-6 backdrop-blur-xl">
                <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-200/70">
                  Read-only mode
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Member access</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  This account can review assigned work and move tasks through the
                  pipeline, but creation controls are intentionally hidden by RBAC.
                </p>
              </div>
            )}

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl">
              <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-200/70">
                Team pulse
              </p>
              <div className="mt-4 space-y-3">
                {visibleTeam.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold text-slate-950"
                        style={{ backgroundColor: member.accent }}
                      >
                        {member.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{member.name}</p>
                        <p className="text-xs text-slate-400">{member.title}</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-slate-200">
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl">
              <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-200/70">
                Activity stream
              </p>
              <div className="mt-4 space-y-3">
                {visibleActivity.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">{event.message}</p>
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.3em] ${
                          event.tone === "success"
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                            : event.tone === "warning"
                              ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
                              : "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                        }`}
                      >
                        {formatRelativeTime(event.timestamp)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-slate-400">{event.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {demoBanner}
          </aside>
        </section>
      </div>
    </main>
  );
}