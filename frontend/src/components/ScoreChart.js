import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "./ui";

const SERIES = [
  { key: "taskPoints", name: "Task points", color: "#6366f1" },
  { key: "timelinessPos", name: "On-time bonus", color: "#10b981" },
  { key: "feedback", name: "Peer feedback", color: "#f59e0b" },
  { key: "activity", name: "Activity", color: "#0ea5e9" }
];

/** Stacked bar chart of score breakdown per user. */
export default function ScoreChart({ rows = [], height = 280, nameKey = "userName" }) {
  if (!rows.length) return <EmptyState icon="trending" title="No scores yet" text="Scores appear once tasks are completed or feedback is given." />;

  const data = rows.map((r) => ({
    name: r[nameKey]?.split(" ")[0] || "?",
    full: r[nameKey],
    taskPoints: r.taskPoints || 0,
    timelinessPos: Math.max(0, r.timeliness || 0),
    feedback: r.feedback || 0,
    activity: r.activity || 0,
    score: r.score
  }));

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "var(--bg-hover)" }}
            formatter={(v, n) => [v, n]}
            labelFormatter={(l, p) => `${p?.[0]?.payload?.full || l} — ${p?.[0]?.payload?.score ?? 0} pts`}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          {SERIES.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color} radius={i === SERIES.length - 1 ? [6, 6, 0, 0] : 0} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
