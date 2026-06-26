"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  initialCalls,
  initialEmailDrafts,
  initialNotes,
  initialPendingActions,
  initialReminders,
  initialTasks,
} from "@/lib/data";
import type { CallRequest, EmailDraft, Note, PendingAction, Reminder, Task } from "@/lib/types";

type NewTaskInput = {
  title: string;
  due: string;
  priority: Task["priority"];
  description?: string;
};

type NewNoteInput = {
  title: string;
  content: string;
};

type JarvisStore = {
  tasks: Task[];
  notes: Note[];
  reminders: Reminder[];
  drafts: EmailDraft[];
  calls: CallRequest[];
  pendingActions: PendingAction[];
  assistantFeed: string[];
  submitCommand: (input: string) => void;
  approveAction: (actionId: string) => void;
  cancelAction: (actionId: string) => void;
  updatePendingAction: (actionId: string, updates: Partial<PendingAction>) => void;
  addTask: (input: NewTaskInput) => void;
  toggleTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  addNote: (input: NewNoteInput) => void;
  deleteNote: (noteId: string) => void;
};

type PersistedState = Pick<
  JarvisStore,
  "tasks" | "notes" | "reminders" | "drafts" | "calls" | "pendingActions" | "assistantFeed"
>;

const STORAGE_KEY = "jarvis-state-v1";

const JarvisContext = createContext<JarvisStore | null>(null);

export function JarvisProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [drafts, setDrafts] = useState<EmailDraft[]>(initialEmailDrafts);
  const [calls, setCalls] = useState<CallRequest[]>(initialCalls);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>(initialPendingActions);
  const [assistantFeed, setAssistantFeed] = useState<string[]>([
    "I can prepare reminders, email drafts, note summaries, and simulated call plans. Important actions always wait for your approval.",
  ]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setHydrated(true);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (parsed.tasks) {
        setTasks(parsed.tasks);
      }
      if (parsed.notes) {
        setNotes(parsed.notes);
      }
      if (parsed.reminders) {
        setReminders(parsed.reminders);
      }
      if (parsed.drafts) {
        setDrafts(parsed.drafts);
      }
      if (parsed.calls) {
        setCalls(parsed.calls);
      }
      if (parsed.pendingActions) {
        setPendingActions(parsed.pendingActions);
      }
      if (parsed.assistantFeed) {
        setAssistantFeed(parsed.assistantFeed);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const snapshot: PersistedState = {
      tasks,
      notes,
      reminders,
      drafts,
      calls,
      pendingActions,
      assistantFeed,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [assistantFeed, calls, drafts, hydrated, notes, pendingActions, reminders, tasks]);

  function submitCommand(rawInput: string) {
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
      setPendingActions((current) => [newAction, ...current]);
      setAssistantFeed((current) => [
        `Prepared a reminder proposal for "${input}". It is waiting in Confirmations.`,
        ...current,
      ]);
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
      setDrafts((current) => [newDraft, ...current]);
      setPendingActions((current) => [newAction, ...current]);
      setAssistantFeed((current) => [
        "Drafted an email request and queued it for approval before saving.",
        ...current,
      ]);
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
      setCalls((current) => [newCall, ...current]);
      setPendingActions((current) => [newAction, ...current]);
      setAssistantFeed((current) => [
        "Created a transparent call plan with a script and allowed actions. It is waiting for approval.",
        ...current,
      ]);
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
      setPendingActions((current) => [newAction, ...current]);
      setAssistantFeed((current) => [
        "Extracted action items from your note and sent them to Confirmations for review.",
        ...current,
      ]);
      return;
    }

    setAssistantFeed((current) => [
      "I understood the request at a high level and would ask one focused follow-up before creating an action proposal in the real agent flow.",
      ...current,
    ]);
  }

  function approveAction(actionId: string) {
    const action = pendingActions.find((item) => item.id === actionId);
    if (!action || action.status !== "pending") {
      return;
    }

    if (action.type === "create_reminder") {
      setReminders((current) => [
        {
          id: crypto.randomUUID(),
          title: String(action.payload.title ?? "Untitled reminder"),
          when: String(action.payload.when ?? "TBD"),
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
          title: String(action.payload.title ?? "Follow-up"),
          when: String(action.payload.when ?? "Later"),
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

  function cancelAction(actionId: string) {
    setPendingActions((current) =>
      current.map((item) => (item.id === actionId ? { ...item, status: "cancelled" } : item)),
    );
  }

  function updatePendingAction(actionId: string, updates: Partial<PendingAction>) {
    setPendingActions((current) =>
      current.map((item) =>
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
      ),
    );
  }

  function addTask(input: NewTaskInput) {
    setTasks((current) => [
      {
        id: crypto.randomUUID(),
        title: input.title,
        due: input.due,
        priority: input.priority,
        description: input.description,
        status: "pending",
      },
      ...current,
    ]);
    setAssistantFeed((current) => [`Added a new task: ${input.title}.`, ...current]);
  }

  function toggleTask(taskId: string) {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: task.status === "done" ? "pending" : "done",
            }
          : task,
      ),
    );
  }

  function deleteTask(taskId: string) {
    setTasks((current) => current.filter((task) => task.id !== taskId));
  }

  function addNote(input: NewNoteInput) {
    const summary = input.content.length > 110 ? `${input.content.slice(0, 107)}...` : input.content;
    setNotes((current) => [
      {
        id: crypto.randomUUID(),
        title: input.title,
        content: input.content,
        summary,
        tags: ["new"],
      },
      ...current,
    ]);
    setAssistantFeed((current) => [`Saved a new note: ${input.title}.`, ...current]);
  }

  function deleteNote(noteId: string) {
    setNotes((current) => current.filter((note) => note.id !== noteId));
  }

  const value = useMemo<JarvisStore>(
    () => ({
      tasks,
      notes,
      reminders,
      drafts,
      calls,
      pendingActions,
      assistantFeed,
      submitCommand,
      approveAction,
      cancelAction,
      updatePendingAction,
      addTask,
      toggleTask,
      deleteTask,
      addNote,
      deleteNote,
    }),
    [assistantFeed, calls, drafts, notes, pendingActions, reminders, tasks],
  );

  return <JarvisContext.Provider value={value}>{children}</JarvisContext.Provider>;
}

export function useJarvis() {
  const context = useContext(JarvisContext);
  if (!context) {
    throw new Error("useJarvis must be used within a JarvisProvider");
  }

  return context;
}
