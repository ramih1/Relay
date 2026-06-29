export type NavKey =
  | "dashboard"
  | "assistant"
  | "tasks"
  | "notes"
  | "reminders"
  | "calendar"
  | "calls"
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
  callAssistant: boolean;
  shareContextWithAi: boolean;
};

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
};

export type CallRequest = {
  id: string;
  contactName: string;
  phoneNumber: string;
  purpose: string;
  script: string;
  allowedActions: string[];
  restrictedActions: string[];
  status: "pending" | "approved" | "simulated";
  transcript?: string;
  summary?: string;
};

export type PendingActionType =
  | "create_reminder"
  | "create_task"
  | "create_calendar_event"
  | "draft_email"
  | "create_tasks_from_note"
  | "place_call"
  | "create_followup_task";

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
  category: "assistant" | "approval" | "call" | "productivity" | "system";
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

export type JarvisStateSnapshot = {
  tasks: Task[];
  notes: Note[];
  reminders: Reminder[];
  calendarEvents: CalendarEvent[];
  notifications: NotificationItem[];
  drafts: EmailDraft[];
  calls: CallRequest[];
  pendingActions: PendingAction[];
  assistantFeed: string[];
  assistantRequests: AssistantRequestEntry[];
  actionLog: ActionLogEntry[];
  preferences: UserPreferences;
  profile: UserProfile;
  integrations: IntegrationState;
};

export type DashboardInsightSnapshot = {
  dailyBrief: string;
  focusMessage: string;
  suggestionCards: string[];
  notificationSummary: string;
  rankedNotifications: NotificationItem[];
};

export type JarvisMutationRequest =
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
  | { type: "delete_task"; taskId: string }
  | {
      type: "add_note";
      input: {
        title: string;
        content: string;
      };
    }
  | { type: "delete_note"; noteId: string }
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
  | { type: "create_call_followups"; callId: string }
  | { type: "update_preferences"; updates: Partial<UserPreferences> }
  | { type: "update_profile"; updates: Partial<UserProfile> }
  | { type: "update_integrations"; updates: Partial<IntegrationState> };
