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
  Home,
  Mail,
  PhoneCall,
  Search,
  Send,
  Settings,
  Sparkles,
  StickyNote,
  SunMedium,
} from "lucide-react";
import { useState } from "react";
import {
  initialCalls,
  initialEmailDrafts,
  initialNotes,
  initialNotifications,
  initialPendingActions,
  initialReminders,
  initialTasks,
} from "@/lib/data";
import type {
  CallRequest,
  EmailDraft,
  NavKey,
  Note,
  NotificationItem,
  PendingAction,
  Reminder,
  Task,
} from "@/lib/types";

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
];

const scheduleItems = [
  { time: "9:00 AM", title: "Data Structures Lecture", detail: "CS Building, Room 301", tone: "teal" },
  { time: "11:00 AM", title: "Study Group", detail: "Library, Room 2B", tone: "teal" },
  { time: "3:00 PM", title: "Project Meeting", detail: "Online • Google Meet", tone: "gold" },
  { time: "6:30 PM", title: "Gym", detail: "Fitness Session", tone: "teal" },
] as const;

const suggestions = [
  "You have a gap at 1:00 PM. Good time to study.",
  "Consider starting your project earlier.",
  "3 tasks can be scheduled around your classes.",
];

const todayBrief =
  "You have 2 reminders, 1 overdue task, 1 email draft waiting for approval, and a call request ready to confirm.";

export function JarvisApp({ section = "dashboard" }: { section?: NavKey }) {
  const [command, setCommand] = useState("");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [notes] = useState<Note[]>(initialNotes);
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [drafts, setDrafts] = useState<EmailDraft[]>(initialEmailDrafts);
  const [calls, setCalls] = useState<CallRequest[]>(initialCalls);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>(initialPendingActions);
  const [assistantFeed, setAssistantFeed] = useState<string[]>([
    "I can prepare reminders, email drafts, note summaries, and simulated call plans. Important actions always wait for your approval.",
  ]);

  const pendingApprovals = pendingActions.filter((item) => item.status === "pending");
  const pendingCount = pendingApprovals.length;
  const highPriorityTasks = tasks.filter((task) => task.priority === "high" && task.status !== "done");
  const overdueCount = tasks.filter((task) => task.status === "overdue").length;
  const activeReminderCount = reminders.filter((reminder) => reminder.status === "active").length;
  const pendingDraftCount = drafts.filter((draft) => draft.status === "draft").length;
  const pendingCallCount = calls.filter((call) => call.status === "pending").length;
  const notesPreview = notes[0];

  function submitCommand() {
    if (!command.trim()) {
      return;
    }

    const input = command.trim();
    const lower = input.toLowerCase();

    if (lower.includes("remind me")) {
      const newAction: PendingAction = {
        id: crypto.randomUUID(),
        type: "create_reminder",
        title: "Create Reminder",
        description: "Submit project • Fri, 5:00 PM",
        risk: "medium",
        status: "pending",
        payload: {
          title: "Submit project",
          when: "Friday, 5:00 PM",
          repeat: "none",
          priority: "high",
        },
      };
      setPendingActions((current) => [newAction, ...current]);
      setAssistantFeed((current) => [
        `Prepared a reminder proposal for "${input}". It is waiting in Confirmations.`,
        ...current,
      ]);
    } else if (lower.includes("draft an email")) {
      const draftId = crypto.randomUUID();
      const newDraft: EmailDraft = {
        id: draftId,
        recipient: "Recipient to be confirmed",
        subject: "Request for an Extension",
        tone: "professional",
        status: "draft",
        body:
          "Hi,\n\nI hope you're doing well. I wanted to ask whether a short extension would be possible. I have been working steadily on the assignment and would appreciate a little more time to submit my best work.\n\nThank you for considering it.\n\nBest,\nRami",
      };
      const newAction: PendingAction = {
        id: crypto.randomUUID(),
        type: "draft_email",
        title: "Email Draft to Professor",
        description: "Asking for extension on assignment",
        risk: "medium",
        status: "pending",
        payload: { draftId },
      };
      setDrafts((current) => [newDraft, ...current]);
      setPendingActions((current) => [newAction, ...current]);
      setAssistantFeed((current) => [
        "Drafted an email request and queued it for approval before saving.",
        ...current,
      ]);
    } else if (lower.includes("call")) {
      const callId = crypto.randomUUID();
      const newCall: CallRequest = {
        id: callId,
        contactName: "Campus Gym",
        phoneNumber: "(555) 210-1184",
        purpose: "Ask if basketball court is free tonight",
        script:
          "Hi, I'm JARVIS, an AI assistant calling on behalf of Rami. I'm checking whether the basketball court is free tonight and whether there are any time restrictions.",
        allowedActions: ["Ask availability", "Ask closing time"],
        restrictedActions: ["Do not book anything", "Do not share private details"],
        status: "pending",
      };
      const newAction: PendingAction = {
        id: crypto.randomUUID(),
        type: "place_call",
        title: "Call Campus Gym",
        description: "Ask about basketball court availability",
        risk: "high",
        status: "pending",
        payload: { callId },
      };
      setCalls((current) => [newCall, ...current]);
      setPendingActions((current) => [newAction, ...current]);
      setAssistantFeed((current) => [
        "Created a transparent call plan with a script and allowed actions. It is waiting for approval.",
        ...current,
      ]);
    } else if (lower.includes("note") || lower.includes("task")) {
      const newAction: PendingAction = {
        id: crypto.randomUUID(),
        type: "create_tasks_from_note",
        title: "Create Task from Note",
        description: "3 tasks identified",
        risk: "low",
        status: "pending",
        payload: {
          tasks: [
            "Confirm timeline with professor",
            "Clean dataset labels",
            "Email the team the experiment checklist",
          ],
        },
      };
      setPendingActions((current) => [newAction, ...current]);
      setAssistantFeed((current) => [
        "Extracted action items from your note and sent them to Confirmations for review.",
        ...current,
      ]);
    } else {
      setAssistantFeed((current) => [
        "I understood the request at a high level and would ask one focused follow-up before creating an action proposal in the real agent flow.",
        ...current,
      ]);
    }

    setCommand("");
  }

  function approveAction(action: PendingAction) {
    if (action.type === "create_reminder") {
      setReminders((current) => [
        {
          id: crypto.randomUUID(),
          title: String(action.payload.title),
          when: String(action.payload.when),
          repeat: "none",
          priority: "high",
          status: "active",
        },
        ...current,
      ]);
    }

    if (action.type === "create_tasks_from_note") {
      const extracted = Array.isArray(action.payload.tasks) ? action.payload.tasks : [];
      setTasks((current) => [
        ...extracted.map((title, index) => ({
          id: crypto.randomUUID(),
          title: String(title),
          due: index === 0 ? "Tomorrow, 1:00 PM" : "Friday, 4:00 PM",
          status: "pending" as const,
          priority: "medium" as const,
        })),
        ...current,
      ]);
    }

    if (action.type === "draft_email") {
      const draftId = String(action.payload.draftId);
      setDrafts((current) =>
        current.map((draft) => (draft.id === draftId ? { ...draft, status: "approved" } : draft)),
      );
    }

    if (action.type === "place_call") {
      const callId = String(action.payload.callId);
      setCalls((current) =>
        current.map((call) =>
          call.id === callId
            ? {
                ...call,
                status: "simulated",
                transcript:
                  "JARVIS: Hi, I'm JARVIS calling on behalf of Rami.\nGym: The court should be free after 7:30 PM.\nJARVIS: Thanks. Is there a closing time?\nGym: We close at 10 PM tonight.\nJARVIS: Perfect, I'll pass that along.",
                summary: "Court is free after 7:30 PM and the gym closes at 10 PM.",
              }
            : call,
        ),
      );
    }

    if (action.type === "create_followup_task") {
      setReminders((current) => [
        {
          id: crypto.randomUUID(),
          title: String(action.payload.title),
          when: String(action.payload.when),
          repeat: "none",
          priority: "medium",
          status: "active",
        },
        ...current,
      ]);
    }

    setPendingActions((current) =>
      current.map((item) => (item.id === action.id ? { ...item, status: "approved" } : item)),
    );
  }

  function cancelAction(id: string) {
    setPendingActions((current) =>
      current.map((item) => (item.id === id ? { ...item, status: "cancelled" } : item)),
    );
  }

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(86,211,208,0.08),_transparent_24%),radial-gradient(circle_at_top_right,_rgba(226,190,125,0.07),_transparent_16%),radial-gradient(circle_at_center,_rgba(255,255,255,0.02),_transparent_28%)]" />
        <div className="mx-auto max-w-[1560px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="jarvis-shell flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden lg:flex-row">
            <aside className="flex w-full shrink-0 flex-col border-b border-white/6 px-5 py-6 lg:w-[276px] lg:border-b-0 lg:border-r lg:px-4">
              <div className="flex items-start justify-between">
                <p className="font-display text-[3rem] tracking-[0.08em] text-[#e7cfab]">JARVIS</p>
                <button type="button" className="icon-chip mt-2 hidden lg:inline-flex">
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </button>
              </div>

              <nav className="mt-8 space-y-2">
                {navItems.map(({ key, label, href, icon: Icon }) => (
                  <Link
                    key={key}
                    href={href}
                    className={clsx(
                      "flex w-full items-center justify-between rounded-[1.15rem] border px-4 py-3.5 text-left transition",
                      section === key
                        ? "border-[#56d3d0]/40 bg-[linear-gradient(90deg,rgba(86,211,208,0.14),rgba(255,255,255,0.02))] text-[#f7f0e2]"
                        : "border-transparent text-[#d9dbd7] hover:border-white/8 hover:bg-white/[0.03] hover:text-[#f7f0e2]",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className={clsx("h-4 w-4", section === key ? "text-[#f1d4a3]" : "text-[#b9b9b4]")} />
                      {label}
                    </span>
                    {key === "confirmations" && pendingCount > 0 ? (
                      <span className="rounded-full border border-[#a07f43]/50 bg-[#241e16] px-2.5 py-0.5 text-xs font-semibold text-[#f0cf94]">
                        {pendingCount}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </nav>

              <div className="mt-auto space-y-4">
                <div className="soft-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="avatar-chip">RH</div>
                    <div>
                      <p className="text-sm font-medium text-[#f5efe4]">Rami Hassan</p>
                      <p className="text-sm text-[#56d3d0]">Pro Plan</p>
                    </div>
                  </div>
                </div>

                <div className="soft-card relative overflow-hidden p-4">
                  <div className="absolute left-4 top-5 h-14 w-14 rounded-full border border-[#56d3d0]/25 bg-[radial-gradient(circle,_rgba(86,211,208,0.25),_transparent_58%)] blur-[2px]" />
                  <div className="relative pl-16">
                    <p className="text-lg text-[#eae5db]">JARVIS Online</p>
                    <p className="mt-1 text-sm text-muted">Ready to help.</p>
                  </div>
                </div>
              </div>
            </aside>

            <section className="flex flex-1 flex-col px-5 py-5 lg:px-6">
              <TopCommandBar command={command} setCommand={setCommand} submitCommand={submitCommand} />
              {renderSection({
                section,
                tasks,
                notes,
                reminders,
                drafts,
                calls,
                pendingApprovals,
                pendingCount,
                highPriorityTasks,
                overdueCount,
                activeReminderCount,
                pendingDraftCount,
                pendingCallCount,
                notesPreview,
                assistantFeed,
                approveAction,
                cancelAction,
              })}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function renderSection({
  section,
  tasks,
  notes,
  reminders,
  drafts,
  calls,
  pendingApprovals,
  pendingCount,
  highPriorityTasks,
  overdueCount,
  activeReminderCount,
  pendingDraftCount,
  pendingCallCount,
  notesPreview,
  assistantFeed,
  approveAction,
  cancelAction,
}: {
  section: NavKey;
  tasks: Task[];
  notes: Note[];
  reminders: Reminder[];
  drafts: EmailDraft[];
  calls: CallRequest[];
  pendingApprovals: PendingAction[];
  pendingCount: number;
  highPriorityTasks: Task[];
  overdueCount: number;
  activeReminderCount: number;
  pendingDraftCount: number;
  pendingCallCount: number;
  notesPreview?: Note;
  assistantFeed: string[];
  approveAction: (action: PendingAction) => void;
  cancelAction: (id: string) => void;
}) {
  switch (section) {
    case "dashboard":
      return (
        <>
          <div className="mt-5 grid gap-4 xl:grid-cols-[1.7fr_0.95fr]">
            <section className="hero-panel">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">Today Brief</p>
                  <h1 className="mt-5 font-display text-[3rem] leading-[1.02] text-[#ead3af] sm:text-[4rem]">
                    Good morning, Rami.
                  </h1>
                  <p className="mt-4 max-w-[620px] text-xl leading-9 text-[#f0e9db]">{todayBrief}</p>
                </div>
                <button type="button" className="soft-outline hidden lg:inline-flex">
                  Generate again
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
            </section>

            <section className="feature-panel">
              <div className="mb-6 flex items-center justify-between">
                <p className="eyebrow">Schedule</p>
                <Link href="/calendar" className="panel-link">
                  View Calendar
                </Link>
              </div>

              <div className="space-y-6">
                {scheduleItems.map((item, index) => (
                  <div key={`${item.time}-${item.title}`} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="h-3 w-3 rounded-full border border-white/90 bg-transparent" />
                      {index < scheduleItems.length - 1 ? <span className="mt-2 h-full w-px bg-white/10" /> : null}
                    </div>
                    <div className="min-w-[78px] text-sm text-[#e3ddd0]">{item.time}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span
                          className={clsx(
                            "h-2.5 w-2.5 rounded-full",
                            item.tone === "teal" ? "bg-[#56d3d0]" : "bg-[#ddb26f]",
                          )}
                        />
                        <p className="text-xl text-[#f5efe4]">{item.title}</p>
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
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            </DashboardPanel>

            <DashboardPanel title="Confirmations Queue" actionLabel={`View all (${pendingApprovals.length})`} href="/confirmations">
              <div className="space-y-3">
                {pendingApprovals.slice(0, 4).map((action) => (
                  <ConfirmationRow
                    key={action.id}
                    action={action}
                    onApprove={() => approveAction(action)}
                    onCancel={() => cancelAction(action.id)}
                  />
                ))}
              </div>
            </DashboardPanel>

            <DashboardPanel title="Notifications Intelligence" actionLabel="View all" href="/notifications">
              <div className="space-y-4">
                {initialNotifications.map((notification) => (
                  <NotificationRow key={notification.id} notification={notification} />
                ))}
              </div>
            </DashboardPanel>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <DashboardPanel title="Notes Preview" actionLabel="Open notes" href="/notes">
              {notesPreview ? (
                <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xl text-[#f6f0e4]">{notesPreview.title}</p>
                      <p className="mt-1 text-sm text-muted">Today, 9:40 AM</p>
                    </div>
                    <button type="button" className="text-muted">
                      •••
                    </button>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {notesPreview.tags.map((tag) => (
                      <span key={tag} className="rounded-xl bg-white/8 px-3 py-1 text-sm text-[#ece5d8]">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <ul className="mt-4 space-y-2 text-sm leading-7 text-[#d8d3c7]">
                    {notesPreview.content
                      .replace("Messy notes:", "")
                      .split(",")
                      .slice(0, 3)
                      .map((line) => (
                        <li key={line}>• {line.trim()}</li>
                      ))}
                  </ul>
                </div>
              ) : null}
            </DashboardPanel>

            <DashboardPanel title="Call Assistant" actionLabel="View calls" href="/calls">
              <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[radial-gradient(circle,_rgba(86,211,208,0.25),_rgba(86,211,208,0.08))] text-[#61ddd5]">
                      <PhoneCall className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-sm text-muted">Pending Call Plan</p>
                      <p className="mt-1 text-[2rem] leading-none text-[#f3ebde]">{calls[0]?.contactName ?? "Campus Gym"}</p>
                      <p className="mt-2 text-sm text-[#ded7ca]">{calls[0]?.purpose ?? "Ask if basketball court is free tonight"}</p>
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
                    className="jarvis-button"
                    onClick={() => {
                      const pendingCall = pendingApprovals.find((action) => action.type === "place_call");
                      if (pendingCall) {
                        approveAction(pendingCall);
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
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="flex w-full items-center justify-between rounded-[1.1rem] border border-white/8 bg-white/[0.03] px-4 py-4 text-left transition hover:border-[#a07f43]/40"
                  >
                    <span className="flex items-center gap-3 text-[#efe7da]">
                      <Sparkles className="h-4 w-4 text-[#56d3d0]" />
                      <span>{suggestion}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted" />
                  </button>
                ))}
              </div>
            </DashboardPanel>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <MetricCard label="Open approvals" value={String(pendingCount)} detail="Transparent action queue" />
            <MetricCard label="Priority tasks" value={String(highPriorityTasks.length)} detail="Focused for today" />
            <MetricCard
              label="Simulated calls"
              value={String(calls.filter((call) => call.status === "simulated").length)}
              detail="Ready for follow-up"
            />
          </div>

          <div className="mt-4 feature-panel">
            <div className="mb-4 flex items-center justify-between">
              <p className="eyebrow">Assistant Feed</p>
              <Link href="/assistant" className="panel-link">
                Open Assistant
              </Link>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {assistantFeed.slice(0, 4).map((message) => (
                <div key={message} className="rounded-[1.15rem] border border-white/8 bg-white/[0.03] p-4 text-sm leading-7 text-[#e8e0d4]">
                  {message}
                </div>
              ))}
            </div>
          </div>
        </>
      );
    case "tasks":
      return (
        <SectionPage
          eyebrow="Task Center"
          title="Real task workflows, not just a preview card."
          description="Filter your work, spot overdue items fast, and keep AI-generated tasks separate until you approve them."
        >
          <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
            <DashboardPanel title="All Tasks">
              <div className="mb-5 flex flex-wrap gap-2">
                {["Today", "Upcoming", "Overdue", "Completed"].map((label) => (
                  <button key={label} type="button" className="small-action">
                    {label}
                  </button>
                ))}
              </div>
              <div className="space-y-4">
                {tasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            </DashboardPanel>

            <div className="space-y-4">
              <MetricCard label="High priority" value={String(highPriorityTasks.length)} detail="Needs focus first" />
              <MetricCard label="Overdue" value={String(overdueCount)} detail="Worth clearing today" />
              <DashboardPanel title="Suggested Next Move">
                <p className="text-sm leading-7 text-[#e7dfd1]">
                  Convert the research note into approved tasks, then block time after your 3 PM meeting to finish the outline.
                </p>
              </DashboardPanel>
            </div>
          </div>
        </SectionPage>
      );
    case "notes":
      return (
        <SectionPage
          eyebrow="Notes Workspace"
          title="Capture rough thoughts, then let JARVIS structure them."
          description="Each note can be summarized, tagged, and turned into tasks or reminders through the confirmation flow."
        >
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <DashboardPanel title="Note Library">
              <div className="space-y-3">
                {notes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    className="w-full rounded-[1.15rem] border border-white/8 bg-white/[0.03] p-4 text-left transition hover:border-[#a07f43]/40"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-lg text-[#f7efe3]">{note.title}</p>
                      <span className="text-xs uppercase tracking-[0.2em] text-[#56d3d0]">{note.tags[0]}</span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[#d8d2c7]">{note.summary}</p>
                  </button>
                ))}
              </div>
            </DashboardPanel>

            <DashboardPanel title={notesPreview?.title ?? "Selected Note"}>
              {notesPreview ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap gap-2">
                    {notesPreview.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-white/8 px-3 py-1 text-sm text-[#efe6d7]">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="rounded-[1.15rem] border border-white/8 bg-[#111719]/75 p-5 text-sm leading-8 text-[#e8dfd2]">
                    {notesPreview.content}
                  </p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <button type="button" className="soft-outline">
                      Summarize
                    </button>
                    <button type="button" className="soft-outline">
                      Suggest Tags
                    </button>
                    <button type="button" className="jarvis-button">
                      Extract Tasks
                    </button>
                  </div>
                </div>
              ) : null}
            </DashboardPanel>
          </div>
        </SectionPage>
      );
    case "confirmations":
      return (
        <SectionPage
          eyebrow="Approval Center"
          title="Important actions stay transparent."
          description="Every email draft, reminder, extracted task, and call request waits here until you review it."
        >
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <DashboardPanel title={`Pending Actions (${pendingApprovals.length})`}>
              <div className="space-y-3">
                {pendingApprovals.map((action) => (
                  <ConfirmationRow
                    key={action.id}
                    action={action}
                    onApprove={() => approveAction(action)}
                    onCancel={() => cancelAction(action.id)}
                  />
                ))}
              </div>
            </DashboardPanel>

            <div className="space-y-4">
              <MetricCard label="Awaiting review" value={String(pendingCount)} detail="Nothing executes automatically" />
              <DashboardPanel title="Approval Rules">
                <ul className="space-y-3 text-sm leading-7 text-[#e5ddd0]">
                  <li>• Low risk: summaries, tags, and note insights.</li>
                  <li>• Medium risk: reminders, drafts, and extracted tasks.</li>
                  <li>• High risk: calls and future external integrations.</li>
                </ul>
              </DashboardPanel>
            </div>
          </div>
        </SectionPage>
      );
    case "assistant":
      return (
        <SectionPage
          eyebrow="Assistant"
          title="Natural language in, structured actions out."
          description="This workspace will become the main AI command center. For the MVP, it already prepares reminders, email drafts, note actions, and call plans."
        >
          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <DashboardPanel title="Recent Assistant Feed">
              <div className="space-y-3">
                {assistantFeed.map((message) => (
                  <div key={message} className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-4 text-sm leading-7 text-[#efe5d8]">
                    {message}
                  </div>
                ))}
              </div>
            </DashboardPanel>
            <DashboardPanel title="Command Patterns">
              <div className="space-y-3">
                {commandSamples.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    className="w-full rounded-[1.1rem] border border-white/8 bg-white/[0.03] px-4 py-4 text-left text-sm text-[#efe7da] transition hover:border-[#a07f43]/40"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </DashboardPanel>
          </div>
        </SectionPage>
      );
    case "reminders":
      return (
        <SectionPage eyebrow="Reminders" title="Keep commitments visible." description="Simple repeat rules, priority levels, and approval-backed AI reminders are already part of the MVP direction.">
          <DashboardPanel title="Active Reminders">
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg text-[#f5eee3]">{reminder.title}</p>
                      <p className="mt-1 text-sm text-muted">{reminder.when}</p>
                    </div>
                    <StatusPill value={reminder.priority} tone={reminder.priority === "high" ? "danger" : "warning"} />
                  </div>
                </div>
              ))}
            </div>
          </DashboardPanel>
        </SectionPage>
      );
    case "calendar":
      return (
        <SectionPage eyebrow="Calendar" title="Mock schedule now, real sync later." description="The MVP keeps calendar data local first so the confirmation flow stays reliable before external integrations are added.">
          <DashboardPanel title="Today's Schedule">
            <div className="space-y-4">
              {scheduleItems.map((item) => (
                <div key={`${item.time}-${item.title}`} className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-sm uppercase tracking-[0.18em] text-[#56d3d0]">{item.time}</p>
                  <p className="mt-2 text-xl text-[#f5eee2]">{item.title}</p>
                  <p className="mt-1 text-sm text-muted">{item.detail}</p>
                </div>
              ))}
            </div>
          </DashboardPanel>
        </SectionPage>
      );
    case "calls":
      return (
        <SectionPage eyebrow="Calls" title="A transparent calling assistant." description="Call plans clearly state who JARVIS is contacting, what it may ask, and what it must not do.">
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <DashboardPanel title="Call Queue">
              <div className="space-y-4">
                {calls.map((call) => (
                  <div key={call.id} className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xl text-[#f5ede1]">{call.contactName}</p>
                        <p className="mt-1 text-sm text-muted">{call.purpose}</p>
                      </div>
                      <StatusPill value={call.status} tone={call.status === "pending" ? "warning" : "success"} />
                    </div>
                    <p className="mt-4 text-sm leading-7 text-[#e6ddcf]">{call.script}</p>
                  </div>
                ))}
              </div>
            </DashboardPanel>
            <DashboardPanel title="Latest Summary">
              <p className="text-sm leading-8 text-[#e9e0d3]">{calls[0]?.summary ?? "Approve a call plan to generate a transcript and summary."}</p>
              {calls[0]?.transcript ? (
                <pre className="mt-4 overflow-x-auto rounded-[1rem] border border-white/8 bg-[#111719]/75 p-4 text-xs leading-7 text-[#d7d0c4] whitespace-pre-wrap">
                  {calls[0].transcript}
                </pre>
              ) : null}
            </DashboardPanel>
          </div>
        </SectionPage>
      );
    case "notifications":
      return (
        <SectionPage eyebrow="Notifications" title="See what matters now." description="JARVIS can group mock notifications by urgency so the dashboard stays calm instead of noisy.">
          <DashboardPanel title="Notification Ranking">
            <div className="space-y-5">
              {initialNotifications.map((notification) => (
                <NotificationRow key={notification.id} notification={notification} />
              ))}
            </div>
          </DashboardPanel>
        </SectionPage>
      );
    case "settings":
      return (
        <SectionPage eyebrow="Settings" title="Preferences and future integrations." description="This area is ready for auth preferences, integration toggles, and consent controls once the backend layer is added.">
          <div className="grid gap-4 md:grid-cols-2">
            <DashboardPanel title="Assistant Preferences">
              <ul className="space-y-3 text-sm leading-7 text-[#e7dfd1]">
                <li>• Default tone: calm and professional</li>
                <li>• Important actions require explicit approval</li>
                <li>• Simulated calls identify JARVIS clearly</li>
              </ul>
            </DashboardPanel>
            <DashboardPanel title="Coming Integrations">
              <ul className="space-y-3 text-sm leading-7 text-[#e7dfd1]">
                <li>• Google Calendar</li>
                <li>• Gmail or Outlook drafts and send approvals</li>
                <li>• Real outbound calls with policy-safe confirmation</li>
              </ul>
            </DashboardPanel>
          </div>
        </SectionPage>
      );
    default:
      return null;
  }
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
    <div className="flex items-start gap-4">
      <div className="command-bar flex-1">
        <button type="button" className="icon-chip hidden sm:inline-flex">
          <Sparkles className="h-4 w-4 text-[#e4c08d]" />
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-base text-[#e9e1d5]">What would you like JARVIS to do?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {commandSamples.slice(0, 2).map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setCommand(sample)}
                className="rounded-full border border-white/8 px-3 py-1.5 text-sm text-muted transition hover:border-[#a07f43]/45 hover:text-[#efe8da]"
              >
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
            className="mt-3 w-full bg-transparent text-sm text-[#f7f0e2] outline-none placeholder:text-muted"
          />
        </div>

        <button type="button" className="icon-chip" onClick={submitCommand}>
          <Send className="h-4 w-4 text-[#f0cf94]" />
        </button>
      </div>

      <div className="hidden items-center gap-3 lg:flex">
        <button type="button" className="icon-chip">
          <Search className="h-4 w-4 text-[#e4c08d]" />
        </button>
        <button type="button" className="icon-chip">
          <SunMedium className="h-4 w-4 text-[#e4c08d]" />
        </button>
        <button type="button" className="icon-chip">
          <Bell className="h-4 w-4 text-[#f2eee6]" />
        </button>
      </div>
    </div>
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
        <h1 className="mt-5 max-w-[760px] font-display text-[2.8rem] leading-[1.05] text-[#ead3af] sm:text-[3.6rem]">
          {title}
        </h1>
        <p className="mt-4 max-w-[720px] text-lg leading-8 text-[#f0e7d9]">{description}</p>
      </section>
      <div className="mt-4">{children}</div>
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

function TaskRow({ task }: { task: Task }) {
  return (
    <div className="flex items-start gap-4 border-b border-white/8 pb-4 last:border-b-0 last:pb-0">
      <div
        className={clsx(
          "mt-1 grid h-5 w-5 place-items-center rounded-full border",
          task.status === "done"
            ? "border-[#56d3d0] bg-[#56d3d0]/80"
            : task.status === "overdue"
              ? "border-white/60"
              : "border-white/70",
        )}
      >
        {task.status === "done" ? <Check className="h-4 w-4 text-[#071014]" /> : null}
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={clsx("text-xl", task.status === "done" ? "text-[#56d3d0]" : "text-[#f5efe4]")}>{task.title}</p>
            <p className="mt-1 text-sm text-muted">{task.due}</p>
            {task.description ? <p className="mt-2 text-sm leading-6 text-[#d8d1c5]">{task.description}</p> : null}
          </div>
          <StatusPill
            value={task.status === "overdue" ? "overdue" : task.priority}
            tone={task.status === "overdue" ? "danger" : task.priority === "medium" ? "warning" : "neutral"}
          />
        </div>
      </div>
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
    <div className="rounded-[1.15rem] border border-white/8 bg-[#111719]/75 px-4 py-4">
      <div className="flex items-center gap-3">
        <Icon
          className={clsx(
            "h-5 w-5",
            tone === "teal" && "text-[#56d3d0]",
            tone === "rose" && "text-[#ff6e71]",
            tone === "gold" && "text-[#e8c182]",
          )}
        />
        <p className="text-[2rem] leading-none text-[#f2e7d5]">{value}</p>
      </div>
      <p className="mt-2 text-sm text-[#d8d2c7]">{label}</p>
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
  const toneClass =
    action.type === "draft_email"
      ? "bg-[#2d4269] text-[#d9e4ff]"
      : action.type === "create_reminder"
        ? "bg-[#2b5a51] text-[#ccefe8]"
        : action.type === "place_call"
          ? "bg-[#5a4166] text-[#eadbff]"
          : "bg-[#6a4e2a] text-[#f6e2bc]";

  return (
    <div className="rounded-[1.15rem] border border-white/8 bg-white/[0.03] p-3.5">
      <div className="flex items-start gap-3">
        <div className={clsx("mt-0.5 rounded-[0.8rem] px-3 py-2 text-sm", toneClass)}>
          {action.type === "draft_email"
            ? "✉"
            : action.type === "create_reminder"
              ? "□"
              : action.type === "place_call"
                ? "◔"
                : "✓"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base text-[#f4eee3]">{action.title}</p>
              <p className="mt-1 text-sm text-muted">{action.description}</p>
            </div>
            <StatusPill
              value={action.risk}
              tone={action.risk === "high" ? "danger" : action.risk === "medium" ? "warning" : "success"}
            />
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

function NotificationRow({ notification }: { notification: NotificationItem }) {
  return (
    <div className="flex items-start gap-4">
      <div className="grid h-11 w-11 place-items-center rounded-[0.95rem] bg-white/[0.04] text-xl">
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
            <p className="text-xl text-[#f6f0e4]">{notification.source}</p>
            <p className="mt-1 text-sm text-[#d8d2c7]">{notification.body}</p>
          </div>
          <StatusPill
            value={notification.category}
            tone={notification.category === "urgent" ? "danger" : notification.category === "important" ? "warning" : "neutral"}
          />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ value, tone }: { value: string; tone: "neutral" | "warning" | "danger" | "success" }) {
  return (
    <span
      className={clsx(
        "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
        tone === "danger" && "bg-[#4f2b2f] text-[#f9c8bf]",
        tone === "warning" && "bg-[#50422a] text-[#f2d7a2]",
        tone === "success" && "bg-[#1d433f] text-[#9fe1d4]",
        tone === "neutral" && "bg-white/10 text-[#d8dfdd]",
      )}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="feature-panel p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-4 font-display text-5xl text-[#e8cfab]">{value}</p>
      <p className="mt-2 text-sm text-muted">{detail}</p>
    </div>
  );
}
