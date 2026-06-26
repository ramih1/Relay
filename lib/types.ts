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
