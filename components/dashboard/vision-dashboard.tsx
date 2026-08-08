"use client";

import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Mail,
  ShieldCheck,
  Sparkles,
  Dumbbell,
  Utensils,
} from "lucide-react";
import type {
  CalendarEvent,
  NotificationItem,
  PendingAction,
  Reminder,
  Task,
  WorkoutLog,
  MealLog,
} from "@/lib/types";

type VisionDashboardProps = {
  profileName: string;
  dailyBrief: string;
  focusMessage: string;
  ollamaModel: string;
  tasks: Task[];
  reminders: Reminder[];
  calendarEvents: CalendarEvent[];
  notifications: NotificationItem[];
  workouts: WorkoutLog[];
  meals: MealLog[];
  pendingActions: PendingAction[];
  pendingDraftCount: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  onToggleTask: (taskId: string) => void;
  onApproveAction: (actionId: string) => void;
  onMarkNotificationRead: (notificationId: string) => void;
};

export function VisionDashboard({
  profileName,
  dailyBrief,
  focusMessage,
  ollamaModel,
  tasks,
  reminders,
  calendarEvents,
  notifications,
  workouts,
  meals,
  pendingActions,
  pendingDraftCount,
  isRefreshing,
  onRefresh,
  onToggleTask,
  onApproveAction,
  onMarkNotificationRead,
}: VisionDashboardProps) {
  const openTasks = tasks.filter((task) => task.status !== "done");
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const completionRate = tasks.length === 0 ? 0 : Math.round((completedTasks / tasks.length) * 100);
  const activeReminders = reminders.filter((reminder) => reminder.status === "active").length;
  const urgentNotifications = notifications.filter(
    (notification) => !notification.isRead && ["urgent", "important"].includes(notification.category),
  ).length;
  const highRiskActions = pendingActions.filter((action) => action.risk === "high").length;
  const approvalScore = Math.max(8.1, 10 - highRiskActions * 0.4 - pendingActions.length * 0.03).toFixed(1);
  const dayLoad = Math.min(100, calendarEvents.length * 12 + openTasks.length * 6 + activeReminders * 4);
  const today = new Date().toISOString().slice(0, 10);
  const caloriesToday = meals.filter((meal) => meal.eatenAt.startsWith(today)).reduce((total, meal) => total + meal.calories, 0);
  const weeklyMinutes = workouts.filter((workout) => Date.now() - new Date(workout.performedAt).getTime() <= 7 * 86_400_000).reduce((total, workout) => total + workout.durationMinutes, 0);

  const metrics = [
    {
      label: "Today's schedule",
      value: calendarEvents.length,
      detail: `${activeReminders} reminders active`,
      icon: CalendarDays,
      trend: "+2 planned",
      tone: "cyan",
    },
    {
      label: "Open tasks",
      value: openTasks.length,
      detail: `${completedTasks} completed`,
      icon: ClipboardCheck,
      trend: `${completionRate}% done`,
      tone: "violet",
    },
    {
      label: "Pending approvals",
      value: pendingActions.length,
      detail: `${highRiskActions} high risk`,
      icon: ShieldCheck,
      trend: "Review first",
      tone: "indigo",
    },
    {
      label: "Priority alerts",
      value: urgentNotifications,
      detail: `${pendingDraftCount} email drafts`,
      icon: BellRing,
      trend: urgentNotifications > 0 ? "Needs attention" : "All clear",
      tone: "blue",
    },
    {
      label: "Weekly movement",
      value: weeklyMinutes,
      detail: `${workouts.length} sessions logged`,
      icon: Dumbbell,
      trend: "7 day total",
      tone: "cyan",
    },
    {
      label: "Calories today",
      value: caloriesToday,
      detail: `${meals.filter((meal) => meal.eatenAt.startsWith(today)).length} meals logged`,
      icon: Utensils,
      trend: "User entered",
      tone: "violet",
    },
  ] as const;

  return (
    <div className="vision-dashboard" aria-label="Relay dashboard">
      <section className="vision-stat-grid" aria-label="Today metrics">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="vision-stat-card" style={{ "--card-order": index } as React.CSSProperties}>
              <div>
                <p className="vision-label">{metric.label}</p>
                <div className="vision-stat-value-row">
                  <strong>{metric.value}</strong>
                  <span>{metric.trend}</span>
                </div>
                <p className="vision-stat-detail">{metric.detail}</p>
              </div>
              <div className={`vision-stat-icon ${metric.tone}`}>
                <Icon aria-hidden="true" />
              </div>
            </article>
          );
        })}
      </section>

      <section className="vision-welcome-card">
        <div className="vision-welcome-copy">
          <p>Welcome back,</p>
          <h1>{profileName}</h1>
          <span>{dailyBrief}</span>
          <Link href="/assistant" className="vision-hero-action">
            Ask Relay anything
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <div className="vision-hero-status" aria-label={`Relay AI using ${ollamaModel}`}>
          <span className="vision-live-dot" />
          Relay AI online
        </div>
        <div className="vision-hero-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>

      <section className="vision-analysis-grid">
        <article className="vision-analysis-card vision-focus-card">
          <header className="vision-card-heading">
            <div>
              <h2>Daily Focus</h2>
              <p>Your workload balance today</p>
            </div>
            <button type="button" onClick={onRefresh} disabled={isRefreshing} className="vision-dot-button" aria-label="Refresh daily focus">
              <Sparkles aria-hidden="true" />
            </button>
          </header>

          <div className="vision-focus-body">
            <div className="vision-progress-ring" style={{ "--ring-value": `${dayLoad}` } as React.CSSProperties}>
              <svg viewBox="0 0 240 240" role="img" aria-label={`${dayLoad}% workload`}>
                <circle className="vision-ring-track" cx="120" cy="120" r="94" pathLength="100" />
                <circle className="vision-ring-value" cx="120" cy="120" r="94" pathLength="100" strokeDasharray={`${dayLoad} 100`} />
              </svg>
              <div className="vision-ring-center">
                <Sparkles aria-hidden="true" />
                <strong>{dayLoad}%</strong>
                <span>day load</span>
              </div>
            </div>
            <div className="vision-focus-summary">
              <span>Relay recommends</span>
              <p>{focusMessage}</p>
              <div className="vision-mini-stats">
                <div><strong>{openTasks.length}</strong><span>tasks</span></div>
                <div><strong>{activeReminders}</strong><span>reminders</span></div>
                <div><strong>{calendarEvents.length}</strong><span>events</span></div>
              </div>
            </div>
          </div>
        </article>

        <article className="vision-analysis-card vision-safety-card">
          <header className="vision-card-heading">
            <div>
              <h2>Approval Safety</h2>
              <p>Important actions stay under your control</p>
            </div>
            <Link href="/confirmations" className="vision-dot-button" aria-label="Open confirmations">
              <ArrowRight aria-hidden="true" />
            </Link>
          </header>

          <div className="vision-safety-body">
            <div className="vision-safety-breakdown">
              <div><span>Waiting for review</span><strong>{pendingActions.length}</strong></div>
              <div><span>High risk</span><strong>{highRiskActions}</strong></div>
              <div><span>Approved today</span><strong>{Math.max(0, completedTasks)}</strong></div>
            </div>
            <div className="vision-safety-gauge">
              <svg viewBox="0 0 240 150" aria-hidden="true">
                <path className="vision-gauge-track" d="M 30 130 A 90 90 0 0 1 210 130" pathLength="100" />
                <path className="vision-gauge-value" d="M 30 130 A 90 90 0 0 1 210 130" pathLength="100" strokeDasharray="96 100" />
              </svg>
              <div><span>Safety</span><strong>{approvalScore}</strong><small>Total score</small></div>
            </div>
          </div>

          <div className="vision-approval-preview">
            {pendingActions.slice(0, 2).map((action) => (
              <div key={action.id}>
                <span className={`vision-risk-dot ${action.risk}`} />
                <p>{action.title}</p>
                <button type="button" onClick={() => onApproveAction(action.id)}>Approve</button>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="vision-detail-grid">
        <article className="vision-table-card">
          <header className="vision-card-heading">
            <div>
              <h2>Priority Tasks</h2>
              <p>Your highest-impact work in one place</p>
            </div>
            <Link href="/tasks" className="vision-card-link">View all <ArrowRight aria-hidden="true" /></Link>
          </header>
          <div className="vision-task-table">
            <div className="vision-table-header"><span>Task</span><span>Due</span><span>Priority</span><span>Status</span></div>
            {tasks.slice(0, 5).map((task) => (
              <div className="vision-task-row" key={task.id}>
                <div><button type="button" onClick={() => onToggleTask(task.id)} aria-label={`Toggle ${task.title}`}><Check aria-hidden="true" /></button><span>{task.title}</span></div>
                <span>{task.due}</span>
                <span className={`vision-priority ${task.priority}`}>{task.priority}</span>
                <span className={`vision-task-status ${task.status}`}><CheckCircle2 aria-hidden="true" />{task.status}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="vision-timeline-card">
          <header className="vision-card-heading">
            <div><h2>Today</h2><p>Your schedule and reminders</p></div>
            <Link href="/calendar" className="vision-card-link">Calendar <ArrowRight aria-hidden="true" /></Link>
          </header>
          <div className="vision-timeline">
            {calendarEvents.slice(0, 4).map((event) => (
              <div key={event.id} className="vision-timeline-item">
                <span className={`vision-timeline-dot ${event.tone}`} />
                <div><strong>{event.title}</strong><p>{event.detail}</p></div>
                <time>{formatScheduleTime(event.start)}</time>
              </div>
            ))}
            {reminders.slice(0, 2).map((reminder) => (
              <div key={reminder.id} className="vision-timeline-item reminder">
                <span className="vision-timeline-dot violet"><Clock3 aria-hidden="true" /></span>
                <div><strong>{reminder.title}</strong><p>{reminder.repeat === "none" ? "One-time reminder" : `Repeats ${reminder.repeat}`}</p></div>
                <time>{reminder.when}</time>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="vision-notification-card">
        <header className="vision-card-heading">
          <div><h2>Notification Intelligence</h2><p>Only the signals that matter right now</p></div>
          <Link href="/notifications" className="vision-card-link">Open inbox <ArrowRight aria-hidden="true" /></Link>
        </header>
        <div className="vision-notification-grid">
          {notifications.slice(0, 4).map((notification) => (
            <button key={notification.id} type="button" onClick={() => onMarkNotificationRead(notification.id)} className={notification.isRead ? "read" : ""}>
              <span className={`vision-notification-icon ${notification.category}`}><BellRing aria-hidden="true" /></span>
              <span><strong>{notification.title}</strong><small>{notification.body}</small></span>
              <em>{notification.category}</em>
            </button>
          ))}
          {pendingDraftCount > 0 ? (
            <Link href="/assistant" className="vision-draft-callout">
              <Mail aria-hidden="true" /><span><strong>{pendingDraftCount} draft waiting</strong><small>Review prepared email</small></span><ArrowRight aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function formatScheduleTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
