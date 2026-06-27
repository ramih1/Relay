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

export type JarvisStateSnapshot = {
  tasks: Task[];
  notes: Note[];
  reminders: Reminder[];
  drafts: EmailDraft[];
  calls: CallRequest[];
  pendingActions: PendingAction[];
  assistantFeed: string[];
  actionLog: ActionLogEntry[];
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
  | { type: "update_reminder"; reminderId: string; updates: Partial<Reminder> }
  | { type: "delete_reminder"; reminderId: string }
  | { type: "save_draft"; draftId: string; updates: Partial<EmailDraft> }
  | { type: "delete_draft"; draftId: string }
  | { type: "create_call_followups"; callId: string };
