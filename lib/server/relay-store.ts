import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { classifyCommand } from "@/lib/ai/classify-command";
import { AIProviderError, getAIUnavailableMessage } from "@/lib/ai/errors";
import { getOllamaConfig } from "@/lib/ai/ollama-provider";
import {
  createGoogleCalendarEvent,
  createGoogleGmailDraft,
  getGoogleConnectionStatus,
  getGoogleWorkspaceConfig,
} from "@/lib/server/google-workspace";
import {
  initialCalendarEvents,
  initialEmailDrafts,
  initialNotes,
  initialNotifications,
  initialPendingActions,
  initialReminders,
  initialTasks,
} from "@/lib/data";
import type {
  ActionLogEntry,
  AssistantRequestEntry,
  RelayMutationRequest,
  RelayStateSnapshot,
  Note,
  PendingAction,
  Reminder,
  RuntimeStatus,
  Task,
} from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "relay-state.json");

function getRuntimeStatus(): RuntimeStatus {
  const googleWorkspace = getGoogleWorkspaceConfig();

  return {
    storageMode: "file",
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    ollamaConfigured: Boolean(process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL),
    ollamaModel: getOllamaConfig().model,
    googleOAuthConfigured: googleWorkspace.googleOAuthConfigured,
    gmailConfigured: googleWorkspace.gmailConfigured,
    calendarConfigured: googleWorkspace.calendarConfigured,
  };
}

async function resolveRuntimeStatus(): Promise<RuntimeStatus> {
  const googleWorkspace = await getGoogleConnectionStatus();

  return {
    storageMode: "file",
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    ollamaConfigured: Boolean(process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL),
    ollamaModel: getOllamaConfig().model,
    googleOAuthConfigured: googleWorkspace.googleOAuthConfigured,
    gmailConfigured: googleWorkspace.gmailConfigured,
    calendarConfigured: googleWorkspace.calendarConfigured,
  };
}

function createInitialState(): RelayStateSnapshot {
  return {
    tasks: structuredClone(initialTasks),
    notes: structuredClone(initialNotes),
    reminders: structuredClone(initialReminders),
    calendarEvents: structuredClone(initialCalendarEvents),
    notifications: structuredClone(initialNotifications),
    drafts: structuredClone(initialEmailDrafts),
    pendingActions: structuredClone(initialPendingActions),
    assistantFeed: [
      "I can prepare tasks, reminders, email drafts, note summaries, and calendar plans. Important actions always wait for your approval.",
    ],
    assistantRequests: [],
    actionLog: [
      {
        id: "log-seed-1",
        title: "Demo workspace seeded",
        detail: "Loaded starter tasks, reminders, notes, and approval items for Relay.",
        category: "system",
        impact: "info",
        happenedAt: new Date().toISOString(),
      },
    ],
    preferences: {
      theme: "carbon",
      assistantTone: "calm",
      digestStyle: "balanced",
      approvalsLocked: true,
    },
    profile: {
      name: "Rami",
      email: "rami@example.com",
      role: "Student",
    },
    integrations: {
      calendar: true,
      emailDrafts: true,
      shareContextWithAi: true,
    },
    session: {
      isAuthenticated: false,
    },
    runtime: getRuntimeStatus(),
  };
}

let inMemoryState: RelayStateSnapshot | null = null;

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function persistState(state: RelayStateSnapshot) {
  await ensureDataDir();
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

async function loadState(): Promise<RelayStateSnapshot> {
  if (inMemoryState) {
    return inMemoryState;
  }

  try {
    const raw = await readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<RelayStateSnapshot>;
    inMemoryState = {
      ...createInitialState(),
      ...parsed,
      actionLog: parsed.actionLog ?? [],
      preferences: {
        ...createInitialState().preferences,
        ...parsed.preferences,
      },
      profile: {
        ...createInitialState().profile,
        ...parsed.profile,
      },
      integrations: {
        ...createInitialState().integrations,
        ...parsed.integrations,
      },
      session: {
        ...createInitialState().session,
        ...parsed.session,
      },
      runtime: await resolveRuntimeStatus(),
    };
  } catch {
    inMemoryState = createInitialState();
    await persistState(inMemoryState);
  }

  inMemoryState.runtime = await resolveRuntimeStatus();

  return inMemoryState;
}

function appendFeed(state: RelayStateSnapshot, message: string) {
  state.assistantFeed = [message, ...state.assistantFeed];
}

function recordAssistantRequest(
  state: RelayStateSnapshot,
  entry: Omit<AssistantRequestEntry, "id" | "happenedAt">,
) {
  state.assistantRequests = [
    {
      id: crypto.randomUUID(),
      happenedAt: new Date().toISOString(),
      ...entry,
    },
    ...state.assistantRequests,
  ].slice(0, 30);
}

function recordEvent(
  state: RelayStateSnapshot,
  entry: Omit<ActionLogEntry, "id" | "happenedAt">,
) {
  state.actionLog = [
    {
      id: crypto.randomUUID(),
      happenedAt: new Date().toISOString(),
      ...entry,
    },
    ...state.actionLog,
  ].slice(0, 40);
}

function updateNote(state: RelayStateSnapshot, noteId: string, updates: Partial<Note>) {
  state.notes = state.notes.map((note) => (note.id === noteId ? { ...note, ...updates } : note));
}

function buildAssistantContext(state: RelayStateSnapshot) {
  return {
    latestNote: state.notes[0],
    upcomingEvents: [...state.calendarEvents].sort((left, right) => left.start.localeCompare(right.start)),
    notifications: [...state.notifications],
    tasks: [...state.tasks],
    reminders: [...state.reminders],
  };
}

async function syncDraftIfConfigured(state: RelayStateSnapshot, draftId: string) {
  if (!state.runtime.gmailConfigured) {
    return;
  }

  const draft = state.drafts.find((item) => item.id === draftId);
  if (!draft) {
    return;
  }

  if (!draft.recipient || !draft.subject || !draft.body) {
    state.drafts = state.drafts.map((item) =>
      item.id === draftId
        ? {
            ...item,
            syncStatus: "failed",
            syncError: "Recipient, subject, and body are required before syncing a Gmail draft.",
          }
        : item,
    );
    return;
  }

  try {
    const result = await createGoogleGmailDraft(draft, state.profile.email);
    state.drafts = state.drafts.map((item) =>
      item.id === draftId
        ? {
            ...item,
            syncStatus: "synced",
            externalId: result.id,
            externalUrl: result.id ? `https://mail.google.com/mail/u/0/#drafts?compose=${result.id}` : item.externalUrl,
            syncError: undefined,
          }
        : item,
    );
    recordEvent(state, {
      title: "Gmail draft synced",
      detail: draft.subject,
      category: "productivity",
      impact: "success",
    });
  } catch (error) {
    state.drafts = state.drafts.map((item) =>
      item.id === draftId
        ? {
            ...item,
            syncStatus: "failed",
            syncError: error instanceof Error ? error.message : "Failed to sync Gmail draft.",
          }
        : item,
    );
    recordEvent(state, {
      title: "Gmail draft sync failed",
      detail: draft.subject,
      category: "system",
      impact: "warning",
    });
  }
}

async function syncCalendarEventIfConfigured(state: RelayStateSnapshot, eventId: string) {
  if (!state.runtime.calendarConfigured) {
    return;
  }

  const event = state.calendarEvents.find((item) => item.id === eventId);
  if (!event) {
    return;
  }

  try {
    const result = await createGoogleCalendarEvent(event);
    state.calendarEvents = state.calendarEvents.map((item) =>
      item.id === eventId
        ? {
            ...item,
            syncStatus: "synced",
            externalId: result.id,
            externalUrl: result.htmlLink,
            syncError: undefined,
          }
        : item,
    );
    recordEvent(state, {
      title: "Google Calendar event synced",
      detail: event.title,
      category: "productivity",
      impact: "success",
    });
  } catch (error) {
    state.calendarEvents = state.calendarEvents.map((item) =>
      item.id === eventId
        ? {
            ...item,
            syncStatus: "failed",
            syncError: error instanceof Error ? error.message : "Failed to sync Google Calendar event.",
          }
        : item,
    );
    recordEvent(state, {
      title: "Calendar sync failed",
      detail: event.title,
      category: "system",
      impact: "warning",
    });
  }
}

async function submitCommand(state: RelayStateSnapshot, rawInput: string, timezone = process.env.TZ || "America/Toronto") {
  const input = rawInput.trim();
  if (!input) {
    return;
  }
  let plan;
  try {
    plan = await classifyCommand({
      userMessage: input,
      currentDate: new Date().toISOString(),
      timezone,
      userContext: {
        ...buildAssistantContext(state),
        profile: state.profile,
        preferences: state.preferences,
      },
      integrations: state.integrations,
    });
  } catch (error) {
    const message = error instanceof AIProviderError ? error.message : getAIUnavailableMessage();
    appendFeed(state, message);
    recordAssistantRequest(state, {
      input,
      outcome: message,
      status: "needs_clarification",
    });
    recordEvent(state, {
      title: "Local AI unavailable",
      detail: message,
      category: "system",
      impact: "warning",
    });
    return;
  }

  if (plan.drafts?.length) {
    state.drafts = [...plan.drafts, ...state.drafts];
  }

  if (plan.pendingActions?.length) {
    state.pendingActions = [...plan.pendingActions, ...state.pendingActions];
  }

  appendFeed(state, plan.feedMessage);
  recordAssistantRequest(state, plan.request);
  recordEvent(state, plan.event);

  if (!state.preferences.approvalsLocked && plan.pendingActions?.every((action) => action.risk === "low")) {
    for (const action of plan.pendingActions) {
      void approveAction(state, action.id);
    }

    appendFeed(state, "Low-risk approval lock is off, so I applied that safe action directly.");
    recordEvent(state, {
      title: "Low-risk action auto-approved",
      detail: plan.pendingActions.map((action) => action.title).join(", "),
      category: "approval",
      impact: "success",
    });
  }
}

async function approveAction(state: RelayStateSnapshot, actionId: string) {
  const action = state.pendingActions.find((item) => item.id === actionId);
  if (!action || action.status !== "pending") {
    return;
  }

  if (action.type === "create_reminder") {
    state.reminders = [
      {
        id: crypto.randomUUID(),
        title: String(action.payload.title ?? "Untitled reminder"),
        when: String(action.payload.when ?? "TBD"),
        repeat: (action.payload.repeat as Reminder["repeat"]) ?? "none",
        priority: (action.payload.priority as Reminder["priority"]) ?? "high",
        status: "active",
      },
      ...state.reminders,
    ];
  }

  if (action.type === "create_tasks_from_note") {
    const extracted = Array.isArray(action.payload.tasks) ? action.payload.tasks : [];
    state.tasks = [
      ...extracted
        .map((title) => String(title).trim())
        .filter(Boolean)
        .map((title, index) => ({
          id: crypto.randomUUID(),
          title,
          due: index === 0 ? "Tomorrow, 1:00 PM" : "Friday, 4:00 PM",
          status: "pending" as const,
          priority: "medium" as const,
        })),
      ...state.tasks,
    ];
  }

  if (action.type === "create_task") {
    state.tasks = [
      {
        id: crypto.randomUUID(),
        title: String(action.payload.title ?? "Follow-up task"),
        due: String(action.payload.due ?? "Tomorrow, 12:00 PM"),
        priority: (action.payload.priority as Task["priority"]) ?? "medium",
        description: String(action.payload.description ?? ""),
        status: "pending",
      },
      ...state.tasks,
    ];
  }

  if (action.type === "create_calendar_event") {
    const createdEventId = crypto.randomUUID();
    state.calendarEvents = [
      {
        id: createdEventId,
        title: String(action.payload.title ?? "New event"),
        detail: String(action.payload.detail ?? ""),
        start: String(action.payload.start ?? "Today at 1:00 PM"),
        end: String(action.payload.end ?? "Later"),
        location: String(action.payload.location ?? ""),
        tone: (action.payload.tone as Task["priority"] extends never ? never : "teal" | "gold" | "rose") ?? "teal",
        syncStatus: state.runtime.calendarConfigured ? "local" : undefined,
      },
      ...state.calendarEvents,
    ];
    await syncCalendarEventIfConfigured(state, createdEventId);
  }

  if (action.type === "draft_email") {
    const draftId = String(action.payload.draftId);
    state.drafts = state.drafts.map((draft) =>
      draft.id === draftId
        ? {
            ...draft,
            status: "approved",
            syncStatus: state.runtime.gmailConfigured ? "local" : draft.syncStatus,
          }
        : draft,
    );
    await syncDraftIfConfigured(state, draftId);
  }

  state.pendingActions = state.pendingActions.map((item) =>
    item.id === action.id ? { ...item, status: "approved" } : item,
  );
  recordEvent(state, {
    title: "Pending action approved",
    detail: action.title,
    category: "approval",
    impact: "success",
  });
}

function cancelAction(state: RelayStateSnapshot, actionId: string) {
  const action = state.pendingActions.find((item) => item.id === actionId);
  state.pendingActions = state.pendingActions.map((item) =>
    item.id === actionId ? { ...item, status: "cancelled" } : item,
  );
  if (action) {
    recordEvent(state, {
      title: "Pending action cancelled",
      detail: action.title,
      category: "approval",
      impact: "warning",
    });
  }
}

function updatePendingAction(state: RelayStateSnapshot, actionId: string, updates: Partial<PendingAction>) {
  const action = state.pendingActions.find((item) => item.id === actionId);
  state.pendingActions = state.pendingActions.map((item) =>
    item.id === actionId
      ? {
          ...item,
          ...updates,
          payload:
            updates.payload && typeof updates.payload === "object"
              ? { ...item.payload, ...updates.payload }
              : item.payload,
        }
      : item,
  );
  if (action) {
    recordEvent(state, {
      title: "Pending action edited",
      detail: action.title,
      category: "approval",
      impact: "info",
    });
  }
}

export async function getRelayState(): Promise<RelayStateSnapshot> {
  return structuredClone(await loadState());
}

export async function resetRelayState() {
  const previousSession = (await loadState()).session;
  inMemoryState = {
    ...createInitialState(),
    session: previousSession,
  };
  await persistState(inMemoryState);
  return getRelayState();
}

export async function submitRelayCommand(input: string, timezone?: string) {
  const state = await loadState();
  if (!state.session.isAuthenticated) {
    return applyRelayMutation({ type: "submit_command", input });
  }
  await submitCommand(state, input, timezone);
  inMemoryState = state;
  await persistState(state);
  return getRelayState();
}

export async function applyRelayMutation(input: RelayMutationRequest): Promise<RelayStateSnapshot> {
  const state = await loadState();

  if (
    !state.session.isAuthenticated &&
    input.type !== "sign_in"
  ) {
    appendFeed(state, "Sign in to continue using the Relay workspace.");
    recordEvent(state, {
      title: "Blocked mutation while signed out",
      detail: input.type,
      category: "system",
      impact: "warning",
    });
    inMemoryState = state;
    await persistState(state);
    return getRelayState();
  }

  switch (input.type) {
    case "reset_state": {
      const preserved = {
        preferences: state.preferences,
        profile: state.profile,
        integrations: state.integrations,
        session: state.session,
      };

      inMemoryState = {
        ...createInitialState(),
        ...preserved,
      };
      recordEvent(inMemoryState, {
        title: "Demo workspace restored",
        detail: "Reset the demo data while keeping the signed-in workspace settings and identity.",
        category: "system",
        impact: "warning",
      });
      await persistState(inMemoryState);
      return getRelayState();
    }
    case "submit_command":
      await submitCommand(state, input.input);
      break;
    case "sign_in":
      state.session = {
        isAuthenticated: true,
        lastActiveAt: new Date().toISOString(),
      };
      recordEvent(state, {
        title: "Signed in",
        detail: `${state.profile.name} entered the workspace`,
        category: "system",
        impact: "success",
      });
      break;
    case "sign_out":
      state.session = {
        isAuthenticated: false,
        lastActiveAt: new Date().toISOString(),
      };
      recordEvent(state, {
        title: "Signed out",
        detail: `${state.profile.name} left the workspace`,
        category: "system",
        impact: "warning",
      });
      break;
    case "approve_action":
      await approveAction(state, input.actionId);
      break;
    case "cancel_action":
      cancelAction(state, input.actionId);
      break;
    case "update_pending_action":
      updatePendingAction(state, input.actionId, input.updates);
      break;
    case "add_task":
      state.tasks = [
        {
          id: crypto.randomUUID(),
          title: input.input.title,
          due: input.input.due,
          priority: input.input.priority,
          description: input.input.description,
          status: "pending",
        },
        ...state.tasks,
      ];
      appendFeed(state, `Added a new task: ${input.input.title}.`);
      recordEvent(state, {
        title: "Task created",
        detail: input.input.title,
        category: "productivity",
        impact: "success",
      });
      break;
    case "toggle_task":
      {
        const task = state.tasks.find((item) => item.id === input.taskId);
      state.tasks = state.tasks.map((task) =>
        task.id === input.taskId ? { ...task, status: task.status === "done" ? "pending" : "done" } : task,
      );
        if (task) {
          recordEvent(state, {
            title: task.status === "done" ? "Task reopened" : "Task completed",
            detail: task.title,
            category: "productivity",
            impact: "success",
          });
        }
      }
      break;
    case "update_task":
      {
        const task = state.tasks.find((item) => item.id === input.taskId);
        state.tasks = state.tasks.map((item) => (item.id === input.taskId ? { ...item, ...input.updates } : item));
        if (task) {
          recordEvent(state, {
            title: "Task updated",
            detail: task.title,
            category: "productivity",
            impact: "info",
          });
        }
      }
      break;
    case "delete_task":
      {
        const task = state.tasks.find((item) => item.id === input.taskId);
      state.tasks = state.tasks.filter((task) => task.id !== input.taskId);
        if (task) {
          recordEvent(state, {
            title: "Task deleted",
            detail: task.title,
            category: "productivity",
            impact: "warning",
          });
        }
      }
      break;
    case "add_note": {
      const summary =
        input.input.content.length > 110 ? `${input.input.content.slice(0, 107)}...` : input.input.content;
      state.notes = [
        {
          id: crypto.randomUUID(),
          title: input.input.title,
          content: input.input.content,
          summary,
          tags: ["new"],
        },
        ...state.notes,
      ];
      appendFeed(state, `Saved a new note: ${input.input.title}.`);
      recordEvent(state, {
        title: "Note saved",
        detail: input.input.title,
        category: "productivity",
        impact: "success",
      });
      break;
    }
    case "delete_note":
      {
        const note = state.notes.find((item) => item.id === input.noteId);
      state.notes = state.notes.filter((note) => note.id !== input.noteId);
        if (note) {
          recordEvent(state, {
            title: "Note deleted",
            detail: note.title,
            category: "productivity",
            impact: "warning",
          });
        }
      }
      break;
    case "update_note":
      {
        const note = state.notes.find((item) => item.id === input.noteId);
        state.notes = state.notes.map((item) => (item.id === input.noteId ? { ...item, ...input.updates } : item));
        if (note) {
          recordEvent(state, {
            title: "Note updated",
            detail: note.title,
            category: "productivity",
            impact: "info",
          });
        }
      }
      break;
    case "summarize_note": {
      const target = state.notes.find((note) => note.id === input.noteId);
      if (target) {
        const cleaned = target.content.replace(/^Messy notes:\s*/i, "");
        const parts = cleaned
          .split(/[,.]/)
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 3);
        const summary =
          parts.length > 0
            ? `Key points: ${parts.join(", ")}.`
            : target.content.length > 140
              ? `${target.content.slice(0, 137)}...`
              : target.content;
        updateNote(state, input.noteId, { summary });
        appendFeed(state, `Summarized note: ${target.title}.`);
        recordEvent(state, {
          title: "Note summarized",
          detail: target.title,
          category: "assistant",
          impact: "info",
        });
      }
      break;
    }
    case "suggest_note_tags": {
      const target = state.notes.find((note) => note.id === input.noteId);
      if (target) {
        const lower = `${target.title} ${target.content}`.toLowerCase();
        const nextTags = new Set<string>();
        if (/(professor|assignment|lecture|class|research|project)/.test(lower)) nextTags.add("school");
        if (/(gym|basketball|workout|fitness)/.test(lower)) nextTags.add("health");
        if (/(email|team|meeting|internship|work)/.test(lower)) nextTags.add("work");
        if (/(laundry|apartment|errand|parcel|budget)/.test(lower)) nextTags.add("life");
        if (nextTags.size === 0) nextTags.add("general");
        updateNote(state, input.noteId, { tags: Array.from(nextTags) });
        appendFeed(state, `Suggested tags for note: ${target.title}.`);
        recordEvent(state, {
          title: "Note tags suggested",
          detail: target.title,
          category: "assistant",
          impact: "info",
        });
      }
      break;
    }
    case "add_reminder":
      state.reminders = [
        {
          id: crypto.randomUUID(),
          title: input.input.title,
          when: input.input.when,
          repeat: input.input.repeat,
          priority: input.input.priority,
          status: "active",
        },
        ...state.reminders,
      ];
      appendFeed(state, `Added a reminder: ${input.input.title}.`);
      recordEvent(state, {
        title: "Reminder created",
        detail: input.input.title,
        category: "productivity",
        impact: "success",
      });
      break;
    case "add_calendar_event":
      {
        const calendarEventId = crypto.randomUUID();
        state.calendarEvents = [
          {
            id: calendarEventId,
            title: input.input.title,
            detail: input.input.detail,
            start: input.input.start,
            end: input.input.end,
            location: input.input.location,
            tone: input.input.tone,
            syncStatus: state.runtime.calendarConfigured ? "local" : undefined,
          },
          ...state.calendarEvents,
        ];
        await syncCalendarEventIfConfigured(state, calendarEventId);
      }
      appendFeed(state, `Added a calendar event: ${input.input.title}.`);
      recordEvent(state, {
        title: "Calendar event created",
        detail: input.input.title,
        category: "productivity",
        impact: "success",
      });
      break;
    case "update_calendar_event":
      {
        const event = state.calendarEvents.find((item) => item.id === input.eventId);
        state.calendarEvents = state.calendarEvents.map((item) =>
          item.id === input.eventId ? { ...item, ...input.updates } : item,
        );
        if (event) {
          recordEvent(state, {
            title: "Calendar event updated",
            detail: event.title,
            category: "productivity",
            impact: "info",
          });
        }
      }
      break;
    case "delete_calendar_event":
      {
        const event = state.calendarEvents.find((item) => item.id === input.eventId);
        state.calendarEvents = state.calendarEvents.filter((event) => event.id !== input.eventId);
        if (event) {
          recordEvent(state, {
            title: "Calendar event deleted",
            detail: event.title,
            category: "productivity",
            impact: "warning",
          });
        }
      }
      break;
    case "mark_notification_read":
      {
        const notification = state.notifications.find((item) => item.id === input.notificationId);
        state.notifications = state.notifications.map((notification) =>
          notification.id === input.notificationId ? { ...notification, isRead: true } : notification,
        );
        if (notification) {
          recordEvent(state, {
            title: "Notification marked read",
            detail: notification.title,
            category: "productivity",
            impact: "info",
          });
        }
      }
      break;
    case "update_notification_category":
      {
        const notification = state.notifications.find((item) => item.id === input.notificationId);
        state.notifications = state.notifications.map((notification) =>
          notification.id === input.notificationId
            ? { ...notification, category: input.category }
            : notification,
        );
        if (notification) {
          recordEvent(state, {
            title: "Notification priority updated",
            detail: `${notification.title} -> ${input.category}`,
            category: "productivity",
            impact: "info",
          });
        }
      }
      break;
    case "update_reminder":
      {
        const reminder = state.reminders.find((item) => item.id === input.reminderId);
      state.reminders = state.reminders.map((reminder) =>
        reminder.id === input.reminderId ? { ...reminder, ...input.updates } : reminder,
      );
        if (reminder) {
          recordEvent(state, {
            title: "Reminder updated",
            detail: reminder.title,
            category: "productivity",
            impact: "info",
          });
        }
      }
      break;
    case "delete_reminder":
      {
        const reminder = state.reminders.find((item) => item.id === input.reminderId);
      state.reminders = state.reminders.filter((reminder) => reminder.id !== input.reminderId);
        if (reminder) {
          recordEvent(state, {
            title: "Reminder deleted",
            detail: reminder.title,
            category: "productivity",
            impact: "warning",
          });
        }
      }
      break;
    case "save_draft":
      {
        const draft = state.drafts.find((item) => item.id === input.draftId);
      state.drafts = state.drafts.map((draft) =>
        draft.id === input.draftId
          ? {
              ...draft,
              ...input.updates,
              syncStatus:
                (input.updates.status ?? draft.status) === "approved" && state.runtime.gmailConfigured
                  ? "local"
                  : draft.syncStatus,
            }
          : draft,
      );
        if (draft) {
          recordEvent(state, {
            title: "Draft updated",
            detail: draft.subject,
            category: "productivity",
            impact: "info",
          });
        }
        if ((input.updates.status === "approved" || draft?.status === "approved") && draft) {
          await syncDraftIfConfigured(state, input.draftId);
        }
      }
      break;
    case "delete_draft":
      {
        const draft = state.drafts.find((item) => item.id === input.draftId);
      state.drafts = state.drafts.filter((draft) => draft.id !== input.draftId);
        if (draft) {
          recordEvent(state, {
            title: "Draft deleted",
            detail: draft.subject,
            category: "productivity",
            impact: "warning",
          });
        }
      }
      break;
    case "update_preferences":
      state.preferences = {
        ...state.preferences,
        ...input.updates,
      };
      recordEvent(state, {
        title: "Preferences updated",
        detail: Object.keys(input.updates).join(", ") || "No fields changed",
        category: "system",
        impact: "info",
      });
      break;
    case "update_profile":
      state.profile = {
        ...state.profile,
        ...input.updates,
      };
      recordEvent(state, {
        title: "Profile updated",
        detail: `${state.profile.name} • ${state.profile.role}`,
        category: "system",
        impact: "info",
      });
      break;
    case "update_integrations":
      state.integrations = {
        ...state.integrations,
        ...input.updates,
      };
      recordEvent(state, {
        title: "Integration permissions updated",
        detail: Object.keys(input.updates).join(", ") || "No fields changed",
        category: "system",
        impact: "info",
      });
      break;
  }

  inMemoryState = state;
  await persistState(state);
  return getRelayState();
}
