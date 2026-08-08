export type NavKey =
  | "dashboard"
  | "assistant"
  | "tasks"
  | "notes"
  | "reminders"
  | "calendar"
  | "confirmations"
  | "notifications"
  | "settings";

export type Priority = "low" | "medium" | "high";
export type RiskLevel = "low" | "medium" | "high";
export type ThemeName = "carbon" | "light" | "dawn" | "ocean";

export type UserPreferences = {
  theme: ThemeName;
  assistantTone: "calm" | "friendly" | "formal";
  digestStyle: "balanced" | "brief";
  approvalsLocked: boolean;
};

export type UserProfile = {
  name: string;
  email: string;
  role: string;
};

export type IntegrationState = {
  calendar: boolean;
  emailDrafts: boolean;
  shareContextWithAi: boolean;
};

export type SessionState = {
  isAuthenticated: boolean;
  lastActiveAt?: string;
};

export type RuntimeStatus = {
  storageMode: "file";
  databaseConfigured: boolean;
  ollamaConfigured: boolean;
  ollamaModel: string;
  googleOAuthConfigured: boolean;
  gmailConfigured: boolean;
  calendarConfigured: boolean;
};

export type SyncStatus = "local" | "synced" | "failed";

export type Task = {
  id: string;
  title: string;
  description?: string;
  due: string;
  status: "pending" | "done" | "overdue";
  priority: Priority;
};

export type Reminder = {
  id: string;
  title: string;
  when: string;
  repeat: "none" | "daily" | "weekly" | "monthly";
  priority: Priority;
  status: "active" | "snoozed" | "done";
};

export type CalendarEvent = {
  id: string;
  title: string;
  detail: string;
  start: string;
  end: string;
  location?: string;
  tone: "teal" | "gold" | "rose";
  syncStatus?: SyncStatus;
  externalId?: string;
  externalUrl?: string;
  syncError?: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  summary: string;
  tags: string[];
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  category: "urgent" | "important" | "later" | "low";
  source: string;
  isRead?: boolean;
};

export type EmailDraft = {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  tone: "professional" | "friendly" | "short" | "formal";
  status: "draft" | "approved";
  syncStatus?: SyncStatus;
  externalId?: string;
  externalUrl?: string;
  syncError?: string;
};

export type PendingActionType =
  | "create_reminder"
  | "create_task"
  | "create_calendar_event"
  | "draft_email"
  | "create_tasks_from_note";

export type PendingAction = {
  id: string;
  type: PendingActionType;
  title: string;
  description: string;
  risk: RiskLevel;
  status: "pending" | "approved" | "cancelled";
  payload: Record<string, unknown>;
};

export type ActionLogEntry = {
  id: string;
  title: string;
  detail: string;
  category: "assistant" | "approval" | "productivity" | "system";
  impact: "info" | "success" | "warning";
  happenedAt: string;
};

export type AssistantRequestEntry = {
  id: string;
  input: string;
  outcome: string;
  status: "queued" | "proposal_created" | "completed" | "needs_clarification";
  happenedAt: string;
};

export type RelayStateSnapshot = {
  tasks: Task[];
  notes: Note[];
  reminders: Reminder[];
  calendarEvents: CalendarEvent[];
  notifications: NotificationItem[];
  drafts: EmailDraft[];
  pendingActions: PendingAction[];
  assistantFeed: string[];
  assistantRequests: AssistantRequestEntry[];
  actionLog: ActionLogEntry[];
  preferences: UserPreferences;
  profile: UserProfile;
  integrations: IntegrationState;
  session: SessionState;
  runtime: RuntimeStatus;
};

export type DashboardInsightSnapshot = {
  dailyBrief: string;
  focusMessage: string;
  suggestionCards: string[];
  notificationSummary: string;
  rankedNotifications: NotificationItem[];
};

export type RelayMutationRequest =
  | { type: "reset_state" }
  | { type: "submit_command"; input: string }
  | { type: "approve_action"; actionId: string }
  | { type: "cancel_action"; actionId: string }
  | { type: "update_pending_action"; actionId: string; updates: Partial<PendingAction> }
  | {
      type: "add_task";
      input: {
        title: string;
        due: string;
        priority: Task["priority"];
        description?: string;
      };
    }
  | { type: "toggle_task"; taskId: string }
  | { type: "update_task"; taskId: string; updates: Partial<Task> }
  | { type: "delete_task"; taskId: string }
  | {
      type: "add_note";
      input: {
        title: string;
        content: string;
      };
    }
  | { type: "delete_note"; noteId: string }
  | { type: "update_note"; noteId: string; updates: Partial<Note> }
  | { type: "summarize_note"; noteId: string }
  | { type: "suggest_note_tags"; noteId: string }
  | {
      type: "add_reminder";
      input: {
        title: string;
        when: string;
        repeat: Reminder["repeat"];
        priority: Reminder["priority"];
      };
    }
  | {
      type: "add_calendar_event";
      input: {
        title: string;
        detail: string;
        start: string;
        end: string;
        location?: string;
        tone: CalendarEvent["tone"];
      };
    }
  | { type: "update_calendar_event"; eventId: string; updates: Partial<CalendarEvent> }
  | { type: "delete_calendar_event"; eventId: string }
  | { type: "mark_notification_read"; notificationId: string }
  | {
      type: "update_notification_category";
      notificationId: string;
      category: NotificationItem["category"];
    }
  | { type: "update_reminder"; reminderId: string; updates: Partial<Reminder> }
  | { type: "delete_reminder"; reminderId: string }
  | { type: "save_draft"; draftId: string; updates: Partial<EmailDraft> }
  | { type: "delete_draft"; draftId: string }
  | { type: "sign_in" }
  | { type: "sign_out" }
  | { type: "update_preferences"; updates: Partial<UserPreferences> }
  | { type: "update_profile"; updates: Partial<UserProfile> }
  | { type: "update_integrations"; updates: Partial<IntegrationState> };
