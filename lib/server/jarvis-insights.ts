import { initialNotifications } from "@/lib/data";
import { getJarvisState } from "@/lib/server/jarvis-store";
import type { DashboardInsightSnapshot, NotificationItem } from "@/lib/types";

const notificationRank: Record<NotificationItem["category"], number> = {
  urgent: 0,
  important: 1,
  later: 2,
  low: 3,
};

export async function getDashboardInsights(): Promise<DashboardInsightSnapshot> {
  const state = await getJarvisState();
  const overdueCount = state.tasks.filter((task) => task.status === "overdue").length;
  const pendingApprovals = state.pendingActions.filter((item) => item.status === "pending").length;
  const activeReminders = state.reminders.filter((item) => item.status === "active").length;
  const draftCount = state.drafts.filter((item) => item.status === "draft").length;
  const pendingCalls = state.calls.filter((item) => item.status === "pending").length;
  const simulatedCalls = state.calls.filter((item) => item.status === "simulated").length;
  const highPriorityTasks = state.tasks.filter((task) => task.priority === "high" && task.status !== "done").length;

  const briefParts = [
    overdueCount > 0 ? `${overdueCount} overdue task${overdueCount === 1 ? "" : "s"}` : null,
    pendingApprovals > 0 ? `${pendingApprovals} approval${pendingApprovals === 1 ? "" : "s"} waiting` : null,
    draftCount > 0 ? `${draftCount} draft${draftCount === 1 ? "" : "s"} pending review` : null,
    pendingCalls > 0 ? `${pendingCalls} call plan${pendingCalls === 1 ? "" : "s"} ready to confirm` : null,
    activeReminders > 0 ? `${activeReminders} active reminder${activeReminders === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  const dailyBrief =
    briefParts.length > 0
      ? `Today you have ${briefParts.join(", ")}.`
      : "Today looks clear. Good moment to prepare your next reminder, email, or call plan.";

  const focusMessage =
    overdueCount > 0
      ? "Clear the overdue work first so the rest of the day feels lighter."
      : pendingApprovals > 0
        ? "Your highest-leverage move is approving or editing the actions JARVIS already prepared."
        : highPriorityTasks > 0
          ? "A short focus block on the high-priority tasks would create the most momentum right now."
          : "You have room to plan ahead. Use the assistant bar to prepare your next move before the day gets busier.";

  const rankedNotifications = [...initialNotifications].sort(
    (left, right) => notificationRank[left.category] - notificationRank[right.category],
  );

  const urgentCount = rankedNotifications.filter((item) => item.category === "urgent").length;
  const importantCount = rankedNotifications.filter((item) => item.category === "important").length;
  const notificationSummary =
    urgentCount > 0
      ? `${urgentCount} urgent notification${urgentCount === 1 ? "" : "s"} need attention now, plus ${importantCount} important update${importantCount === 1 ? "" : "s"} worth checking soon.`
      : `No urgent alerts right now. ${importantCount} important notification${importantCount === 1 ? "" : "s"} can be handled next.`;

  const suggestionCards = [
    pendingApprovals > 0
      ? "Review the confirmation queue and approve the ready actions."
      : "Queue one new reminder or draft so JARVIS can prepare the next step for you.",
    simulatedCalls > 0
      ? "Turn the latest call summary into a follow-up reminder or task."
      : "Prepare one transparent call plan for something you would rather not call about yourself.",
    highPriorityTasks > 0
      ? "Block time around your schedule to finish the highest-priority work."
      : "Use a note and task extraction flow to build tomorrow's priorities early.",
  ];

  return {
    dailyBrief,
    focusMessage,
    suggestionCards,
    notificationSummary,
    rankedNotifications,
  };
}
