const DAY = 24 * 60 * 60 * 1000;

export const formatDate = (d, opts = {}) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric", ...opts });
};

export const formatDateShort = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "—");

export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

/** "3 hours ago", "in 2 days", "just now" */
export const relativeTime = (d) => {
  if (!d) return "";
  const diff = new Date(d).getTime() - Date.now();
  const abs = Math.abs(diff);
  const past = diff < 0;
  const units = [
    [60 * 1000, "second", 1000],
    [60 * 60 * 1000, "minute", 60 * 1000],
    [DAY, "hour", 60 * 60 * 1000],
    [7 * DAY, "day", DAY],
    [30 * DAY, "week", 7 * DAY],
    [365 * DAY, "month", 30 * DAY],
    [Infinity, "year", 365 * DAY]
  ];
  if (abs < 45 * 1000) return "just now";
  for (const [limit, name, size] of units) {
    if (abs < limit) {
      const n = Math.round(abs / size);
      const label = `${n} ${name}${n === 1 ? "" : "s"}`;
      return past ? `${label} ago` : `in ${label}`;
    }
  }
  return "";
};

/** Whole days from today to a date (negative when past). */
export const daysUntil = (d) => {
  if (!d) return null;
  const target = new Date(d);
  target.setHours(23, 59, 59, 999);
  return Math.ceil((target.getTime() - Date.now()) / DAY);
};

/** Human deadline label + tone for badges. */
export const deadlineInfo = (deadline, done = false) => {
  if (!deadline) return { label: "No deadline", tone: "neutral" };
  const days = daysUntil(deadline);
  if (done) return { label: `Due ${formatDateShort(deadline)}`, tone: "neutral" };
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, tone: "danger" };
  if (days === 0) return { label: "Due today", tone: "warning" };
  if (days === 1) return { label: "Due tomorrow", tone: "warning" };
  if (days <= 3) return { label: `Due in ${days}d`, tone: "warning" };
  return { label: `Due ${formatDateShort(deadline)}`, tone: "neutral" };
};

export const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("");

export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export const plural = (n, word, suffix = "s") => `${n} ${word}${n === 1 ? "" : suffix}`;
