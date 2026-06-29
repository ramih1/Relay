"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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
  CalendarEvent,
  EmailDraft,
  JarvisMutationRequest,
  JarvisStateSnapshot,
  Note,
  NotificationItem,
  PendingAction,
  Reminder,
  Task,
  IntegrationState,
  UserPreferences,
  UserProfile,
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

type NewCalendarEventInput = {
  title: string;
  detail: string;
  start: string;
  end: string;
  location?: string;
  tone: CalendarEvent["tone"];
};

type JarvisStore = {
  tasks: Task[];
  notes: Note[];
  reminders: Reminder[];
  calendarEvents: CalendarEvent[];
  notifications: NotificationItem[];
  drafts: EmailDraft[];
  calls: JarvisStateSnapshot["calls"];
  pendingActions: PendingAction[];
  assistantFeed: string[];
  assistantRequests: AssistantRequestEntry[];
  actionLog: ActionLogEntry[];
  preferences: UserPreferences;
  profile: UserProfile;
  integrations: IntegrationState;
  session: JarvisStateSnapshot["session"];
  isHydrating: boolean;
  lastError: string | null;
  submitCommand: (input: string) => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  approveAction: (actionId: string) => Promise<void>;
  cancelAction: (actionId: string) => Promise<void>;
  updatePendingAction: (actionId: string, updates: Partial<PendingAction>) => Promise<void>;
  addTask: (input: NewTaskInput) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  toggleTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  addNote: (input: NewNoteInput) => Promise<void>;
  updateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  addReminder: (input: NewReminderInput) => Promise<void>;
  addCalendarEvent: (input: NewCalendarEventInput) => Promise<void>;
  updateCalendarEvent: (eventId: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteCalendarEvent: (eventId: string) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  updateNotificationCategory: (notificationId: string, category: NotificationItem["category"]) => Promise<void>;
  updateReminder: (reminderId: string, updates: Partial<Reminder>) => Promise<void>;
  deleteReminder: (reminderId: string) => Promise<void>;
  saveDraft: (draftId: string, updates: Partial<EmailDraft>) => Promise<void>;
  deleteDraft: (draftId: string) => Promise<void>;
  summarizeNote: (noteId: string) => Promise<void>;
  suggestNoteTags: (noteId: string) => Promise<void>;
  createCallFollowups: (callId: string) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateIntegrations: (updates: Partial<IntegrationState>) => Promise<void>;
  resetState: () => Promise<void>;
};

const fallbackState: JarvisStateSnapshot = {
  tasks: initialTasks,
  notes: initialNotes,
  reminders: initialReminders,
  calendarEvents: initialCalendarEvents,
  notifications: initialNotifications,
  drafts: initialEmailDrafts,
  calls: initialCalls,
  pendingActions: initialPendingActions,
  assistantFeed: [
    "I can prepare reminders, email drafts, note summaries, and simulated call plans. Important actions always wait for your approval.",
  ],
  assistantRequests: [],
  actionLog: [],
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
    callAssistant: true,
    shareContextWithAi: true,
  },
  session: {
    isAuthenticated: false,
  },
};

const JarvisContext = createContext<JarvisStore | null>(null);

export function JarvisProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<JarvisStateSnapshot>(fallbackState);
  const [isHydrating, setIsHydrating] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      try {
        const response = await fetch("/api/state", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) {
            setLastError("Failed to load the workspace.");
            setIsHydrating(false);
          }
          return;
        }
        const snapshot = (await response.json()) as JarvisStateSnapshot;
        if (!cancelled) {
          setState(snapshot);
          setLastError(null);
          setIsHydrating(false);
        }
      } catch {
        if (!cancelled) {
          setLastError("JARVIS is using fallback workspace data right now.");
          setIsHydrating(false);
        }
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
      setLastError("Failed to update JARVIS state.");
      throw new Error("Failed to update JARVIS state.");
    }

    const snapshot = (await response.json()) as JarvisStateSnapshot;
    setState(snapshot);
    setLastError(null);
  }

  async function submitAssistant(input: string) {
    const response = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      setLastError("Failed to process assistant command.");
      throw new Error("Failed to process assistant command.");
    }

    const snapshot = (await response.json()) as JarvisStateSnapshot;
    setState(snapshot);
    setLastError(null);
  }

  const value = useMemo<JarvisStore>(
    () => ({
      ...state,
      isHydrating,
      lastError,
      submitCommand: submitAssistant,
      signIn: async () => mutate({ type: "sign_in" }),
      signOut: async () => mutate({ type: "sign_out" }),
      approveAction: async (actionId) => mutate({ type: "approve_action", actionId }),
      cancelAction: async (actionId) => mutate({ type: "cancel_action", actionId }),
      updatePendingAction: async (actionId, updates) =>
        mutate({ type: "update_pending_action", actionId, updates }),
      addTask: async (input) => mutate({ type: "add_task", input }),
      updateTask: async (taskId, updates) => mutate({ type: "update_task", taskId, updates }),
      toggleTask: async (taskId) => mutate({ type: "toggle_task", taskId }),
      deleteTask: async (taskId) => mutate({ type: "delete_task", taskId }),
      addNote: async (input) => mutate({ type: "add_note", input }),
      updateNote: async (noteId, updates) => {
        if (Object.keys(updates).every((key) => key === "summary")) {
          await mutate({ type: "summarize_note", noteId });
          return;
        }
        if (Object.keys(updates).every((key) => key === "tags")) {
          await mutate({ type: "suggest_note_tags", noteId });
          return;
        }
        await mutate({ type: "update_note", noteId, updates });
      },
      deleteNote: async (noteId) => mutate({ type: "delete_note", noteId }),
      addReminder: async (input) => mutate({ type: "add_reminder", input }),
      addCalendarEvent: async (input) => mutate({ type: "add_calendar_event", input }),
      updateCalendarEvent: async (eventId, updates) => mutate({ type: "update_calendar_event", eventId, updates }),
      deleteCalendarEvent: async (eventId) => mutate({ type: "delete_calendar_event", eventId }),
      markNotificationRead: async (notificationId) => mutate({ type: "mark_notification_read", notificationId }),
      updateNotificationCategory: async (notificationId, category) =>
        mutate({ type: "update_notification_category", notificationId, category }),
      updateReminder: async (reminderId, updates) => mutate({ type: "update_reminder", reminderId, updates }),
      deleteReminder: async (reminderId) => mutate({ type: "delete_reminder", reminderId }),
      saveDraft: async (draftId, updates) => mutate({ type: "save_draft", draftId, updates }),
      deleteDraft: async (draftId) => mutate({ type: "delete_draft", draftId }),
      summarizeNote: async (noteId) => mutate({ type: "summarize_note", noteId }),
      suggestNoteTags: async (noteId) => mutate({ type: "suggest_note_tags", noteId }),
      createCallFollowups: async (callId) => mutate({ type: "create_call_followups", callId }),
      updatePreferences: async (updates) => mutate({ type: "update_preferences", updates }),
      updateProfile: async (updates) => mutate({ type: "update_profile", updates }),
      updateIntegrations: async (updates) => mutate({ type: "update_integrations", updates }),
      resetState: async () => mutate({ type: "reset_state" }),
    }),
    [state, isHydrating, lastError],
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
