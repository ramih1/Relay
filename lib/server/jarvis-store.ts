import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  initialCalendarEvents,
  initialCalls,
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
  CallRequest,
  EmailDraft,
  JarvisMutationRequest,
  JarvisStateSnapshot,
  Note,
  PendingAction,
  Reminder,
  Task,
} from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "jarvis-state.json");

function createInitialState(): JarvisStateSnapshot {
  return {
    tasks: structuredClone(initialTasks),
    notes: structuredClone(initialNotes),
    reminders: structuredClone(initialReminders),
    calendarEvents: structuredClone(initialCalendarEvents),
    notifications: structuredClone(initialNotifications),
    drafts: structuredClone(initialEmailDrafts),
    calls: structuredClone(initialCalls),
    pendingActions: structuredClone(initialPendingActions),
    assistantFeed: [
      "I can prepare reminders, email drafts, note summaries, and simulated call plans. Important actions always wait for your approval.",
    ],
    assistantRequests: [],
    actionLog: [
      {
        id: "log-seed-1",
        title: "Demo workspace seeded",
        detail: "Loaded starter tasks, reminders, notes, and approval items for JARVIS.",
        category: "system",
        impact: "info",
        happenedAt: new Date().toISOString(),
      },
    ],
  };
}

let inMemoryState: JarvisStateSnapshot | null = null;

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function persistState(state: JarvisStateSnapshot) {
  await ensureDataDir();
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

async function loadState(): Promise<JarvisStateSnapshot> {
  if (inMemoryState) {
    return inMemoryState;
  }

  try {
    const raw = await readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<JarvisStateSnapshot>;
    inMemoryState = {
      ...createInitialState(),
      ...parsed,
      actionLog: parsed.actionLog ?? [],
    };
  } catch {
    inMemoryState = createInitialState();
    await persistState(inMemoryState);
  }

  return inMemoryState;
}

function appendFeed(state: JarvisStateSnapshot, message: string) {
  state.assistantFeed = [message, ...state.assistantFeed];
}

function recordAssistantRequest(
  state: JarvisStateSnapshot,
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
  state: JarvisStateSnapshot,
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

function updateNote(state: JarvisStateSnapshot, noteId: string, updates: Partial<Note>) {
  state.notes = state.notes.map((note) => (note.id === noteId ? { ...note, ...updates } : note));
}

function submitCommand(state: JarvisStateSnapshot, rawInput: string) {
  const input = rawInput.trim();
  if (!input) {
    return;
  }

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
    state.pendingActions = [newAction, ...state.pendingActions];
    appendFeed(state, `Prepared a reminder proposal for "${input}". It is waiting in Confirmations.`);
    recordAssistantRequest(state, {
      input,
      outcome: "Created a reminder proposal and sent it to confirmations.",
      status: "proposal_created",
    });
    recordEvent(state, {
      title: "Reminder proposal created",
      detail: input,
      category: "assistant",
      impact: "info",
    });
    return;
  }

  if (lower.includes("draft an email")) {
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
    state.drafts = [newDraft, ...state.drafts];
    state.pendingActions = [newAction, ...state.pendingActions];
    appendFeed(state, "Drafted an email request and queued it for approval before saving.");
    recordAssistantRequest(state, {
      input,
      outcome: "Created an email draft proposal for review.",
      status: "proposal_created",
    });
    recordEvent(state, {
      title: "Email draft prepared",
      detail: newAction.description,
      category: "assistant",
      impact: "info",
    });
    return;
  }

  if (lower.includes("call")) {
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
    state.calls = [newCall, ...state.calls];
    state.pendingActions = [newAction, ...state.pendingActions];
    appendFeed(state, "Created a transparent call plan with a script and allowed actions. It is waiting for approval.");
    recordAssistantRequest(state, {
      input,
      outcome: "Prepared a call plan with restrictions and approval requirements.",
      status: "proposal_created",
    });
    recordEvent(state, {
      title: "Call plan prepared",
      detail: newCall.purpose,
      category: "call",
      impact: "warning",
    });
    return;
  }

  if (lower.includes("note") || lower.includes("task")) {
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
    state.pendingActions = [newAction, ...state.pendingActions];
    appendFeed(state, "Extracted action items from your note and sent them to Confirmations for review.");
    recordAssistantRequest(state, {
      input,
      outcome: "Extracted tasks from the note and queued them for approval.",
      status: "proposal_created",
    });
    recordEvent(state, {
      title: "Tasks extracted from note",
      detail: "Three task suggestions moved into the approval queue.",
      category: "assistant",
      impact: "info",
    });
    return;
  }

  appendFeed(state, "I understood the request at a high level and would ask one focused follow-up before creating an action proposal in the real agent flow.");
  recordAssistantRequest(state, {
    input,
    outcome: "Needs one clarifying follow-up before creating a safe proposal.",
    status: "needs_clarification",
  });
  recordEvent(state, {
    title: "Assistant requested clarification",
    detail: input,
    category: "assistant",
    impact: "info",
  });
}

function approveAction(state: JarvisStateSnapshot, actionId: string) {
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

  if (action.type === "draft_email") {
    const draftId = String(action.payload.draftId);
    state.drafts = state.drafts.map((draft) => (draft.id === draftId ? { ...draft, status: "approved" } : draft));
  }

  if (action.type === "place_call") {
    const callId = String(action.payload.callId);
    state.calls = state.calls.map((call) =>
      call.id === callId
        ? {
            ...call,
            status: "simulated",
            transcript:
              "JARVIS: Hi, I'm JARVIS calling on behalf of Rami.\nGym: The court should be free after 7:30 PM.\nJARVIS: Thanks. Is there a closing time?\nGym: We close at 10 PM tonight.\nJARVIS: Perfect, I'll pass that along.",
            summary: "Court is free after 7:30 PM and the gym closes at 10 PM.",
          }
        : call,
    );
  }

  if (action.type === "create_followup_task") {
    state.reminders = [
      {
        id: crypto.randomUUID(),
        title: String(action.payload.title ?? "Follow-up"),
        when: String(action.payload.when ?? "Later"),
        repeat: "none",
        priority: "medium",
        status: "active",
      },
      ...state.reminders,
    ];
  }

  state.pendingActions = state.pendingActions.map((item) =>
    item.id === action.id ? { ...item, status: "approved" } : item,
  );
  recordEvent(state, {
    title: "Pending action approved",
    detail: action.title,
    category: action.type === "place_call" ? "call" : "approval",
    impact: "success",
  });
}

function cancelAction(state: JarvisStateSnapshot, actionId: string) {
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

function updatePendingAction(state: JarvisStateSnapshot, actionId: string, updates: Partial<PendingAction>) {
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

export async function getJarvisState(): Promise<JarvisStateSnapshot> {
  return structuredClone(await loadState());
}

export async function resetJarvisState() {
  inMemoryState = createInitialState();
  await persistState(inMemoryState);
  return getJarvisState();
}

export async function applyJarvisMutation(input: JarvisMutationRequest): Promise<JarvisStateSnapshot> {
  const state = await loadState();

  switch (input.type) {
    case "reset_state":
      inMemoryState = createInitialState();
      recordEvent(inMemoryState, {
        title: "Demo workspace restored",
        detail: "Reset tasks, reminders, notes, and approval items to the starter dataset.",
        category: "system",
        impact: "warning",
      });
      await persistState(inMemoryState);
      return getJarvisState();
    case "submit_command":
      submitCommand(state, input.input);
      break;
    case "approve_action":
      approveAction(state, input.actionId);
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
      state.calendarEvents = [
        {
          id: crypto.randomUUID(),
          title: input.input.title,
          detail: input.input.detail,
          start: input.input.start,
          end: input.input.end,
          location: input.input.location,
          tone: input.input.tone,
        },
        ...state.calendarEvents,
      ];
      appendFeed(state, `Added a calendar event: ${input.input.title}.`);
      recordEvent(state, {
        title: "Calendar event created",
        detail: input.input.title,
        category: "productivity",
        impact: "success",
      });
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
        draft.id === input.draftId ? { ...draft, ...input.updates } : draft,
      );
        if (draft) {
          recordEvent(state, {
            title: "Draft updated",
            detail: draft.subject,
            category: "productivity",
            impact: "info",
          });
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
    case "create_call_followups": {
      const call = state.calls.find((item) => item.id === input.callId);
      if (call) {
        const newAction: PendingAction = {
          id: crypto.randomUUID(),
          type: "create_followup_task",
          title: "Save follow-up reminder",
          description: `Leave for ${call.contactName} at 6:45 PM`,
          risk: "medium",
          status: "pending",
          payload: {
            title: `Leave for ${call.contactName}`,
            when: "Today, 6:45 PM",
          },
        };
        state.pendingActions = [newAction, ...state.pendingActions];
        appendFeed(state, `Prepared a follow-up reminder based on the ${call.contactName} call summary.`);
        recordEvent(state, {
          title: "Follow-up proposal created",
          detail: call.contactName,
          category: "call",
          impact: "info",
        });
      }
      break;
    }
  }

  inMemoryState = state;
  await persistState(state);
  return getJarvisState();
}
