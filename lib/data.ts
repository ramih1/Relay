import { CalendarEvent, CallRequest, EmailDraft, Note, NotificationItem, PendingAction, Reminder, Task } from "@/lib/types";

export const initialTasks: Task[] = [
  {
    id: "task-1",
    title: "Submit machine learning project outline",
    description: "Finalize the scope and upload it before 5 PM.",
    due: "Today, 5:00 PM",
    status: "overdue",
    priority: "high",
  },
  {
    id: "task-2",
    title: "Prep slides for internship check-in",
    due: "Tomorrow, 9:00 AM",
    status: "pending",
    priority: "high",
  },
  {
    id: "task-3",
    title: "Review econ reading summary",
    due: "Saturday, 11:00 AM",
    status: "pending",
    priority: "medium",
  },
];

export const initialReminders: Reminder[] = [
  {
    id: "reminder-1",
    title: "Call mom back",
    when: "Today, 6:30 PM",
    repeat: "none",
    priority: "medium",
    status: "active",
  },
  {
    id: "reminder-2",
    title: "Weekly budgeting reset",
    when: "Sunday, 10:00 AM",
    repeat: "weekly",
    priority: "low",
    status: "active",
  },
];

export const initialCalendarEvents: CalendarEvent[] = [
  {
    id: "event-1",
    title: "Data Structures Lecture",
    detail: "CS Building, Room 301",
    start: "9:00 AM",
    end: "10:15 AM",
    location: "CS Building, Room 301",
    tone: "teal",
  },
  {
    id: "event-2",
    title: "Study Group",
    detail: "Library, Room 2B",
    start: "11:00 AM",
    end: "12:00 PM",
    location: "Library, Room 2B",
    tone: "teal",
  },
  {
    id: "event-3",
    title: "Project Meeting",
    detail: "Online • Google Meet",
    start: "3:00 PM",
    end: "3:45 PM",
    location: "Google Meet",
    tone: "gold",
  },
  {
    id: "event-4",
    title: "Gym",
    detail: "Fitness Session",
    start: "6:30 PM",
    end: "8:00 PM",
    location: "Campus Gym",
    tone: "teal",
  },
];

export const initialNotes: Note[] = [
  {
    id: "note-1",
    title: "Research sync notes",
    summary: "Need professor approval on timeline, dataset cleanup, and presentation plan.",
    tags: ["school", "research"],
    content:
      "Messy notes: confirm timeline with professor, clean dataset labels, book room for Friday practice, email team the new experiment checklist.",
  },
  {
    id: "note-2",
    title: "Apartment errands",
    summary: "A short list of things to sort before the weekend.",
    tags: ["life", "errands"],
    content:
      "Need to ask concierge about parcel, schedule laundry, and check if gym closes early tonight.",
  },
];

export const initialNotifications: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Assignment portal closes in 3 hours",
    body: "Your machine learning project submission window ends at 5 PM today.",
    category: "urgent",
    source: "University LMS",
  },
  {
    id: "notif-2",
    title: "Team check-in moved to 3 PM",
    body: "Design review shifted by 30 minutes. Updated agenda attached.",
    category: "important",
    source: "Work",
  },
  {
    id: "notif-3",
    title: "Phone bill reminder",
    body: "Autopay runs tomorrow morning.",
    category: "later",
    source: "Finance",
  },
  {
    id: "notif-4",
    title: "Gym promo",
    body: "Summer intramural signups are open.",
    category: "low",
    source: "Campus Gym",
  },
];

export const initialEmailDrafts: EmailDraft[] = [
  {
    id: "draft-1",
    recipient: "prof.khan@university.edu",
    subject: "Request for a Short Extension on Project Outline",
    tone: "professional",
    status: "draft",
    body:
      "Hi Professor Khan,\n\nI hope you're doing well. I'm writing to ask whether a short extension on the project outline would be possible. I have the core work drafted, but I want to make sure the final submission is complete and polished.\n\nIf possible, an extra day would help me submit stronger work. I understand if that is not feasible, and I appreciate your consideration.\n\nBest,\nRami",
  },
];

export const initialCalls: CallRequest[] = [
  {
    id: "call-1",
    contactName: "Campus Gym",
    phoneNumber: "(555) 210-1184",
    purpose: "Ask whether the basketball court is free tonight after 7.",
    script:
      "Hi, I'm JARVIS, an AI assistant calling on behalf of Rami. I'm checking whether the basketball court is open tonight after 7 PM, and whether there's any closing time to keep in mind.",
    allowedActions: ["Ask availability", "Ask closing time"],
    restrictedActions: ["Do not book anything", "Do not share private information"],
    status: "simulated",
    transcript:
      "JARVIS: Hi, I'm JARVIS, an AI assistant calling on behalf of Rami...\nGym: The court is free after 7:30 PM tonight.\nJARVIS: Great, is there a closing time?\nGym: We close at 10 PM.\nJARVIS: Thanks, I'll pass that along.",
    summary: "Court is available after 7:30 PM. No booking required. Facility closes at 10 PM.",
  },
];

export const initialPendingActions: PendingAction[] = [
  {
    id: "pa-1",
    type: "draft_email",
    title: "Email draft waiting for approval",
    description: "Professional extension request to Professor Khan.",
    risk: "medium",
    status: "pending",
    payload: { draftId: "draft-1" },
  },
  {
    id: "pa-2",
    type: "create_followup_task",
    title: "Save gym follow-up reminder",
    description: "Create a reminder to leave by 6:45 PM for basketball.",
    risk: "medium",
    status: "pending",
    payload: { title: "Leave for gym", when: "Today, 6:45 PM" },
  },
];
