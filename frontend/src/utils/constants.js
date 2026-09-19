export const TASK_STATUS = {
  todo: { label: "To do", tone: "neutral" },
  "in-progress": { label: "In progress", tone: "warning" },
  done: { label: "Done", tone: "success" }
};

export const STATUS_ORDER = ["todo", "in-progress", "done"];

export const PRIORITY = {
  high: { label: "High", tone: "danger" },
  medium: { label: "Medium", tone: "warning" },
  low: { label: "Low", tone: "info" }
};

export const WEIGHT = {
  1: { label: "Small", points: 10 },
  2: { label: "Medium", points: 20 },
  3: { label: "Large", points: 30 }
};

export const PROJECT_STATUS = {
  active: { label: "Active", tone: "success" },
  completed: { label: "Completed", tone: "primary" },
  archived: { label: "Archived", tone: "neutral" }
};

export const PROJECT_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6"];

export const ACTIVITY = {
  task_created: { label: "created task", tone: "primary", icon: "plus" },
  task_updated: { label: "updated task", tone: "info", icon: "edit" },
  task_started: { label: "started working on", tone: "warning", icon: "play" },
  task_completed: { label: "completed", tone: "success", icon: "check" },
  task_reopened: { label: "reopened", tone: "warning", icon: "refresh" },
  task_deleted: { label: "deleted task", tone: "danger", icon: "trash" },
  project_created: { label: "created project", tone: "primary", icon: "folder" },
  project_updated: { label: "updated project", tone: "info", icon: "edit" },
  project_deleted: { label: "deleted project", tone: "danger", icon: "trash" },
  member_added: { label: "added member", tone: "success", icon: "userPlus" },
  member_removed: { label: "removed member", tone: "danger", icon: "userMinus" },
  feedback_given: { label: "gave feedback", tone: "warning", icon: "star" }
};

export const ROLE_LABEL = { admin: "Administrator", manager: "Manager", member: "Team member" };
