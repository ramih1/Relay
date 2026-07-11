"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  Bell,
  Bot,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  Clock3,
  Palette,
  Home,
  Mail,
  MoonStar,
  PhoneCall,
  Search,
  Send,
  Settings,
  Sparkles,
  StickyNote,
  SunMedium,
  Trash2,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type {
  CalendarEvent,
  DashboardInsightSnapshot,
  EmailDraft,
  NavKey,
  Note,
  NotificationItem,
  PendingAction,
  Reminder,
  Task,
  ThemeName,
} from "@/lib/types";
import { useRelay } from "@/components/relay-provider";

const navItems: { key: NavKey; label: string; href: string; icon: ComponentType<{ className?: string }> }[] = [
  { key: "dashboard", label: "Dashboard", href: "/", icon: Home },
  { key: "assistant", label: "Assistant", href: "/assistant", icon: Bot },
  { key: "tasks", label: "Tasks", href: "/tasks", icon: ClipboardList },
  { key: "notes", label: "Notes", href: "/notes", icon: StickyNote },
  { key: "reminders", label: "Reminders", href: "/reminders", icon: Clock3 },
  { key: "calendar", label: "Calendar", href: "/calendar", icon: CalendarDays },
  { key: "calls", label: "Calls", href: "/calls", icon: PhoneCall },
  { key: "confirmations", label: "Confirmations", href: "/confirmations", icon: CheckCheck },
  { key: "notifications", label: "Notifications", href: "/notifications", icon: Bell },
  { key: "settings", label: "Settings", href: "/settings", icon: Settings },
];

const commandSamples = [
  "Remind me to submit my project Friday at 5",
  "Draft an email to my professor asking for an extension",
  "Turn this note into tasks",
  "Call the gym and ask if the basketball court is free tonight",
  "Plan my day around my 3 PM meeting",
  "Summarize notifications",
];

const mobileNavItems = navItems.slice(0, 5);

const confirmationTabs = ["pending", "approved", "cancelled"] as const;
type ConfirmationTab = (typeof confirmationTabs)[number];
const themeOptions = [
  { key: "carbon", label: "Carbon", accent: "#56d3d0" },
  { key: "light", label: "Light", accent: "#0f766e" },
  { key: "dawn", label: "Dawn", accent: "#b45309" },
  { key: "ocean", label: "Ocean", accent: "#38bdf8" },
] as const satisfies ReadonlyArray<{ key: ThemeName; label: string; accent: string }>;
const activityToneMap = {
  pending: "warning",
  approved: "success",
  simulated: "success",
  draft: "neutral",
  active: "neutral",
} as const;
const taskFilterOptions = ["all", "today", "upcoming", "overdue", "completed"] as const;
type TaskFilter = (typeof taskFilterOptions)[number];
const reminderFilterOptions = ["all", "active", "snoozed", "done"] as const;
type ReminderFilter = (typeof reminderFilterOptions)[number];
const assistantToneOptions = ["calm", "friendly", "formal"] as const;
const digestStyleOptions = ["balanced", "brief"] as const;

type QuickAction = {
  label: string;
  detail: string;
  href: string;
  disabled?: boolean;
  onClick: () => void;
};

export function RelayApp({ section = "dashboard" }: { section?: NavKey }) {
  const {
    tasks,
    notes,
    reminders,
    calendarEvents,
    notifications,
    drafts,
    calls,
    pendingActions,
    assistantRequests,
    actionLog,
    preferences,
    profile,
    integrations,
    session,
    runtime,
    isHydrating,
    lastError,
    submitCommand,
    signIn,
    signOut,
    approveAction,
    cancelAction,
    updatePendingAction,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    addNote,
    updateNote,
    deleteNote,
    addReminder,
    addCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    markNotificationRead,
    updateNotificationCategory,
    updateReminder,
    deleteReminder,
    saveDraft,
    deleteDraft,
    summarizeNote,
    suggestNoteTags,
    createCallFollowups,
    updatePreferences,
    updateProfile,
    updateIntegrations,
    resetState,
  } = useRelay();

  const [command, setCommand] = useState("");
  const [taskForm, setTaskForm] = useState({ title: "", due: "", priority: "medium" as Task["priority"], description: "" });
  const [noteForm, setNoteForm] = useState({ title: "", content: "" });
  const [reminderForm, setReminderForm] = useState({
    title: "",
    when: "",
    repeat: "none" as Reminder["repeat"],
    priority: "medium" as Reminder["priority"],
  });
  const [calendarForm, setCalendarForm] = useState({
    title: "",
    detail: "",
    start: "",
    end: "",
    location: "",
    tone: "teal" as CalendarEvent["tone"],
  });
  const [selectedTaskId, setSelectedTaskId] = useState<string>(tasks[0]?.id ?? "");
  const [selectedNoteId, setSelectedNoteId] = useState<string>(notes[0]?.id ?? "");
  const [selectedCalendarEventId, setSelectedCalendarEventId] = useState<string>(calendarEvents[0]?.id ?? "");
  const [selectedDraftId, setSelectedDraftId] = useState<string>(drafts[0]?.id ?? "");
  const [confirmationTab, setConfirmationTab] = useState<ConfirmationTab>("pending");
  const [theme, setTheme] = useState<ThemeName>("carbon");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [taskQuery, setTaskQuery] = useState("");
  const [noteQuery, setNoteQuery] = useState("");
  const [noteTagFilter, setNoteTagFilter] = useState("all");
  const [reminderFilter, setReminderFilter] = useState<ReminderFilter>("all");
  const [reminderQuery, setReminderQuery] = useState("");
  const deferredTaskQuery = useDeferredValue(taskQuery);
  const deferredNoteQuery = useDeferredValue(noteQuery);
  const deferredReminderQuery = useDeferredValue(reminderQuery);
  const [insights, setInsights] = useState<DashboardInsightSnapshot | null>(null);
  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    name: profile.name,
    email: profile.email,
    role: profile.role,
  });

  const pendingApprovals = pendingActions.filter((item) => item.status === "pending");
  const pendingCount = pendingApprovals.length;
  const highPriorityTasks = tasks.filter((task) => task.priority === "high" && task.status !== "done");
  const overdueCount = tasks.filter((task) => task.status === "overdue").length;
  const activeReminderCount = reminders.filter((reminder) => reminder.status === "active").length;
  const pendingDraftCount = drafts.filter((draft) => draft.status === "draft").length;
  const pendingCallCount = calls.filter((call) => call.status === "pending").length;
  const notesPreview = notes.find((note) => note.id === selectedNoteId) ?? notes[0];
  const selectedDraft = drafts.find((draft) => draft.id === selectedDraftId) ?? drafts[0];
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks[0];
  const selectedCalendarEvent = calendarEvents.find((event) => event.id === selectedCalendarEventId) ?? calendarEvents[0];
  const profileInitials = useMemo(
    () =>
      profile.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "JV",
    [profile.name],
  );
  const sortedCalendarEvents = useMemo(
    () => [...calendarEvents].sort((left, right) => left.start.localeCompare(right.start)),
    [calendarEvents],
  );

  const filteredTaskGroups = useMemo(
    () => ({
      today: tasks.filter((task) => task.due.toLowerCase().includes("today")),
      upcoming: tasks.filter((task) => !task.due.toLowerCase().includes("today") && task.status !== "overdue"),
      overdue: tasks.filter((task) => task.status === "overdue"),
      completed: tasks.filter((task) => task.status === "done"),
    }),
    [tasks],
  );

  const confirmationGroups = useMemo(
    () => ({
      pending: pendingActions.filter((item) => item.status === "pending"),
      approved: pendingActions.filter((item) => item.status === "approved"),
      cancelled: pendingActions.filter((item) => item.status === "cancelled"),
    }),
    [pendingActions],
  );

  const activeConfirmationList = confirmationGroups[confirmationTab];
  const noteTags = useMemo(
    () => ["all", ...new Set(notes.flatMap((note) => note.tags))],
    [notes],
  );
  const recentActivity = useMemo(
    () =>
      [
        ...pendingActions.slice(0, 3).map((action) => ({
          id: action.id,
          label: action.title,
          detail: action.description,
          status: action.status,
          category:
            action.type === "place_call"
              ? "Call plan"
              : action.type === "draft_email"
                ? "Email draft"
                : action.type === "create_tasks_from_note"
                  ? "Task extraction"
                  : "Reminder",
        })),
        ...calls.slice(0, 1).map((call) => ({
          id: call.id,
          label: call.contactName,
          detail: call.summary ?? call.purpose,
          status: call.status,
          category: "Call result",
        })),
        ...drafts.slice(0, 1).map((draft) => ({
          id: draft.id,
          label: draft.subject,
          detail: draft.recipient,
          status: draft.status,
          category: "Draft status",
        })),
        ...reminders.slice(0, 1).map((reminder) => ({
          id: reminder.id,
          label: reminder.title,
          detail: reminder.when,
          status: reminder.status,
          category: "Reminder pulse",
        })),
      ].slice(0, 6),
    [calls, drafts, pendingActions, reminders],
  );

  const fallbackBrief = useMemo(() => {
    const lines: string[] = [];

    if (overdueCount > 0) {
      lines.push(`${overdueCount} overdue task${overdueCount === 1 ? "" : "s"} need attention`);
    }
    if (pendingCount > 0) {
      lines.push(`${pendingCount} approval${pendingCount === 1 ? "" : "s"} are waiting`);
    }
    if (pendingDraftCount > 0) {
      lines.push(`${pendingDraftCount} email draft${pendingDraftCount === 1 ? "" : "s"} still need review`);
    }
    if (pendingCallCount > 0) {
      lines.push(`${pendingCallCount} call plan${pendingCallCount === 1 ? "" : "s"} are ready to confirm`);
    }
    if (activeReminderCount > 0) {
      lines.push(`${activeReminderCount} active reminder${activeReminderCount === 1 ? "" : "s"} are scheduled`);
    }
    if (lines.length === 0) {
      return "Your workspace looks clear right now. Good time to plan ahead or ask Relay to prepare your next move.";
    }

    const first = lines[0];
    const rest = lines.slice(1);
    return rest.length > 0 ? `${first}, and ${rest.join(", ")}.` : `${first}.`;
  }, [activeReminderCount, overdueCount, pendingCount, pendingDraftCount, pendingCallCount]);

  const taskGroups = useMemo(
    () => ({
      all: tasks,
      today: filteredTaskGroups.today,
      upcoming: filteredTaskGroups.upcoming,
      overdue: filteredTaskGroups.overdue,
      completed: filteredTaskGroups.completed,
    }),
    [filteredTaskGroups, tasks],
  );

  const visibleTasks = useMemo(() => {
    const scoped = taskFilter === "all" ? tasks : taskGroups[taskFilter];
    const query = deferredTaskQuery.trim().toLowerCase();
    if (!query) {
      return scoped;
    }

    return scoped.filter((task) =>
      [task.title, task.description ?? "", task.due, task.priority, task.status].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [deferredTaskQuery, taskFilter, taskGroups, tasks]);

  const visibleNotes = useMemo(() => {
    const query = deferredNoteQuery.trim().toLowerCase();
    return notes.filter((note) => {
      const matchesTag = noteTagFilter === "all" || note.tags.includes(noteTagFilter);
      const matchesQuery =
        !query ||
        [note.title, note.summary, note.content, note.tags.join(" ")].some((value) =>
          value.toLowerCase().includes(query),
        );
      return matchesTag && matchesQuery;
    });
  }, [deferredNoteQuery, noteTagFilter, notes]);

  const reminderGroups = useMemo(
    () => ({
      all: reminders,
      active: reminders.filter((reminder) => reminder.status === "active"),
      snoozed: reminders.filter((reminder) => reminder.status === "snoozed"),
      done: reminders.filter((reminder) => reminder.status === "done"),
    }),
    [reminders],
  );

  const visibleReminders = useMemo(() => {
    const scoped = reminderGroups[reminderFilter];
    const query = deferredReminderQuery.trim().toLowerCase();
    if (!query) {
      return scoped;
    }

    return scoped.filter((reminder) =>
      [reminder.title, reminder.when, reminder.repeat, reminder.priority, reminder.status].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [deferredReminderQuery, reminderFilter, reminderGroups]);

  const fallbackFocus = useMemo(() => {
    if (overdueCount > 0) {
      return "Start by clearing the overdue work so the rest of the day feels lighter.";
    }
    if (pendingCount > 0) {
      return "Your approval queue is the highest leverage place to unblock Relay.";
    }
    if (highPriorityTasks.length > 0) {
      return "You already know the high-priority tasks. A short focus block would move today forward.";
    }
    return "You have room to plan. Try drafting a reminder, message, or call plan from the assistant bar.";
  }, [highPriorityTasks.length, overdueCount, pendingCount]);

  function handleSubmitCommand() {
    if (!command.trim()) {
      return;
    }
    submitCommand(command);
    setCommand("");
  }

  function handleAddTask() {
    if (!taskForm.title.trim() || !taskForm.due.trim()) {
      return;
    }

    addTask({
      title: taskForm.title.trim(),
      due: taskForm.due.trim(),
      priority: taskForm.priority,
      description: taskForm.description.trim() || undefined,
    });

    setTaskForm({ title: "", due: "", priority: "medium", description: "" });
  }

  function handleAddNote() {
    if (!noteForm.title.trim() || !noteForm.content.trim()) {
      return;
    }

    addNote({ title: noteForm.title.trim(), content: noteForm.content.trim() });
    setNoteForm({ title: "", content: "" });
  }

  function handleAddReminder() {
    if (!reminderForm.title.trim() || !reminderForm.when.trim()) {
      return;
    }

    addReminder({
      title: reminderForm.title.trim(),
      when: reminderForm.when.trim(),
      repeat: reminderForm.repeat,
      priority: reminderForm.priority,
    });

    setReminderForm({
      title: "",
      when: "",
      repeat: "none",
      priority: "medium",
    });
  }

  function handleAddCalendarEvent() {
    if (!canCreateCalendarEvent) {
      return;
    }

    addCalendarEvent({
      title: calendarForm.title.trim(),
      detail: calendarForm.detail.trim() || "Planned event",
      start: calendarForm.start.trim(),
      end: calendarForm.end.trim(),
      location: calendarForm.location.trim() || undefined,
      tone: calendarForm.tone,
    });

    setCalendarForm({
      title: "",
      detail: "",
      start: "",
      end: "",
      location: "",
      tone: "teal",
    });
  }

  const canCreateTask = taskForm.title.trim().length > 0 && taskForm.due.trim().length > 0;
  const canCreateNote = noteForm.title.trim().length > 0 && noteForm.content.trim().length > 0;
  const canCreateReminder = reminderForm.title.trim().length > 0 && reminderForm.when.trim().length > 0;
  const canCreateCalendarEvent =
    calendarForm.title.trim().length > 0 && calendarForm.start.trim().length > 0 && calendarForm.end.trim().length > 0;

  const quickActions: QuickAction[] = [
    {
      label: "New task",
      detail: "Add something manually",
      onClick: () => setTaskForm((current) => ({ ...current, title: "Follow up on project outline" })),
      href: "/tasks",
    },
    {
      label: "Draft email",
      detail: integrations.emailDrafts ? "Queue a message for approval" : "Enable email drafting in Settings first",
      disabled: !integrations.emailDrafts,
      onClick: () => {
        setCommand("Draft an email to my professor asking for an extension");
        void submitCommand("Draft an email to my professor asking for an extension");
      },
      href: "/assistant",
    },
    {
      label: "Plan a call",
      detail: integrations.callAssistant ? "Prepare a transparent call script" : "Enable call assistant access in Settings first",
      disabled: !integrations.callAssistant,
      onClick: () => {
        setCommand("Call the gym and ask if the basketball court is free tonight");
        void submitCommand("Call the gym and ask if the basketball court is free tonight");
      },
      href: "/calls",
    },
  ];

  useEffect(() => {
    setTheme(preferences.theme);
  }, [preferences.theme]);

  useEffect(() => {
    setProfileDraft({
      name: profile.name,
      email: profile.email,
      role: profile.role,
    });
  }, [profile.email, profile.name, profile.role]);

  useEffect(() => {
    if (!tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(tasks[0]?.id ?? "");
    }
  }, [selectedTaskId, tasks]);

  useEffect(() => {
    if (!notes.some((note) => note.id === selectedNoteId)) {
      setSelectedNoteId(notes[0]?.id ?? "");
    }
  }, [notes, selectedNoteId]);

  useEffect(() => {
    if (!calendarEvents.some((event) => event.id === selectedCalendarEventId)) {
      setSelectedCalendarEventId(calendarEvents[0]?.id ?? "");
    }
  }, [calendarEvents, selectedCalendarEventId]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function handleThemeChange(nextTheme: ThemeName) {
    setTheme(nextTheme);
    void updatePreferences({ theme: nextTheme });
  }

  function handleSaveProfile() {
    void updateProfile(profileDraft);
  }

  async function refreshInsights() {
    setIsRefreshingInsights(true);

    try {
      const response = await fetch("/api/insights", { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const next = (await response.json()) as DashboardInsightSnapshot;
      setInsights(next);
    } catch {
      // Keep fallback content if the backend insights route is unavailable.
    } finally {
      setIsRefreshingInsights(false);
    }
  }

  if (isHydrating) {
    return <WorkspaceSplash />;
  }

  if (!session.isAuthenticated) {
    return <AuthGate profile={profile} lastError={lastError} onSignIn={() => void signIn()} />;
  }

  return (
    <main className="min-h-screen bg-bg pb-24 text-text lg:pb-0">
      <div className="relative overflow-hidden">
        <div className="ambient-aurora" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(86,211,208,0.08),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(226,190,125,0.07),_transparent_16%),radial-gradient(circle_at_center,_rgba(255,255,255,0.02),_transparent_28%)]" />
        <div className="mx-auto max-w-[1560px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="relay-shell flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden lg:flex-row">
            <aside className="relay-sidebar flex w-full shrink-0 flex-col border-b border-white/6 px-5 py-6 lg:w-[224px] lg:border-b-0 lg:border-r lg:px-4">
              <div className="flex items-start justify-between">
                <RelayBrand />
                <button type="button" className="icon-chip mt-2 hidden lg:inline-flex">
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </button>
              </div>

              <nav className="mt-8 space-y-2">
                {navItems.map(({ key, label, href, icon: Icon }) => (
                  <Link
                    key={key}
                    href={href}
                    className={clsx("nav-item", section === key && "active")}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="nav-item-icon h-4 w-4" />
                      {label}
                    </span>
                    {key === "confirmations" && pendingCount > 0 ? (
                      <span className="queue-pill">{pendingCount}</span>
                    ) : null}
                  </Link>
                ))}
              </nav>

              <div className="mt-auto space-y-4">
                <div className="soft-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="avatar-chip">{profileInitials}</div>
                    <div>
                      <p className="title-main text-sm font-medium">{profile.name}</p>
                      <p className="accent-copy text-sm">{profile.role}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="copy-soft text-xs uppercase tracking-[0.16em]">
                      {session.lastActiveAt ? `Active ${formatAuditTime(session.lastActiveAt)}` : "Active now"}
                    </p>
                    <button type="button" className="small-action" onClick={() => void signOut()}>
                      Sign out
                    </button>
                  </div>
                </div>

                <div className="soft-card relative overflow-hidden p-4">
                  <div className="accent-orb absolute left-4 top-5 h-14 w-14 rounded-full border border-[color:color-mix(in_srgb,var(--accent)_32%,transparent_68%)] blur-[2px]" />
                  <div className="relative pl-16">
                    <p className="title-soft text-lg">Relay Online</p>
                    <p className="mt-1 text-sm text-muted">Synced across pages.</p>
                  </div>
                </div>
              </div>
            </aside>

            <section className="relative flex flex-1 flex-col px-5 py-5 lg:px-6">
              <ThemeRail theme={theme} onThemeChange={handleThemeChange} />
              {lastError ? (
                <div className="mb-4 rounded-[1rem] border border-[color:color-mix(in_srgb,var(--danger)_32%,transparent_68%)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--title)]">
                  {lastError}
                </div>
              ) : null}
              <TopCommandBar command={command} setCommand={setCommand} submitCommand={handleSubmitCommand} />

              {section === "dashboard" ? (
                <>
                  <div className="dashboard-metrics">
                    <MetricCard label="Today" value={String(sortedCalendarEvents.length)} detail="Scheduled moments" />
                    <MetricCard label="Open tasks" value={String(tasks.filter((task) => task.status !== "done").length)} detail={`${highPriorityTasks.length} high priority`} />
                    <MetricCard label="Approvals" value={String(pendingCount)} detail="Waiting for you" />
                    <MetricCard label="Relay AI" value="Online" detail={runtime.ollamaModel} />
                  </div>
                  <div className="mt-5 grid gap-4 xl:grid-cols-[1.7fr_0.95fr]">
                    <section className="hero-panel">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="eyebrow">Today Brief</p>
                          <h1 className="title-hero mt-5 font-display text-[3rem] leading-[1.02] sm:text-[4rem]">
                            Good morning, {profile.name}.
                          </h1>
                          <p className="copy-strong mt-4 max-w-[620px] text-xl leading-9">{insights?.dailyBrief ?? fallbackBrief}</p>
                        </div>
                        <button
                          type="button"
                          className="soft-outline hidden lg:inline-flex"
                          onClick={() => void refreshInsights()}
                          disabled={isRefreshingInsights}
                        >
                          {isRefreshingInsights ? "Refreshing brief..." : "Refresh brief"}
                        </button>
                      </div>

                      <div className="orbital-art" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>

                      <div className="mt-8 grid gap-3 md:grid-cols-4">
                        <StatChip icon={Bell} value={activeReminderCount} label="Reminders" tone="teal" />
                        <StatChip icon={Clock3} value={overdueCount} label="Overdue Task" tone="rose" />
                        <StatChip icon={Mail} value={pendingDraftCount} label="Email Draft" tone="gold" />
                        <StatChip icon={PhoneCall} value={pendingCallCount} label="Call Request" tone="teal" />
                      </div>
                      <div className="focus-block mt-5 px-4 py-4">
                        <p className="accent-copy text-sm uppercase tracking-[0.2em]">Focus suggestion</p>
                        <p className="copy-strong mt-2 text-sm leading-7">{insights?.focusMessage ?? fallbackFocus}</p>
                      </div>
                    </section>

                    <section className="feature-panel">
                      <div className="mb-6 flex items-center justify-between">
                        <p className="eyebrow">Schedule</p>
                        <Link href="/calendar" className="panel-link">
                          View Calendar
                        </Link>
                      </div>

                      <div className="space-y-6">
                        {sortedCalendarEvents.map((item, index) => (
                          <div key={`${item.start}-${item.title}`} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <span className="h-3 w-3 rounded-full border border-white/90 bg-transparent" />
                              {index < sortedCalendarEvents.length - 1 ? <span className="mt-2 h-full w-px bg-white/10" /> : null}
                            </div>
                            <div className="copy-strong min-w-[78px] text-sm">{item.start}</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <span
                                  className={clsx(
                                    "h-2.5 w-2.5 rounded-full",
                                    item.tone === "teal" ? "bg-[#56d3d0]" : item.tone === "gold" ? "bg-[#ddb26f]" : "bg-[#f2808e]",
                                  )}
                                />
                                <p className="title-main text-xl">{item.title}</p>
                              </div>
                              <p className="mt-1 text-sm text-muted">{item.detail}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-3">
                    <DashboardPanel title="Priority Tasks" actionLabel="View all" href="/tasks">
                        <div className="space-y-4">
                          {tasks.slice(0, 4).map((task) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              active={selectedTask?.id === task.id}
                              onSelect={() => setSelectedTaskId(task.id)}
                              onToggle={() => toggleTask(task.id)}
                              onDelete={() => deleteTask(task.id)}
                            />
                          ))}
                        </div>
                    </DashboardPanel>

                    <DashboardPanel title="Confirmations Queue" actionLabel={`View all (${pendingApprovals.length})`} href="/confirmations">
                      <div className="space-y-3">
                        {pendingApprovals.slice(0, 3).map((action) => (
                          <ConfirmationRow
                            key={action.id}
                            action={action}
                            onApprove={() => approveAction(action.id)}
                            onCancel={() => cancelAction(action.id)}
                          />
                        ))}
                      </div>
                    </DashboardPanel>

                    <DashboardPanel title="Notifications Intelligence" actionLabel="View all" href="/notifications">
                      <div className="space-y-4">
                        {(insights?.rankedNotifications ?? notifications).map((notification) => (
                          <NotificationRow
                            key={notification.id}
                            notification={notification}
                            onMarkRead={() => markNotificationRead(notification.id)}
                            onRecategory={(category) => updateNotificationCategory(notification.id, category)}
                          />
                        ))}
                      </div>
                    </DashboardPanel>
                  </div>

                  <div className="dashboard-secondary mt-4 grid gap-4 xl:grid-cols-3">
                    <DashboardPanel title="Notes Preview" actionLabel="Open notes" href="/notes">
                      {notesPreview ? <NotePreviewCard note={notesPreview} /> : null}
                    </DashboardPanel>

                    <DashboardPanel title="Call Assistant" actionLabel="View calls" href="/calls">
                      <div className="app-card p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="accent-orb flex h-16 w-16 items-center justify-center rounded-full">
                              <PhoneCall className="h-7 w-7" />
                            </div>
                            <div>
                              <p className="text-sm text-muted">Pending Call Plan</p>
                              <p className="title-main mt-1 text-[2rem] leading-none">{calls[0]?.contactName ?? "Campus Gym"}</p>
                              <p className="copy-strong mt-2 text-sm">{calls[0]?.purpose ?? "Ask if basketball court is free tonight"}</p>
                            </div>
                          </div>
                          <StatusPill value="high" tone="danger" />
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          <Link href="/calls" className="soft-outline">
                            Review Plan
                          </Link>
                          <button
                            type="button"
                            className="relay-button"
                            onClick={() => {
                              const pendingCall = pendingApprovals.find((action) => action.type === "place_call");
                              if (pendingCall) {
                                approveAction(pendingCall.id);
                              }
                            }}
                          >
                            Approve Call
                          </button>
                        </div>
                      </div>
                    </DashboardPanel>

                    <DashboardPanel title="AI Suggestions" actionLabel="Open assistant" href="/assistant">
                      <div className="space-y-3">
                        {(insights?.suggestionCards ?? [
                          "You have a gap at 1:00 PM. Good time to study.",
                          "Consider starting your project earlier.",
                          "3 tasks can be scheduled around your classes.",
                        ]).map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            className="app-card flex w-full items-center justify-between px-4 py-4 text-left transition hover:border-[color:color-mix(in_srgb,var(--warn)_36%,transparent_64%)]"
                          >
                            <span className="title-soft flex items-center gap-3">
                              <Sparkles className="accent-copy h-4 w-4" />
                              <span>{suggestion}</span>
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted" />
                          </button>
                        ))}
                      </div>
                    </DashboardPanel>
                  </div>

                  <div className="dashboard-secondary mt-4">
                    <DashboardPanel title="Quick Actions">
                      <div className="grid gap-3 md:grid-cols-3">
                        {quickActions.map((action) => (
                          <Link
                            key={action.label}
                            href={action.href}
                            onClick={(event) => {
                              if (action.disabled) {
                                event.preventDefault();
                                return;
                              }

                              action.onClick();
                            }}
                            aria-disabled={action.disabled}
                            className={clsx(
                              "app-card px-4 py-4 transition",
                              action.disabled
                                ? "cursor-not-allowed opacity-55"
                                : "hover:border-[color:color-mix(in_srgb,var(--accent)_30%,transparent_70%)] hover:bg-[color:color-mix(in_srgb,var(--accent)_6%,transparent_94%)]",
                            )}
                          >
                            <p className="title-main text-lg">{action.label}</p>
                            <p className="copy-soft mt-2 text-sm leading-6">{action.detail}</p>
                          </Link>
                        ))}
                      </div>
                    </DashboardPanel>
                  </div>

                  <div className="dashboard-secondary mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <DashboardPanel title="Recent Activity Lane" actionLabel="Open assistant" href="/assistant">
                      {recentActivity.length > 0 ? (
                        <div className="space-y-3">
                          {recentActivity.map((item) => (
                            <ActivityRow
                              key={`${item.category}-${item.id}`}
                              label={item.label}
                              detail={item.detail}
                              category={item.category}
                              tone={activityToneMap[item.status as keyof typeof activityToneMap] ?? "neutral"}
                              status={item.status}
                            />
                          ))}
                        </div>
                      ) : (
                        <EmptyState title="No recent activity yet" description="As you approve reminders, draft emails, and simulate calls, Relay will build a living activity trail here." />
                      )}
                    </DashboardPanel>

                    <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-1">
                      <MetricCard label="Open approvals" value={String(pendingCount)} detail="Transparent action queue" />
                      <MetricCard label="Priority tasks" value={String(highPriorityTasks.length)} detail="Focused for today" />
                      <MetricCard
                        label="Simulated calls"
                        value={String(calls.filter((call) => call.status === "simulated").length)}
                        detail="Ready for follow-up"
                      />
                      <MetricCard label="Audit events" value={String(actionLog.length)} detail="Server-recorded trail" />
                    </div>
                  </div>

                  <div className="dashboard-secondary mt-4 feature-panel">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="eyebrow">Assistant Requests</p>
                      <Link href="/assistant" className="panel-link">
                        Open Assistant
                      </Link>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                      {assistantRequests.slice(0, 4).map((request) => (
                        <AssistantRequestCard key={request.id} request={request} compact />
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              {section === "tasks" ? (
                <SectionPage eyebrow="Task Center" title="Manage tasks with real actions." description="Add your own work, complete it, remove it, and keep AI-generated tasks separate until they are approved.">
                  <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
                    <DashboardPanel title="Task Builder">
                      <div className="grid gap-3 md:grid-cols-2">
                        <input value={taskForm.title} onChange={(e) => setTaskForm((c) => ({ ...c, title: e.target.value }))} placeholder="Task title" className="field-input md:col-span-2" />
                        <input value={taskForm.due} onChange={(e) => setTaskForm((c) => ({ ...c, due: e.target.value }))} placeholder="Due time, like Friday 5 PM" className="field-input" />
                        <select value={taskForm.priority} onChange={(e) => setTaskForm((c) => ({ ...c, priority: e.target.value as Task["priority"] }))} className="field-input">
                          <option value="low">Low priority</option>
                          <option value="medium">Medium priority</option>
                          <option value="high">High priority</option>
                        </select>
                        <textarea value={taskForm.description} onChange={(e) => setTaskForm((c) => ({ ...c, description: e.target.value }))} placeholder="Optional description" className="field-input min-h-28 md:col-span-2" />
                      </div>
                      <div className="mt-4">
                        <button type="button" className="relay-button" onClick={handleAddTask} disabled={!canCreateTask}>
                          Create Task
                        </button>
                      </div>
                    </DashboardPanel>

                    <div className="space-y-4">
                      <MetricCard label="High priority" value={String(highPriorityTasks.length)} detail="Needs focus first" />
                      <MetricCard label="Overdue" value={String(overdueCount)} detail="Worth clearing today" />
                      <DashboardPanel title="Suggested Next Move">
                        <p className="copy-strong text-sm leading-7">
                          Convert the research note into approved tasks, then block time after your 3 PM meeting to finish the outline.
                        </p>
                      </DashboardPanel>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-2">
                    <DashboardPanel title="Task Queue">
                      <div className="mb-4 space-y-3">
                        <input
                          value={taskQuery}
                          onChange={(e) => setTaskQuery(e.target.value)}
                          placeholder="Search tasks, due dates, or priorities"
                          className="field-input"
                        />
                        <div className="flex flex-wrap gap-2">
                          {taskFilterOptions.map((filter) => (
                            <button
                              key={filter}
                              type="button"
                              onClick={() => setTaskFilter(filter)}
                              className={clsx("small-action", taskFilter === filter && "primary")}
                            >
                              {filter} ({taskGroups[filter].length})
                            </button>
                          ))}
                        </div>
                      </div>
                      {visibleTasks.length > 0 ? (
                        <div className="space-y-4">
                          {visibleTasks.map((task) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              active={selectedTask?.id === task.id}
                              onSelect={() => setSelectedTaskId(task.id)}
                              onToggle={() => toggleTask(task.id)}
                              onDelete={() => deleteTask(task.id)}
                            />
                          ))}
                        </div>
                      ) : (
                        <EmptyState title="No tasks match this filter" description="Try a broader search, change the task state filter, or create a new task from the builder." />
                      )}
                    </DashboardPanel>
                    <DashboardPanel title="Task Snapshot">
                      {selectedTask ? (
                        <TaskEditor task={selectedTask} onSave={updateTask} />
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                          <TaskInsightCard label="Today" value={String(filteredTaskGroups.today.length)} detail="Due or happening today" />
                          <TaskInsightCard label="Upcoming" value={String(filteredTaskGroups.upcoming.length)} detail="Still ahead of schedule" />
                          <TaskInsightCard label="Overdue" value={String(filteredTaskGroups.overdue.length)} detail="Worth clearing first" />
                          <TaskInsightCard label="Completed" value={String(filteredTaskGroups.completed.length)} detail="Already wrapped up" />
                        </div>
                      )}
                    </DashboardPanel>
                  </div>
                </SectionPage>
              ) : null}

              {section === "notes" ? (
                <SectionPage eyebrow="Notes Workspace" title="Capture messy notes, then structure them." description="Notes can be saved here, browsed across pages, and turned into tasks through the approval flow.">
                  <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                    <DashboardPanel title="New Note">
                      <div className="space-y-3">
                        <input value={noteForm.title} onChange={(e) => setNoteForm((c) => ({ ...c, title: e.target.value }))} placeholder="Note title" className="field-input" />
                        <textarea value={noteForm.content} onChange={(e) => setNoteForm((c) => ({ ...c, content: e.target.value }))} placeholder="Paste meeting notes, ideas, or reminders" className="field-input min-h-48" />
                      </div>
                      <div className="mt-4">
                        <button type="button" className="relay-button" onClick={handleAddNote} disabled={!canCreateNote}>
                          Save Note
                        </button>
                      </div>
                    </DashboardPanel>

                    <DashboardPanel title="Note Library">
                      <div className="mb-4 space-y-3">
                        <input
                          value={noteQuery}
                          onChange={(e) => setNoteQuery(e.target.value)}
                          placeholder="Search notes, summaries, or tags"
                          className="field-input"
                        />
                        <div className="flex flex-wrap gap-2">
                          {noteTags.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setNoteTagFilter(tag)}
                              className={clsx("small-action", noteTagFilter === tag && "primary")}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                      {visibleNotes.length > 0 ? (
                        <div className="space-y-3">
                          {visibleNotes.map((note) => (
                            <div key={note.id} className="app-card p-4">
                              <button type="button" onClick={() => setSelectedNoteId(note.id)} className="w-full text-left">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="title-main text-lg">{note.title}</p>
                                  <span className="accent-copy text-xs uppercase tracking-[0.2em]">{note.tags[0]}</span>
                                </div>
                                <p className="copy-soft mt-2 text-sm leading-7">{note.summary}</p>
                              </button>
                              <div className="mt-3 flex justify-end">
                                <button type="button" className="small-action" onClick={() => deleteNote(note.id)}>
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState title="No notes match this view" description="Clear the search or switch tags to bring back the rest of your note library." />
                      )}
                    </DashboardPanel>
                  </div>

                  <div className="mt-4">
                    <DashboardPanel title={notesPreview?.title ?? "Selected Note"}>
                      {notesPreview ? (
                        <NoteEditor
                          note={notesPreview}
                          onSave={updateNote}
                          onSummarize={summarizeNote}
                          onSuggestTags={suggestNoteTags}
                          onExtractTasks={() => submitCommand("Turn this note into tasks")}
                        />
                      ) : null}
                    </DashboardPanel>
                  </div>
                </SectionPage>
              ) : null}

              {section === "confirmations" ? (
                <SectionPage eyebrow="Approval Center" title="Review and edit actions before they happen." description="You can now adjust reminder details and extracted tasks right inside the approval queue before approving them.">
                  <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <DashboardPanel title="Action History">
                      <div className="mb-4 flex flex-wrap gap-2">
                        {confirmationTabs.map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setConfirmationTab(tab)}
                            className={clsx(
                              "small-action",
                              confirmationTab === tab && "primary",
                            )}
                          >
                            {tab} ({confirmationGroups[tab].length})
                          </button>
                        ))}
                      </div>

                      {activeConfirmationList.length > 0 ? (
                        <div className="space-y-4">
                          {activeConfirmationList.map((action) =>
                            action.status === "pending" ? (
                              <EditableConfirmationCard
                                key={action.id}
                                action={action}
                                onChange={updatePendingAction}
                                onApprove={() => approveAction(action.id)}
                                onCancel={() => cancelAction(action.id)}
                              />
                            ) : (
                              <HistoryConfirmationCard key={action.id} action={action} />
                            ),
                          )}
                        </div>
                      ) : (
                        <div className="app-card copy-soft p-5 text-sm leading-7">
                          No {confirmationTab} actions yet.
                        </div>
                      )}
                    </DashboardPanel>

                    <div className="space-y-4">
                      <MetricCard label="Awaiting review" value={String(pendingCount)} detail="Nothing executes automatically" />
                      <MetricCard label="Approved" value={String(confirmationGroups.approved.length)} detail="Actions already accepted" />
                      <DashboardPanel title="Approval Rules">
                        <ul className="copy-strong space-y-3 text-sm leading-7">
                          <li>• Low risk: summaries, tags, and note insights.</li>
                          <li>• Medium risk: reminders, drafts, and extracted tasks.</li>
                          <li>• High risk: calls and future external integrations.</li>
                        </ul>
                      </DashboardPanel>
                      <DashboardPanel title="Execution Trail">
                        {actionLog.length > 0 ? (
                          <div className="space-y-3">
                            {actionLog.slice(0, 5).map((entry) => (
                              <AuditLogRow key={entry.id} entry={entry} />
                            ))}
                          </div>
                        ) : (
                          <EmptyState title="No audit events yet" description="Approvals, cancellations, and assistant-generated actions will leave a trace here." />
                        )}
                      </DashboardPanel>
                    </div>
                  </div>
                </SectionPage>
              ) : null}

              {section === "assistant" ? (
                <SectionPage eyebrow="Assistant" title="Natural language in, structured actions out." description="This workspace shows the command patterns and the running assistant feed behind the dashboard.">
                  <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                    <DashboardPanel title="Recent Assistant Requests">
                      {assistantRequests.length > 0 ? (
                        <div className="space-y-3">
                          {assistantRequests.map((request) => (
                            <AssistantRequestCard key={request.id} request={request} />
                          ))}
                        </div>
                      ) : (
                        <EmptyState title="Assistant is quiet" description="Type a natural language request above to create reminders, drafts, task proposals, or call plans." />
                      )}
                    </DashboardPanel>
                    <DashboardPanel title="Command Patterns">
                      <div className="space-y-3">
                        {commandSamples.map((sample) => (
                          <button key={sample} type="button" onClick={() => setCommand(sample)} className="app-card title-soft w-full px-4 py-4 text-left text-sm transition hover:border-[color:color-mix(in_srgb,var(--warn)_36%,transparent_64%)]">
                            {sample}
                          </button>
                        ))}
                      </div>
                      <div className="assistant-mini-grid mt-4">
                        <MiniMetric label="Pending approvals" value={String(pendingCount)} />
                        <MiniMetric label="Drafts in review" value={String(pendingDraftCount)} />
                        <MiniMetric label="Call plans" value={String(pendingCallCount)} />
                      </div>
                    </DashboardPanel>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                    <DashboardPanel title="Email Drafts">
                      {drafts.length > 0 ? (
                        <div className="space-y-3">
                          {drafts.map((draft) => (
                            <button
                              key={draft.id}
                              type="button"
                              onClick={() => setSelectedDraftId(draft.id)}
                              className={clsx(
                                "w-full rounded-[1.1rem] border px-4 py-4 text-left transition",
                                selectedDraft?.id === draft.id
                                  ? "border-[color:color-mix(in_srgb,var(--accent)_40%,transparent_60%)] bg-[color:color-mix(in_srgb,var(--accent)_8%,transparent_92%)]"
                                  : "border-[color:color-mix(in_srgb,var(--surface-outline)_55%,transparent_45%)] bg-[var(--surface-elevated)] hover:border-[color:color-mix(in_srgb,var(--warn)_36%,transparent_64%)]",
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="title-main text-base">{draft.subject}</p>
                                  <p className="mt-1 text-sm text-muted">{draft.recipient}</p>
                                  <SyncStatusMeta
                                    status={draft.syncStatus}
                                    error={draft.syncError}
                                    externalUrl={draft.externalUrl}
                                    syncedLabel="Gmail draft"
                                    localLabel="Local draft only"
                                  />
                                </div>
                                <StatusPill value={draft.status} tone={draft.status === "approved" ? "success" : "warning"} />
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <EmptyState title="No drafts yet" description="Ask Relay to draft an email and it will appear here for editing." />
                      )}
                    </DashboardPanel>

                    <DashboardPanel title={selectedDraft ? "Draft Editor" : "Draft Editor"}>
                      {selectedDraft ? (
                        <DraftEditor draft={selectedDraft} onSave={saveDraft} onDelete={deleteDraft} />
                      ) : (
                        <p className="text-sm text-muted">Create or approve an email draft to edit it here.</p>
                      )}
                    </DashboardPanel>
                  </div>
                </SectionPage>
              ) : null}

              {section === "reminders" ? (
                <SectionPage eyebrow="Reminders" title="Keep commitments visible." description="You can now add reminders directly, snooze them, mark them done, and manage repeat rules from the app.">
                  <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
                    <DashboardPanel title="Reminder Builder">
                      <div className="grid gap-3 md:grid-cols-2">
                        <input value={reminderForm.title} onChange={(e) => setReminderForm((c) => ({ ...c, title: e.target.value }))} placeholder="Reminder title" className="field-input md:col-span-2" />
                        <input value={reminderForm.when} onChange={(e) => setReminderForm((c) => ({ ...c, when: e.target.value }))} placeholder="When should Relay remind you?" className="field-input" />
                        <select value={reminderForm.repeat} onChange={(e) => setReminderForm((c) => ({ ...c, repeat: e.target.value as Reminder["repeat"] }))} className="field-input">
                          <option value="none">No repeat</option>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                        <select value={reminderForm.priority} onChange={(e) => setReminderForm((c) => ({ ...c, priority: e.target.value as Reminder["priority"] }))} className="field-input md:col-span-2">
                          <option value="low">Low priority</option>
                          <option value="medium">Medium priority</option>
                          <option value="high">High priority</option>
                        </select>
                      </div>
                      <div className="mt-4">
                        <button type="button" className="relay-button" onClick={handleAddReminder} disabled={!canCreateReminder}>
                          Create Reminder
                        </button>
                      </div>
                    </DashboardPanel>

                    <DashboardPanel title="Reminder Snapshot">
                      <div className="grid gap-4 md:grid-cols-3">
                        <MetricCard label="Active" value={String(reminders.filter((r) => r.status === "active").length)} detail="Ready to notify" />
                        <MetricCard label="Snoozed" value={String(reminders.filter((r) => r.status === "snoozed").length)} detail="Deferred briefly" />
                        <MetricCard label="Done" value={String(reminders.filter((r) => r.status === "done").length)} detail="Completed or cleared" />
                      </div>
                    </DashboardPanel>
                  </div>

                  <div className="mt-4">
                    <DashboardPanel title="Reminder Queue">
                      <div className="mb-4 space-y-3">
                        <input
                          value={reminderQuery}
                          onChange={(e) => setReminderQuery(e.target.value)}
                          placeholder="Search reminders, repeat rules, or status"
                          className="field-input"
                        />
                        <div className="flex flex-wrap gap-2">
                          {reminderFilterOptions.map((filter) => (
                            <button
                              key={filter}
                              type="button"
                              onClick={() => setReminderFilter(filter)}
                              className={clsx("small-action", reminderFilter === filter && "primary")}
                            >
                              {filter} ({reminderGroups[filter].length})
                            </button>
                          ))}
                        </div>
                      </div>
                      {visibleReminders.length > 0 ? (
                        <div className="space-y-3">
                          {visibleReminders.map((reminder) => (
                            <ReminderCard key={reminder.id} reminder={reminder} onUpdate={updateReminder} onDelete={deleteReminder} />
                          ))}
                        </div>
                      ) : (
                        <EmptyState title="No reminders match this filter" description="Try a different status or clear the search query to see the rest of your reminders." />
                      )}
                    </DashboardPanel>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <TaskInsightCard label="Active" value={String(reminderGroups.active.length)} detail="Ready to notify" />
                    <TaskInsightCard label="Snoozed" value={String(reminderGroups.snoozed.length)} detail="Deferred for later" />
                    <TaskInsightCard label="Done" value={String(reminderGroups.done.length)} detail="Already handled" />
                  </div>
                </SectionPage>
              ) : null}

              {section === "calendar" ? (
                <SectionPage eyebrow="Calendar" title="Plan the day with real events." description="The MVP now keeps calendar events in the server-backed workspace so your schedule behaves like the rest of Relay.">
                  <div className="mb-4 grid gap-4 md:grid-cols-3">
                    <MetricCard label="Events" value={String(calendarEvents.length)} detail="Live schedule items" />
                    <MetricCard label="Pending calls" value={String(pendingCallCount)} detail="May affect your plan" />
                    <MetricCard label="Open approvals" value={String(pendingCount)} detail="Calendar stays transparent" />
                  </div>
                  <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                    <DashboardPanel title="Event Builder">
                      <div className="grid gap-3 md:grid-cols-2">
                        <input value={calendarForm.title} onChange={(e) => setCalendarForm((current) => ({ ...current, title: e.target.value }))} placeholder="Event title" className="field-input md:col-span-2" />
                        <input value={calendarForm.start} onChange={(e) => setCalendarForm((current) => ({ ...current, start: e.target.value }))} placeholder="Start, like 2:00 PM" className="field-input" />
                        <input value={calendarForm.end} onChange={(e) => setCalendarForm((current) => ({ ...current, end: e.target.value }))} placeholder="End, like 3:00 PM" className="field-input" />
                        <input value={calendarForm.location} onChange={(e) => setCalendarForm((current) => ({ ...current, location: e.target.value }))} placeholder="Location" className="field-input" />
                        <select value={calendarForm.tone} onChange={(e) => setCalendarForm((current) => ({ ...current, tone: e.target.value as CalendarEvent["tone"] }))} className="field-input">
                          <option value="teal">Teal</option>
                          <option value="gold">Gold</option>
                          <option value="rose">Rose</option>
                        </select>
                        <textarea value={calendarForm.detail} onChange={(e) => setCalendarForm((current) => ({ ...current, detail: e.target.value }))} placeholder="Event detail or agenda" className="field-input min-h-28 md:col-span-2" />
                      </div>
                      <div className="mt-4">
                        <button type="button" className="relay-button" onClick={handleAddCalendarEvent} disabled={!canCreateCalendarEvent}>
                          Create Event
                        </button>
                      </div>
                    </DashboardPanel>
                    <DashboardPanel title="Today's Schedule">
                      {sortedCalendarEvents.length > 0 ? (
                        <div className="space-y-4">
                          {sortedCalendarEvents.map((item) => (
                            <div key={`${item.start}-${item.title}`} className="app-card p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="accent-copy text-sm uppercase tracking-[0.18em]">
                                    {item.start} - {item.end}
                                  </p>
                                  <p className="title-main mt-2 text-xl">{item.title}</p>
                                  <p className="mt-1 text-sm text-muted">{item.detail}</p>
                                  {item.location ? <p className="copy-soft mt-2 text-sm">{item.location}</p> : null}
                                  <SyncStatusMeta
                                    status={item.syncStatus}
                                    error={item.syncError}
                                    externalUrl={item.externalUrl}
                                    syncedLabel="Google Calendar"
                                    localLabel="Local calendar only"
                                  />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button type="button" className="small-action" onClick={() => setSelectedCalendarEventId(item.id)}>
                                    Edit
                                  </button>
                                  <button type="button" className="small-action" onClick={() => deleteCalendarEvent(item.id)}>
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState title="No calendar events yet" description="Add your first event here and Relay will reflect it in the dashboard schedule." />
                      )}
                    </DashboardPanel>
                  </div>
                  <div className="mt-4">
                    <DashboardPanel title={selectedCalendarEvent ? `Edit ${selectedCalendarEvent.title}` : "Event Editor"}>
                      {selectedCalendarEvent ? (
                        <CalendarEventEditor event={selectedCalendarEvent} onSave={updateCalendarEvent} />
                      ) : (
                        <EmptyState title="No event selected" description="Pick an event from today's schedule to edit its time, detail, or location." />
                      )}
                    </DashboardPanel>
                  </div>
                </SectionPage>
              ) : null}

              {section === "calls" ? (
                <SectionPage eyebrow="Calls" title="A transparent calling assistant." description="Call plans clearly state who Relay is contacting, what it may ask, and what it must not do.">
                  <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    <DashboardPanel title="Call Queue">
                      {calls.length > 0 ? (
                        <div className="space-y-4">
                          {calls.map((call) => (
                            <div key={call.id} className="app-card p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="title-main text-xl">{call.contactName}</p>
                                  <p className="mt-1 text-sm text-muted">{call.purpose}</p>
                                  <p className="copy-soft mt-2 text-sm">{call.phoneNumber}</p>
                                </div>
                                <StatusPill value={call.status} tone={call.status === "pending" ? "warning" : "success"} />
                              </div>
                              <p className="copy-strong mt-4 text-sm leading-7">{call.script}</p>
                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <div className="soft-card p-4">
                                  <p className="accent-copy text-xs uppercase tracking-[0.18em]">Allowed</p>
                                  <ul className="copy-strong mt-3 space-y-2 text-sm leading-6">
                                    {call.allowedActions.map((item) => (
                                      <li key={item}>• {item}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="soft-card p-4">
                                  <p className="accent-copy text-xs uppercase tracking-[0.18em]">Restricted</p>
                                  <ul className="copy-strong mt-3 space-y-2 text-sm leading-6">
                                    {call.restrictedActions.map((item) => (
                                      <li key={item}>• {item}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                              {call.status === "pending" ? (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    className="relay-button"
                                    onClick={() => {
                                      const pendingCall = pendingApprovals.find((action) => action.type === "place_call" && String(action.payload.callId) === call.id);
                                      if (pendingCall) {
                                        approveAction(pendingCall.id);
                                      }
                                    }}
                                  >
                                    Approve simulated call
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <EmptyState title="No call plans yet" description="Ask Relay to call a business or office, and it will prepare a transparent script here." />
                      )}
                    </DashboardPanel>
                    <DashboardPanel title="Latest Summary">
                      <p className="copy-strong text-sm leading-8">{calls[0]?.summary ?? "Approve a call plan to generate a transcript and summary."}</p>
                      {calls[0]?.transcript ? (
                        <pre className="note-surface copy-soft mt-4 whitespace-pre-wrap p-4 text-xs leading-7">
                          {calls[0].transcript}
                        </pre>
                      ) : null}
                      {calls[0]?.status === "simulated" ? (
                        <div className="mt-4 space-y-4">
                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="soft-card p-4">
                              <p className="title-main text-base">Reminder</p>
                              <p className="copy-soft mt-2 text-sm leading-6">Leave by 6:45 PM so the court window still works.</p>
                            </div>
                            <div className="soft-card p-4">
                              <p className="title-main text-base">Task</p>
                              <p className="copy-soft mt-2 text-sm leading-6">Text friends and confirm who is joining tonight.</p>
                            </div>
                            <div className="soft-card p-4">
                              <p className="title-main text-base">Calendar</p>
                              <p className="copy-soft mt-2 text-sm leading-6">Block out the basketball run directly on the schedule.</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className="small-action primary" onClick={() => createCallFollowups(calls[0].id)}>
                              Create follow-up approvals
                            </button>
                            <button type="button" className="small-action" onClick={() => submitCommand("Remind me to leave for the gym at 6:45 PM")}>
                              Quick reminder
                            </button>
                            <button type="button" className="small-action" onClick={() => submitCommand("Create task to text friends about basketball tonight")}>
                              Draft task
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </DashboardPanel>
                  </div>
                </SectionPage>
              ) : null}

              {section === "notifications" ? (
                <SectionPage eyebrow="Notifications" title="See what matters now." description="Relay groups mock notifications by urgency so the dashboard stays calm instead of noisy.">
                  <div className="mb-4 grid gap-4 md:grid-cols-4">
                    <MetricCard label="Urgent" value={String((insights?.rankedNotifications ?? notifications).filter((n) => n.category === "urgent").length)} detail="Needs attention now" />
                    <MetricCard label="Important" value={String((insights?.rankedNotifications ?? notifications).filter((n) => n.category === "important").length)} detail="Worth looking at soon" />
                    <MetricCard label="Later" value={String((insights?.rankedNotifications ?? notifications).filter((n) => n.category === "later").length)} detail="Can wait" />
                    <MetricCard label="Low" value={String((insights?.rankedNotifications ?? notifications).filter((n) => n.category === "low").length)} detail="Background noise" />
                  </div>
                  <div className="mb-4">
                    <DashboardPanel title="What Matters Now">
                      <p className="copy-strong text-sm leading-7">
                        {insights?.notificationSummary ?? "No urgent alerts right now. Important updates can be handled next."}
                      </p>
                    </DashboardPanel>
                  </div>
                  <DashboardPanel title="Notification Ranking">
                    <div className="space-y-5">
                      {(insights?.rankedNotifications ?? notifications).map((notification) => (
                        <NotificationRow
                          key={notification.id}
                          notification={notification}
                          onMarkRead={() => markNotificationRead(notification.id)}
                          onRecategory={(category) => updateNotificationCategory(notification.id, category)}
                        />
                      ))}
                    </div>
                  </DashboardPanel>
                </SectionPage>
              ) : null}

              {section === "settings" ? (
                <SectionPage eyebrow="Settings" title="Preferences and future integrations." description="This area is moving from demo controls toward real persisted user preferences and integration consent.">
                  <div className="grid gap-4 md:grid-cols-2">
                    <DashboardPanel title="Profile">
                      <div className="grid gap-3">
                        <input
                          value={profileDraft.name}
                          onChange={(e) => setProfileDraft((current) => ({ ...current, name: e.target.value }))}
                          placeholder="Your name"
                          className="field-input"
                        />
                        <input
                          value={profileDraft.email}
                          onChange={(e) => setProfileDraft((current) => ({ ...current, email: e.target.value }))}
                          placeholder="Email address"
                          className="field-input"
                        />
                        <input
                          value={profileDraft.role}
                          onChange={(e) => setProfileDraft((current) => ({ ...current, role: e.target.value }))}
                          placeholder="Role, like Student or Intern"
                          className="field-input"
                        />
                        <p className="copy-soft text-sm leading-7">
                          Relay uses this profile to personalize call scripts, email sign-offs, and the daily brief without changing the approval-first workflow.
                        </p>
                        <button type="button" className="relay-button" onClick={handleSaveProfile}>
                          Save Profile
                        </button>
                      </div>
                    </DashboardPanel>
                    <DashboardPanel title="Integration Permissions">
                      <div className="space-y-4">
                        <IntegrationToggle
                          label="Calendar planning"
                          description="Lets Relay prepare and store local calendar events for your schedule."
                          enabled={integrations.calendar}
                          onToggle={() => void updateIntegrations({ calendar: !integrations.calendar })}
                        />
                        <IntegrationToggle
                          label="Email drafts"
                          description="Allows the assistant to prepare email drafts for confirmation."
                          enabled={integrations.emailDrafts}
                          onToggle={() => void updateIntegrations({ emailDrafts: !integrations.emailDrafts })}
                        />
                        <IntegrationToggle
                          label="Call assistant"
                          description="Allows Relay to prepare transparent simulated call plans on your behalf."
                          enabled={integrations.callAssistant}
                          onToggle={() => void updateIntegrations({ callAssistant: !integrations.callAssistant })}
                        />
                        <IntegrationToggle
                          label="Share context with AI"
                          description="Lets Relay use your notes, tasks, and reminders when preparing summaries and suggestions."
                          enabled={integrations.shareContextWithAi}
                          onToggle={() =>
                            void updateIntegrations({ shareContextWithAi: !integrations.shareContextWithAi })
                          }
                        />
                      </div>
                    </DashboardPanel>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <DashboardPanel title="Assistant Preferences">
                      <div className="space-y-5">
                        <div>
                          <p className="copy-soft text-xs uppercase tracking-[0.18em]">Assistant tone</p>
                          <div className="mt-3 flex flex-wrap gap-3">
                            {assistantToneOptions.map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => void updatePreferences({ assistantTone: option })}
                                className={clsx("theme-pill", preferences.assistantTone === option && "active")}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="copy-soft text-xs uppercase tracking-[0.18em]">Daily brief style</p>
                          <div className="mt-3 flex flex-wrap gap-3">
                            {digestStyleOptions.map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => void updatePreferences({ digestStyle: option })}
                                className={clsx("theme-pill", preferences.digestStyle === option && "active")}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="copy-soft text-xs uppercase tracking-[0.18em]">Approval lock</p>
                          <div className="mt-3 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => void updatePreferences({ approvalsLocked: true })}
                              className={clsx("theme-pill", preferences.approvalsLocked && "active")}
                            >
                              Require confirmations
                            </button>
                            <button
                              type="button"
                              onClick={() => void updatePreferences({ approvalsLocked: false })}
                              className={clsx("theme-pill", !preferences.approvalsLocked && "active")}
                            >
                              Auto-apply low risk
                            </button>
                          </div>
                        </div>
                        <p className="copy-strong text-sm leading-7">
                          High-risk actions still require explicit approval, and simulated calls continue to identify Relay clearly on your behalf.
                        </p>
                      </div>
                    </DashboardPanel>
                    <DashboardPanel title="Coming Integrations">
                      <div className="space-y-4">
                        <p className="copy-strong text-sm leading-7">
                          Google Workspace can now be connected directly for Gmail draft sync and Google Calendar event sync.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {runtime.googleOAuthConfigured ? (
                            <>
                              <a href="/api/google/connect?service=workspace&redirect=/settings" className="small-action primary">
                                Connect Google Workspace
                              </a>
                              {(runtime.gmailConfigured || runtime.calendarConfigured) ? (
                                <a href="/api/google/disconnect?redirect=/settings" className="small-action">
                                  Disconnect Google
                                </a>
                              ) : null}
                            </>
                          ) : (
                            <span className="copy-soft text-sm">
                              Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_OAUTH_REDIRECT_URI` to enable one-click connect.
                            </span>
                          )}
                        </div>
                      </div>
                    </DashboardPanel>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <DashboardPanel title="Runtime Status">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <TaskInsightCard label="Storage" value={runtime.storageMode} detail="Current persistence mode" />
                        <TaskInsightCard
                          label="Database"
                          value={runtime.databaseConfigured ? "configured" : "pending"}
                          detail={runtime.databaseConfigured ? "DATABASE_URL found" : "Add DATABASE_URL to connect Postgres"}
                        />
                        <TaskInsightCard
                          label="Ollama"
                          value={runtime.ollamaConfigured ? "configured" : "default"}
                          detail={runtime.ollamaConfigured ? `${runtime.ollamaModel} configured` : `Using local default ${runtime.ollamaModel}`}
                        />
                        <TaskInsightCard
                          label="Google OAuth"
                          value={runtime.googleOAuthConfigured ? "ready" : "pending"}
                          detail={runtime.googleOAuthConfigured ? "Client credentials found" : "Add Google OAuth env vars"}
                        />
                        <TaskInsightCard
                          label="Gmail"
                          value={runtime.gmailConfigured ? "connected" : "pending"}
                          detail={runtime.gmailConfigured ? "Draft sync is available" : "Add GOOGLE_GMAIL_ACCESS_TOKEN"}
                        />
                        <TaskInsightCard
                          label="Calendar"
                          value={runtime.calendarConfigured ? "connected" : "pending"}
                          detail={runtime.calendarConfigured ? "Event sync is available" : "Add GOOGLE_CALENDAR_ACCESS_TOKEN"}
                        />
                      </div>
                      <p className="copy-soft mt-4 text-sm leading-7">
                        The current MVP works immediately with file-backed state, and can now optionally connect Gmail drafts plus Google Calendar through OAuth when the Google credentials are configured.
                      </p>
                    </DashboardPanel>
                    <DashboardPanel title="Getting Started">
                      <ol className="copy-strong space-y-3 text-sm leading-7">
                        <li>1. Copy `.env.example` to `.env.local`.</li>
                        <li>2. Run `pnpm install` and then `pnpm dev`.</li>
                        <li>3. Open `http://localhost:3000`, sign in, and test commands from the assistant bar.</li>
                        <li>4. Add `DATABASE_URL` later when you want Postgres wired in.</li>
                      </ol>
                    </DashboardPanel>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                    <DashboardPanel title="Backend State">
                      <div className="space-y-4">
                        <p className="copy-strong text-sm leading-7">
                          Relay now keeps its workspace state through the server layer instead of relying only on browser-local memory. Tasks, reminders, drafts, calls, approvals, and appearance preferences persist in the project runtime itself.
                        </p>
                        <div className="grid gap-3 md:grid-cols-3">
                          <TaskInsightCard label="Tasks" value={String(tasks.length)} detail="Server-backed records" />
                          <TaskInsightCard label="Approvals" value={String(pendingActions.length)} detail="Tracked through API" />
                          <TaskInsightCard label="Calls" value={String(calls.length)} detail="Stored with summaries" />
                        </div>
                      </div>
                    </DashboardPanel>
                    <DashboardPanel title="Demo Controls">
                      <div className="space-y-4">
                        <p className="copy-soft text-sm leading-7">
                          Reset the workspace back to the seeded demo dataset whenever you want a clean walkthrough for testing or presenting.
                        </p>
                        <button type="button" className="relay-button" onClick={() => void resetState()}>
                          Restore Demo Workspace
                        </button>
                      </div>
                    </DashboardPanel>
                  </div>
                  <div className="mt-4">
                    <DashboardPanel title="Appearance">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {themeOptions.map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => handleThemeChange(option.key)}
                            className={clsx(
                              "theme-card",
                              theme === option.key && "active",
                            )}
                          >
                            <div className="theme-card-swatches">
                              <span style={{ backgroundColor: option.accent }} />
                              <span />
                              <span />
                            </div>
                            <div className="mt-4 flex items-center justify-between gap-3">
                              <div>
                                <p className="title-main text-base">{option.label}</p>
                                <p className="mt-1 text-sm text-muted">
                                  {option.key === "carbon"
                                    ? "Default dark command center"
                                    : option.key === "light"
                                      ? "Bright daytime workspace"
                                      : option.key === "dawn"
                                        ? "Warm editorial amber"
                                        : "Cool deep-sea blue"}
                                </p>
                              </div>
                              {theme === option.key ? (
                                <div className="icon-chip h-10 w-10">
                                  {option.key === "light" ? <SunMedium className="h-4 w-4" /> : option.key === "carbon" ? <MoonStar className="h-4 w-4" /> : <Palette className="h-4 w-4" />}
                                </div>
                              ) : null}
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <span className="soft-outline text-sm">Assistant tone: {preferences.assistantTone}</span>
                        <span className="soft-outline text-sm">Daily brief: {preferences.digestStyle}</span>
                        <span className="soft-outline text-sm">
                          Approval lock: {preferences.approvalsLocked ? "enabled" : "disabled"}
                        </span>
                      </div>
                    </DashboardPanel>
                  </div>
                </SectionPage>
              ) : null}
            </section>
          </div>
        </div>
      </div>
      <MobileNav section={section} />
    </main>
  );
}

function ThemeRail({
  theme,
  onThemeChange,
}: {
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
}) {
  return (
    <div className="theme-rail hidden lg:flex" aria-label="Theme controls">
      <div className="theme-rail-trigger">
        <Palette className="h-4 w-4" />
        <span>Theme</span>
      </div>
      <div className="theme-rail-panel">
        <p className="theme-rail-label">Appearance</p>
        <div className="theme-rail-options">
          {themeOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onThemeChange(option.key)}
              className={clsx("theme-pill", theme === option.key && "active")}
            >
              <span className="theme-swatch" style={{ backgroundColor: option.accent }} />
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkspaceSplash() {
  return (
    <main className="min-h-screen px-5 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center">
        <div className="hero-panel max-w-2xl text-center">
          <p className="eyebrow">Booting Workspace</p>
          <h1 className="title-hero mt-5 font-display text-[3rem] leading-[1.02] sm:text-[4rem]">
            Bringing Relay online.
          </h1>
          <p className="copy-strong mt-4 text-lg leading-8">
            Loading your command center, recent approvals, assistant history, and daily brief.
          </p>
        </div>
      </div>
    </main>
  );
}

function AuthGate({
  profile,
  lastError,
  onSignIn,
}: {
  profile: { name: string; role: string };
  lastError: string | null;
  onSignIn: () => void;
}) {
  return (
    <main className="min-h-screen px-5 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center">
        <div className="hero-panel max-w-3xl">
          <p className="eyebrow">Secure Entry</p>
          <h1 className="title-hero mt-5 max-w-[760px] font-display text-[3rem] leading-[1.02] sm:text-[4.25rem]">
            Sign in to your Relay command center.
          </h1>
          <p className="copy-strong mt-4 max-w-[720px] text-lg leading-8">
            Your approvals, notes, tasks, reminders, drafts, and simulated calls stay organized behind a real workspace entry flow.
          </p>
          {lastError ? (
            <div className="mt-5 rounded-[1rem] border border-[color:color-mix(in_srgb,var(--danger)_32%,transparent_68%)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--title)]">
              {lastError}
            </div>
          ) : null}
          <div className="mt-8 grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
            <div className="soft-card p-5">
              <p className="accent-copy text-sm uppercase tracking-[0.18em]">Workspace Promise</p>
              <ul className="copy-strong mt-4 space-y-3 text-sm leading-7">
                <li>• Important actions stay approval-first.</li>
                <li>• Calls stay transparent about what Relay can and cannot do.</li>
                <li>• Settings, permissions, and assistant behavior persist with your workspace.</li>
              </ul>
            </div>
            <div className="soft-card p-5">
              <p className="title-main text-xl">{profile.name}</p>
              <p className="copy-soft mt-1 text-sm">{profile.role} workspace</p>
              <button type="button" className="relay-button mt-6 w-full justify-center" onClick={onSignIn}>
                Continue into Relay
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function RelayBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relay-logo" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div>
        <p className="font-display text-[2.35rem] leading-none tracking-[0.18em] text-[var(--brand-wordmark)]">RELAY</p>
        <p className="mt-1 text-[0.72rem] uppercase tracking-[0.26em] text-[var(--brand-subtitle)]">Approval-First AI</p>
      </div>
    </div>
  );
}

function TopCommandBar({
  command,
  setCommand,
  submitCommand,
}: {
  command: string;
  setCommand: (value: string) => void;
  submitCommand: () => void;
}) {
  return (
    <div className="flex items-start gap-4 lg:pr-[15.5rem]">
      <div className="command-bar flex-1">
        <button type="button" className="icon-chip hidden sm:inline-flex">
          <Sparkles className="h-4 w-4 text-[var(--warn)]" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="title-soft text-base">What would you like Relay to do?</p>
          <div className="command-samples mt-2 flex flex-wrap gap-2">
            {commandSamples.slice(0, 2).map((sample) => (
              <button key={sample} type="button" onClick={() => setCommand(sample)} className="rounded-full border border-[color:color-mix(in_srgb,var(--surface-outline)_55%,transparent_45%)] px-3 py-1.5 text-sm text-muted transition hover:border-[color:color-mix(in_srgb,var(--warn)_40%,transparent_60%)] hover:text-[var(--title)]">
                {sample}
              </button>
            ))}
          </div>
          <input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submitCommand();
              }
            }}
            placeholder="Try: Remind me to study tomorrow at 10am"
            className="mt-3 w-full bg-transparent text-sm text-[var(--title)] outline-none placeholder:text-muted"
          />
        </div>

        <button type="button" className="icon-chip" onClick={submitCommand}>
          <Send className="h-4 w-4 text-[var(--warn)]" />
        </button>
      </div>

      <div className="hidden items-center gap-3 lg:flex">
        <button type="button" className="icon-chip">
          <Search className="h-4 w-4 text-[var(--warn)]" />
        </button>
        <button type="button" className="icon-chip">
          <SunMedium className="h-4 w-4 text-[var(--warn)]" />
        </button>
        <button type="button" className="icon-chip">
          <Bell className="h-4 w-4 text-[var(--title)]" />
        </button>
      </div>
    </div>
  );
}

function MobileNav({ section }: { section: NavKey }) {
  return (
    <nav className="mobile-dock lg:hidden">
      {mobileNavItems.map(({ key, href, label, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          className={clsx(
            "mobile-dock-item",
            section === key && "active",
          )}
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function SectionPage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-5">
      <section className="hero-panel">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="section-title title-hero mt-5 max-w-[760px] font-display text-[2.8rem] leading-[1.05] sm:text-[3.6rem]">
          {title}
        </h1>
        <p className="copy-strong mt-4 max-w-[720px] text-lg leading-8">{description}</p>
      </section>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-card p-5">
      <p className="title-soft text-base">{title}</p>
      <p className="copy-soft mt-2 text-sm leading-7">{description}</p>
    </div>
  );
}

function DashboardPanel({
  title,
  actionLabel,
  href,
  children,
}: {
  title: string;
  actionLabel?: string;
  href?: string;
  children: ReactNode;
}) {
  return (
    <section className="feature-panel">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="eyebrow">{title}</h3>
        {actionLabel ? (
          href ? (
            <Link href={href} className="panel-link">
              {actionLabel}
            </Link>
          ) : (
            <button type="button" className="panel-link">
              {actionLabel}
            </button>
          )
        ) : null}
      </div>
      <div>{children}</div>
    </section>
  );
}

function TaskInsightCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="app-card p-4">
      <p className="accent-copy text-xs uppercase tracking-[0.18em]">{label}</p>
      <p className="title-main mt-3 text-3xl">{value}</p>
      <p className="copy-soft mt-2 text-sm leading-6">{detail}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="app-card p-4">
      <p className="copy-soft text-xs uppercase tracking-[0.16em]">{label}</p>
      <p className="title-main mt-2 text-2xl">{value}</p>
    </div>
  );
}

function AssistantRequestCard({
  request,
  compact = false,
}: {
  request: {
    input: string;
    outcome: string;
    status: "queued" | "proposal_created" | "completed" | "needs_clarification";
    happenedAt: string;
  };
  compact?: boolean;
}) {
  return (
    <div className="app-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="accent-copy text-xs uppercase tracking-[0.18em]">Assistant request</p>
          <p className="title-main mt-2 text-base">{request.input}</p>
          <p className="copy-soft mt-2 text-sm leading-6">{compact && request.outcome.length > 120 ? `${request.outcome.slice(0, 117)}...` : request.outcome}</p>
        </div>
        <StatusPill
          value={request.status}
          tone={
            request.status === "proposal_created" || request.status === "completed"
              ? "success"
              : request.status === "needs_clarification"
                ? "warning"
                : "neutral"
          }
        />
      </div>
      <p className="copy-soft mt-3 text-xs uppercase tracking-[0.16em]">{formatAuditTime(request.happenedAt)}</p>
    </div>
  );
}

function AuditLogRow({
  entry,
}: {
  entry: {
    title: string;
    detail: string;
    category: string;
    impact: "info" | "success" | "warning";
    happenedAt: string;
  };
}) {
  return (
    <div className="app-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="accent-copy text-xs uppercase tracking-[0.18em]">{entry.category}</p>
          <p className="title-main mt-2 text-base">{entry.title}</p>
          <p className="copy-soft mt-2 text-sm leading-6">{entry.detail}</p>
        </div>
        <StatusPill
          value={entry.impact}
          tone={entry.impact === "success" ? "success" : entry.impact === "warning" ? "warning" : "neutral"}
        />
      </div>
      <p className="copy-soft mt-3 text-xs uppercase tracking-[0.16em]">{formatAuditTime(entry.happenedAt)}</p>
    </div>
  );
}

function ActivityRow({
  label,
  detail,
  category,
  status,
  tone,
}: {
  label: string;
  detail: string;
  category: string;
  status: string;
  tone: "neutral" | "warning" | "danger" | "success";
}) {
  return (
    <div className="app-card flex items-start justify-between gap-4 p-4">
      <div className="min-w-0">
        <p className="accent-copy text-xs uppercase tracking-[0.18em]">{category}</p>
        <p className="title-main mt-2 text-lg">{label}</p>
        <p className="copy-soft mt-2 text-sm leading-6">{detail}</p>
      </div>
      <StatusPill value={status} tone={tone} />
    </div>
  );
}

function TaskRow({
  task,
  active,
  onSelect,
  onToggle,
  onDelete,
}: {
  task: Task;
  active?: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={clsx(
        "flex items-start gap-4 rounded-[1rem] border-b border-[color:color-mix(in_srgb,var(--surface-outline)_35%,transparent_65%)] pb-4 last:border-b-0 last:pb-0",
        active && "bg-[color:color-mix(in_srgb,var(--accent)_6%,transparent_94%)] px-3 pt-3",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={clsx(
          "mt-1 grid h-5 w-5 place-items-center rounded-full border",
          task.status === "done"
            ? "border-[var(--accent)] bg-[color:color-mix(in_srgb,var(--accent)_76%,transparent_24%)]"
            : task.status === "overdue"
              ? "border-[color:color-mix(in_srgb,var(--danger)_70%,transparent_30%)]"
              : "border-[color:color-mix(in_srgb,var(--text)_60%,transparent_40%)]",
        )}
      >
        {task.status === "done" ? <Check className="h-4 w-4 text-[var(--bg)]" /> : null}
      </button>
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onSelect}>
        <p className={clsx("text-xl", task.status === "done" ? "text-[var(--accent)]" : "title-main")}>{task.title}</p>
        <p className="mt-1 text-sm text-muted">{task.due}</p>
        {task.description ? <p className="copy-soft mt-2 text-sm leading-6">{task.description}</p> : null}
      </button>
      <div className="flex items-center gap-2">
        <StatusPill
          value={task.status === "overdue" ? "overdue" : task.priority}
          tone={task.status === "overdue" ? "danger" : task.priority === "medium" ? "warning" : "neutral"}
        />
        <button type="button" onClick={onDelete} className="icon-chip h-10 w-10" aria-label={`Delete ${task.title}`}>
          <Trash2 className="copy-soft h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function TaskEditor({
  task,
  onSave,
}: {
  task: Task;
  onSave: (taskId: string, updates: Partial<Task>) => void;
}) {
  return (
    <div className="space-y-3">
      <input value={task.title} onChange={(e) => onSave(task.id, { title: e.target.value })} className="field-input" />
      <input value={task.due} onChange={(e) => onSave(task.id, { due: e.target.value })} className="field-input" />
      <select value={task.priority} onChange={(e) => onSave(task.id, { priority: e.target.value as Task["priority"] })} className="field-input">
        <option value="low">Low priority</option>
        <option value="medium">Medium priority</option>
        <option value="high">High priority</option>
      </select>
      <select value={task.status} onChange={(e) => onSave(task.id, { status: e.target.value as Task["status"] })} className="field-input">
        <option value="pending">Pending</option>
        <option value="done">Done</option>
        <option value="overdue">Overdue</option>
      </select>
      <textarea
        value={task.description ?? ""}
        onChange={(e) => onSave(task.id, { description: e.target.value })}
        className="field-input min-h-32"
      />
    </div>
  );
}

function NotePreviewCard({ note }: { note: Note }) {
  return (
    <div className="app-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="title-main text-xl">{note.title}</p>
          <p className="mt-1 text-sm text-muted">Recently updated</p>
        </div>
        <button type="button" className="text-muted">
          •••
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        {note.tags.map((tag) => (
          <span key={tag} className="tag-chip px-3 py-1 text-sm">
            {tag}
          </span>
        ))}
      </div>

      <ul className="copy-soft mt-4 space-y-2 text-sm leading-7">
        {note.content
          .replace("Messy notes:", "")
          .split(",")
          .slice(0, 3)
          .map((line) => (
            <li key={line}>• {line.trim()}</li>
          ))}
      </ul>
    </div>
  );
}

function NoteEditor({
  note,
  onSave,
  onSummarize,
  onSuggestTags,
  onExtractTasks,
}: {
  note: Note;
  onSave: (noteId: string, updates: Partial<Note>) => void;
  onSummarize: (noteId: string) => void;
  onSuggestTags: (noteId: string) => void;
  onExtractTasks: () => void;
}) {
  return (
    <div className="space-y-5">
      <input value={note.title} onChange={(e) => onSave(note.id, { title: e.target.value })} className="field-input" />
      <div className="flex flex-wrap gap-2">
        {note.tags.map((tag) => (
          <span key={tag} className="rounded-full border border-[color:color-mix(in_srgb,var(--surface-outline)_55%,transparent_45%)] px-3 py-1 text-sm title-soft">
            {tag}
          </span>
        ))}
      </div>
      <textarea
        value={note.content}
        onChange={(e) => onSave(note.id, { content: e.target.value })}
        className="field-input min-h-56"
      />
      <div className="grid gap-3 md:grid-cols-3">
        <button type="button" className="soft-outline" onClick={() => onSummarize(note.id)}>
          Summarize
        </button>
        <button type="button" className="soft-outline" onClick={() => onSuggestTags(note.id)}>
          Suggest Tags
        </button>
        <button type="button" className="relay-button" onClick={onExtractTasks}>
          Extract Tasks
        </button>
      </div>
    </div>
  );
}

function ReminderCard({
  reminder,
  onUpdate,
  onDelete,
}: {
  reminder: Reminder;
  onUpdate: (reminderId: string, updates: Partial<Reminder>) => void;
  onDelete: (reminderId: string) => void;
}) {
  return (
    <div className="app-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="title-main text-lg">{reminder.title}</p>
          <p className="mt-1 text-sm text-muted">{reminder.when}</p>
          <p className="accent-copy mt-2 text-xs uppercase tracking-[0.18em]">Repeats {reminder.repeat}</p>
        </div>
        <StatusPill
          value={reminder.priority}
          tone={reminder.priority === "high" ? "danger" : reminder.priority === "medium" ? "warning" : "neutral"}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {reminder.status !== "done" ? (
          <button type="button" className="small-action primary" onClick={() => onUpdate(reminder.id, { status: "done" })}>
            Mark done
          </button>
        ) : null}
        {reminder.status !== "snoozed" ? (
          <button type="button" className="small-action" onClick={() => onUpdate(reminder.id, { status: "snoozed", when: `Snoozed • ${reminder.when}` })}>
            Snooze
          </button>
        ) : (
          <button type="button" className="small-action" onClick={() => onUpdate(reminder.id, { status: "active", when: reminder.when.replace(/^Snoozed • /, "") })}>
            Reactivate
          </button>
        )}
        <button type="button" className="small-action" onClick={() => onDelete(reminder.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}

function DraftEditor({
  draft,
  onSave,
  onDelete,
}: {
  draft: EmailDraft;
  onSave: (draftId: string, updates: Partial<EmailDraft>) => void;
  onDelete: (draftId: string) => void;
}) {
  return (
    <div className="space-y-3">
      <SyncStatusMeta
        status={draft.syncStatus}
        error={draft.syncError}
        externalUrl={draft.externalUrl}
        syncedLabel="Open Gmail draft"
        localLabel="This draft is still local to Relay"
      />
      <input
        value={draft.recipient}
        onChange={(e) => onSave(draft.id, { recipient: e.target.value })}
        placeholder="Recipient"
        className="field-input"
      />
      <input
        value={draft.subject}
        onChange={(e) => onSave(draft.id, { subject: e.target.value })}
        placeholder="Subject"
        className="field-input"
      />
      <select
        value={draft.tone}
        onChange={(e) => onSave(draft.id, { tone: e.target.value as EmailDraft["tone"] })}
        className="field-input"
      >
        <option value="professional">Professional</option>
        <option value="friendly">Friendly</option>
        <option value="short">Short</option>
        <option value="formal">Formal</option>
      </select>
      <textarea
        value={draft.body}
        onChange={(e) => onSave(draft.id, { body: e.target.value })}
        placeholder="Draft body"
        className="field-input min-h-56"
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="small-action primary" onClick={() => onSave(draft.id, { status: "approved" })}>
          Save Approved
        </button>
        <button type="button" className="small-action" onClick={() => onSave(draft.id, { status: "draft" })}>
          Keep as Draft
        </button>
        <button type="button" className="small-action" onClick={() => onDelete(draft.id)}>
          Delete Draft
        </button>
      </div>
    </div>
  );
}

function CalendarEventEditor({
  event,
  onSave,
}: {
  event: CalendarEvent;
  onSave: (eventId: string, updates: Partial<CalendarEvent>) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2">
        <SyncStatusMeta
          status={event.syncStatus}
          error={event.syncError}
          externalUrl={event.externalUrl}
          syncedLabel="Open Google Calendar event"
          localLabel="This event is still local to Relay"
        />
      </div>
      <input value={event.title} onChange={(e) => onSave(event.id, { title: e.target.value })} className="field-input md:col-span-2" />
      <input value={event.start} onChange={(e) => onSave(event.id, { start: e.target.value })} className="field-input" />
      <input value={event.end} onChange={(e) => onSave(event.id, { end: e.target.value })} className="field-input" />
      <input value={event.location ?? ""} onChange={(e) => onSave(event.id, { location: e.target.value })} className="field-input" />
      <select value={event.tone} onChange={(e) => onSave(event.id, { tone: e.target.value as CalendarEvent["tone"] })} className="field-input">
        <option value="teal">Teal</option>
        <option value="gold">Gold</option>
        <option value="rose">Rose</option>
      </select>
      <textarea value={event.detail} onChange={(e) => onSave(event.id, { detail: e.target.value })} className="field-input min-h-32 md:col-span-2" />
    </div>
  );
}

function StatChip({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  value: number;
  label: string;
  tone: "teal" | "rose" | "gold";
}) {
  return (
    <div className="status-panel px-4 py-4">
      <div className="flex items-center gap-3">
        <Icon
          className={clsx(
            "h-5 w-5",
            tone === "teal" && "text-[var(--accent)]",
            tone === "rose" && "text-[var(--danger)]",
            tone === "gold" && "text-[var(--warn)]",
          )}
        />
        <p className="title-soft text-[2rem] leading-none">{value}</p>
      </div>
      <p className="copy-soft mt-2 text-sm">{label}</p>
    </div>
  );
}

function ConfirmationRow({
  action,
  onApprove,
  onCancel,
}: {
  action: PendingAction;
  onApprove: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="app-card p-3.5">
      <div className="flex items-start gap-3">
        <div className={clsx("mt-0.5 rounded-[0.8rem] px-3 py-2 text-sm", iconToneClass(action.type))}>{iconSymbol(action.type)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="title-main text-base">{action.title}</p>
              <p className="mt-1 text-sm text-muted">{action.description}</p>
            </div>
            <StatusPill value={action.risk} tone={action.risk === "high" ? "danger" : action.risk === "medium" ? "warning" : "success"} />
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={onApprove} className="small-action primary">
              Approve
            </button>
            <button type="button" onClick={onCancel} className="small-action">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditableConfirmationCard({
  action,
  onChange,
  onApprove,
  onCancel,
}: {
  action: PendingAction;
  onChange: (actionId: string, updates: Partial<PendingAction>) => void;
  onApprove: () => void;
  onCancel: () => void;
}) {
  const taskList = Array.isArray(action.payload.tasks) ? action.payload.tasks.map((item) => String(item)).join("\n") : "";

  return (
    <div className="app-card p-4">
      <div className="flex items-start gap-3">
        <div className={clsx("mt-0.5 rounded-[0.8rem] px-3 py-2 text-sm", iconToneClass(action.type))}>{iconSymbol(action.type)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <input value={action.title} onChange={(e) => onChange(action.id, { title: e.target.value })} className="field-input" />
              <textarea value={action.description} onChange={(e) => onChange(action.id, { description: e.target.value })} className="field-input mt-3 min-h-20" />
            </div>
            <StatusPill value={action.risk} tone={action.risk === "high" ? "danger" : action.risk === "medium" ? "warning" : "success"} />
          </div>

          {action.type === "create_reminder" || action.type === "create_followup_task" ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input value={String(action.payload.title ?? "")} onChange={(e) => onChange(action.id, { payload: { title: e.target.value } })} placeholder="Reminder title" className="field-input" />
              <input value={String(action.payload.when ?? "")} onChange={(e) => onChange(action.id, { payload: { when: e.target.value } })} placeholder="When" className="field-input" />
            </div>
          ) : null}

          {action.type === "create_tasks_from_note" ? (
            <textarea
              value={taskList}
              onChange={(e) =>
                onChange(action.id, {
                  payload: {
                    tasks: e.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  },
                })
              }
              className="field-input mt-3 min-h-32"
            />
          ) : null}

          {action.type === "create_task" ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input value={String(action.payload.title ?? "")} onChange={(e) => onChange(action.id, { payload: { title: e.target.value } })} placeholder="Task title" className="field-input" />
              <input value={String(action.payload.due ?? "")} onChange={(e) => onChange(action.id, { payload: { due: e.target.value } })} placeholder="Due" className="field-input" />
            </div>
          ) : null}

          {action.type === "create_calendar_event" ? (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input value={String(action.payload.title ?? "")} onChange={(e) => onChange(action.id, { payload: { title: e.target.value } })} placeholder="Event title" className="field-input" />
              <input value={String(action.payload.start ?? "")} onChange={(e) => onChange(action.id, { payload: { start: e.target.value } })} placeholder="Start" className="field-input" />
              <input value={String(action.payload.end ?? "")} onChange={(e) => onChange(action.id, { payload: { end: e.target.value } })} placeholder="End" className="field-input" />
              <input value={String(action.payload.location ?? "")} onChange={(e) => onChange(action.id, { payload: { location: e.target.value } })} placeholder="Location" className="field-input" />
            </div>
          ) : null}

          {action.type === "draft_email" ? (
            <p className="copy-soft mt-3 text-sm leading-7">
              Approving this marks the prepared draft as ready in the assistant workspace. You can still open the draft and edit the recipient, subject, or message body afterward.
            </p>
          ) : null}

          {action.type === "place_call" ? (
            <p className="copy-soft mt-3 text-sm leading-7">
              Approving this runs the simulated call flow using the current call plan and saves the transcript plus summary to the Calls page.
            </p>
          ) : null}

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={onApprove} className="small-action primary">
              Approve
            </button>
            <button type="button" onClick={onCancel} className="small-action">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryConfirmationCard({ action }: { action: PendingAction }) {
  return (
    <div className="app-card p-4">
      <div className="flex items-start gap-3">
        <div className={clsx("mt-0.5 rounded-[0.8rem] px-3 py-2 text-sm", iconToneClass(action.type))}>{iconSymbol(action.type)}</div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="title-main text-base">{action.title}</p>
              <p className="mt-1 text-sm text-muted">{action.description}</p>
            </div>
            <StatusPill
              value={action.status}
              tone={action.status === "approved" ? "success" : "neutral"}
            />
          </div>
          <p className="copy-soft mt-3 text-xs uppercase tracking-[0.18em]">
            Risk: {action.risk}
          </p>
        </div>
      </div>
    </div>
  );
}

function IntegrationToggle({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="app-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="title-main text-base">{label}</p>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={clsx("theme-pill shrink-0", enabled && "active")}
        >
          {enabled ? "Enabled" : "Disabled"}
        </button>
      </div>
    </div>
  );
}

function iconToneClass(type: PendingAction["type"]) {
  if (type === "draft_email") {
    return "bg-[#2d4269] text-[#d9e4ff]";
  }
  if (type === "create_reminder") {
    return "bg-[#2b5a51] text-[#ccefe8]";
  }
  if (type === "place_call") {
    return "bg-[#5a4166] text-[#eadbff]";
  }
  if (type === "create_calendar_event") {
    return "bg-[#3d4f76] text-[#dfe8ff]";
  }
  return "bg-[#6a4e2a] text-[#f6e2bc]";
}

function iconSymbol(type: PendingAction["type"]) {
  if (type === "draft_email") {
    return "✉";
  }
  if (type === "create_reminder") {
    return "□";
  }
  if (type === "place_call") {
    return "◔";
  }
  if (type === "create_calendar_event") {
    return "◫";
  }
  return "✓";
}

function NotificationRow({
  notification,
  onMarkRead,
  onRecategory,
}: {
  notification: NotificationItem;
  onMarkRead?: () => void;
  onRecategory?: (category: NotificationItem["category"]) => void;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="notification-icon">
        {notification.source === "University LMS"
          ? "🎓"
          : notification.source === "Work"
            ? "✳"
            : notification.source === "Finance"
              ? "◌"
              : "◐"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="title-main text-xl">{notification.source}</p>
              {notification.isRead ? <span className="copy-soft text-xs uppercase tracking-[0.16em]">Read</span> : null}
            </div>
            <p className="copy-soft mt-1 text-sm">{notification.body}</p>
          </div>
          <StatusPill value={notification.category} tone={notification.category === "urgent" ? "danger" : notification.category === "important" ? "warning" : "neutral"} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {!notification.isRead && onMarkRead ? (
            <button type="button" className="small-action" onClick={onMarkRead}>
              Mark read
            </button>
          ) : null}
          {onRecategory ? (
            <>
              <button type="button" className="small-action" onClick={() => onRecategory("urgent")}>
                Urgent
              </button>
              <button type="button" className="small-action" onClick={() => onRecategory("important")}>
                Important
              </button>
              <button type="button" className="small-action" onClick={() => onRecategory("later")}>
                Later
              </button>
              <button type="button" className="small-action" onClick={() => onRecategory("low")}>
                Low
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SyncStatusMeta({
  status,
  error,
  externalUrl,
  syncedLabel,
  localLabel,
}: {
  status?: "local" | "synced" | "failed";
  error?: string;
  externalUrl?: string;
  syncedLabel: string;
  localLabel: string;
}) {
  if (!status) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <StatusPill
        value={status}
        tone={status === "synced" ? "success" : status === "failed" ? "danger" : "neutral"}
      />
      {status === "synced" ? (
        externalUrl ? (
          <a href={externalUrl} target="_blank" rel="noreferrer" className="accent-copy underline-offset-4 hover:underline">
            {syncedLabel}
          </a>
        ) : (
          <span className="copy-soft">{syncedLabel}</span>
        )
      ) : null}
      {status === "local" ? <span className="copy-soft">{localLabel}</span> : null}
      {status === "failed" ? <span className="text-[var(--danger)]">{error ?? "Sync failed."}</span> : null}
    </div>
  );
}

function StatusPill({ value, tone }: { value: string; tone: "neutral" | "warning" | "danger" | "success" }) {
  return (
    <span className={clsx("status-pill", tone)}>
      {value.replaceAll("_", " ")}
    </span>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="feature-panel p-5">
      <p className="eyebrow">{label}</p>
      <p className="title-hero mt-4 font-display text-5xl">{value}</p>
      <p className="mt-2 text-sm text-muted">{detail}</p>
    </div>
  );
}

function formatAuditTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
