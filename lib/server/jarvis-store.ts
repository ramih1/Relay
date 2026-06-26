import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  initialCalls,
  initialEmailDrafts,
  initialNotes,
  initialPendingActions,
  initialReminders,
  initialTasks,
} from "@/lib/data";
import type {
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
    drafts: structuredClone(initialEmailDrafts),
    calls: structuredClone(initialCalls),
    pendingActions: structuredClone(initialPendingActions),
    assistantFeed: [
      "I can prepare reminders, email drafts, note summaries, and simulated call plans. Important actions always wait for your approval.",
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
    inMemoryState = JSON.parse(raw) as JarvisStateSnapshot;
  } catch {
    inMemoryState = createInitialState();
    await persistState(inMemoryState);
  }

  return inMemoryState;
}

function appendFeed(state: JarvisStateSnapshot, message: string) {
  state.assistantFeed = [message, ...state.assistantFeed];
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
    return;
  }

  appendFeed(state, "I understood the request at a high level and would ask one focused follow-up before creating an action proposal in the real agent flow.");
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
}

function cancelAction(state: JarvisStateSnapshot, actionId: string) {
  state.pendingActions = state.pendingActions.map((item) =>
    item.id === actionId ? { ...item, status: "cancelled" } : item,
  );
}

function updatePendingAction(state: JarvisStateSnapshot, actionId: string, updates: Partial<PendingAction>) {
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
      break;
    case "toggle_task":
      state.tasks = state.tasks.map((task) =>
        task.id === input.taskId ? { ...task, status: task.status === "done" ? "pending" : "done" } : task,
      );
      break;
    case "delete_task":
      state.tasks = state.tasks.filter((task) => task.id !== input.taskId);
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
      break;
    }
    case "delete_note":
      state.notes = state.notes.filter((note) => note.id !== input.noteId);
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
      break;
    case "update_reminder":
      state.reminders = state.reminders.map((reminder) =>
        reminder.id === input.reminderId ? { ...reminder, ...input.updates } : reminder,
      );
      break;
    case "delete_reminder":
      state.reminders = state.reminders.filter((reminder) => reminder.id !== input.reminderId);
      break;
    case "save_draft":
      state.drafts = state.drafts.map((draft) =>
        draft.id === input.draftId ? { ...draft, ...input.updates } : draft,
      );
      break;
    case "delete_draft":
      state.drafts = state.drafts.filter((draft) => draft.id !== input.draftId);
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
      }
      break;
    }
  }

  inMemoryState = state;
  await persistState(state);
  return getJarvisState();
}
