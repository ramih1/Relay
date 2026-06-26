"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  initialCalls,
  initialEmailDrafts,
  initialNotes,
  initialPendingActions,
  initialReminders,
  initialTasks,
} from "@/lib/data";
import type {
  EmailDraft,
  JarvisMutationRequest,
  JarvisStateSnapshot,
  Note,
  PendingAction,
  Reminder,
  Task,
} from "@/lib/types";

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

type NewReminderInput = {
  title: string;
  when: string;
  repeat: Reminder["repeat"];
  priority: Reminder["priority"];
};

type JarvisStore = {
  tasks: Task[];
  notes: Note[];
  reminders: Reminder[];
  drafts: EmailDraft[];
  calls: JarvisStateSnapshot["calls"];
  pendingActions: PendingAction[];
  assistantFeed: string[];
  submitCommand: (input: string) => Promise<void>;
  approveAction: (actionId: string) => Promise<void>;
  cancelAction: (actionId: string) => Promise<void>;
  updatePendingAction: (actionId: string, updates: Partial<PendingAction>) => Promise<void>;
  addTask: (input: NewTaskInput) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  addNote: (input: NewNoteInput) => Promise<void>;
  updateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  addReminder: (input: NewReminderInput) => Promise<void>;
  updateReminder: (reminderId: string, updates: Partial<Reminder>) => Promise<void>;
  deleteReminder: (reminderId: string) => Promise<void>;
  saveDraft: (draftId: string, updates: Partial<EmailDraft>) => Promise<void>;
  deleteDraft: (draftId: string) => Promise<void>;
  summarizeNote: (noteId: string) => Promise<void>;
  suggestNoteTags: (noteId: string) => Promise<void>;
  createCallFollowups: (callId: string) => Promise<void>;
};

const fallbackState: JarvisStateSnapshot = {
  tasks: initialTasks,
  notes: initialNotes,
  reminders: initialReminders,
  drafts: initialEmailDrafts,
  calls: initialCalls,
  pendingActions: initialPendingActions,
  assistantFeed: [
    "I can prepare reminders, email drafts, note summaries, and simulated call plans. Important actions always wait for your approval.",
  ],
};

const JarvisContext = createContext<JarvisStore | null>(null);

export function JarvisProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<JarvisStateSnapshot>(fallbackState);

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      try {
        const response = await fetch("/api/state", { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const snapshot = (await response.json()) as JarvisStateSnapshot;
        if (!cancelled) {
          setState(snapshot);
        }
      } catch {
        // Keep fallback state if the backend is unavailable.
      }
    }

    void loadState();

    return () => {
      cancelled = true;
    };
  }, []);

  async function mutate(payload: JarvisMutationRequest) {
    const response = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Failed to update JARVIS state.");
    }

    const snapshot = (await response.json()) as JarvisStateSnapshot;
    setState(snapshot);
  }

  const value = useMemo<JarvisStore>(
    () => ({
      ...state,
      submitCommand: async (input) => mutate({ type: "submit_command", input }),
      approveAction: async (actionId) => mutate({ type: "approve_action", actionId }),
      cancelAction: async (actionId) => mutate({ type: "cancel_action", actionId }),
      updatePendingAction: async (actionId, updates) =>
        mutate({ type: "update_pending_action", actionId, updates }),
      addTask: async (input) => mutate({ type: "add_task", input }),
      toggleTask: async (taskId) => mutate({ type: "toggle_task", taskId }),
      deleteTask: async (taskId) => mutate({ type: "delete_task", taskId }),
      addNote: async (input) => mutate({ type: "add_note", input }),
      updateNote: async (noteId, updates) => {
        if (updates.summary) {
          await mutate({ type: "summarize_note", noteId });
          return;
        }
        if (updates.tags) {
          await mutate({ type: "suggest_note_tags", noteId });
        }
      },
      deleteNote: async (noteId) => mutate({ type: "delete_note", noteId }),
      addReminder: async (input) => mutate({ type: "add_reminder", input }),
      updateReminder: async (reminderId, updates) => mutate({ type: "update_reminder", reminderId, updates }),
      deleteReminder: async (reminderId) => mutate({ type: "delete_reminder", reminderId }),
      saveDraft: async (draftId, updates) => mutate({ type: "save_draft", draftId, updates }),
      deleteDraft: async (draftId) => mutate({ type: "delete_draft", draftId }),
      summarizeNote: async (noteId) => mutate({ type: "summarize_note", noteId }),
      suggestNoteTags: async (noteId) => mutate({ type: "suggest_note_tags", noteId }),
      createCallFollowups: async (callId) => mutate({ type: "create_call_followups", callId }),
    }),
    [state],
  );

  return <JarvisContext.Provider value={value}>{children}</JarvisContext.Provider>;
}

export function useJarvis() {
  const context = useContext(JarvisContext);
  if (!context) {
    throw new Error("useJarvis must be used inside JarvisProvider");
  }
  return context;
}
