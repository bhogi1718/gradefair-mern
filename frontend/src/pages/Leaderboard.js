import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useApi from "../hooks/useApi";
import ScoreChart from "../components/ScoreChart";
import { Avatar, Badge, EmptyState, Icon, PageHeader, RankBadge, ScoreBreakdown, SkeletonList, StarRating } from "../components/ui";

export default function Leaderboard() {
  const { user, isMember } = useAuth();
  const rows = useApi("/score/project", { initial: [] });
  const weights = useApi("/score/weights");

  const [project, setProject] = useState("all");
  const [showHow, setShowHow] = useState(false);

  const projects = useMemo(() => {
    const m = new Map();
    for (const r of rows.data || []) m.set(r.project, { id: r.project, name: r.projectName, color: r.projectColor, status: r.projectStatus });
    return [...m.values()];
  }, [rows.data]);

  // Aggregate per user across the selected scope
  const board = useMemo(() => {
    const scope = project === "all" ? rows.data || [] : (rows.data || []).filter((r) => r.project === project);
    const by = new Map();
    for (const r of scope) {
      const a = by.get(r.user) || { user: r.user, userName: r.userName, avatarColor: r.avatarColor, score: 0, taskPoints: 0, timeliness: 0, feedback: 0, activity: 0, tasksTotal: 0, tasksCompleted: 0, ratingSum: 0, ratingCount: 0, projects: 0, onTime: 0, late: 0, overdue: 0 };
      a.score += r.score; a.taskPoints += r.taskPoints; a.timeliness += r.timeliness; a.feedback += r.feedback; a.activity += r.activity;
      a.tasksTotal += r.tasksTotal; a.tasksCompleted += r.tasksCompleted; a.projects += 1; a.onTime += r.onTime; a.late += r.late; a.overdue += r.overdue;
      if (r.avgRating != null) { a.ratingSum += r.avgRating * r.ratingCount; a.ratingCount += r.ratingCount; }
      by.set(r.user, a);
    }
    return [...by.values()]
      .map((a) => ({ ...a, feedback: Math.round(a.feedback * 10) / 10, avgRating: a.ratingCount ? Math.round((a.ratingSum / a.ratingCount) * 10) / 10 : null, completionRate: a.tasksTotal ? Math.round((a.tasksCompleted / a.tasksTotal) * 100) : 0 }))
      .sort((a, b) => b.score - a.score || a.userName.localeCompare(b.userName));
  }, [rows.data, project]);

  const w = weights.data;
  const myIndex = board.findIndex((r) => r.user === user?._id);

  return (
    <>
      <PageHeader
        title="Leaderboard"
        subtitle={isMember ? "How everyone in your projects is contributing." : "Contribution rankings across your projects."}
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setShowHow((s) => !s)}><Icon name="info" /> How scoring works</button>
            <select className="select" value={project} onChange={(e) => setProject(e.target.value)} style={{ width: 220 }}>
              <option value="all">All projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </>
        }
      />

      {showHow && w && (
        <div className="card mb-16" style={{ borderLeft: "4px solid var(--primary)" }}>
          <div className="card-body">
            <h3 className="mb-16"><Icon name="scale" size={16} /> The formula (same for everyone)</h3>
            <div className="grid grid-4">
              <Rule color="#6366f1" title="Task points" text={`Each completed task earns its size × ${w.perWeightUnit}: small ${w.perWeightUnit}, medium ${w.perWeightUnit * 2}, large ${w.perWeightUnit * 3}. Unfinished tasks earn nothing.`} />
              <Rule color="#10b981" title="Timeliness" text={`+${w.onTimeBonus} for finishing before the deadline. −${w.latePenalty} for finishing late. −${w.overduePenalty} for each open task that's overdue right now.`} />
              <Rule color="#f59e0b" title="Peer feedback" text={`Average teammate rating (1–5) × ${w.feedbackMultiplier}, so up to ${5 * w.feedbackMultiplier} points per project.`} />
              <Rule color="#0ea5e9" title="Activity" text={`1 point per status change or description edit by the assignee, capped at ${w.activityCap} so it can't be farmed.`} />
            </div>
            <p className="faint small mt-16">Scores are recalculated live from the data — nothing is stored or editable by hand.</p>
          </div>
        </div>
      )}

      {rows.loading ? (
        <div className="card"><SkeletonList rows={6} /></div>
      ) : board.length === 0 ? (
        <div className="card"><EmptyState icon="trophy" title="No rankings yet" text="Complete tasks and give feedback to populate the leaderboard." /></div>
      ) : (
        <>
          {/* Podium */}
          <div className="grid grid-3 mb-16">
            {board.slice(0, 3).map((r, i) => (
              <div key={r.user} className="card card-body" style={{ display: "flex", gap: 14, alignItems: "center", borderTop: `4px solid ${["#f59e0b", "#94a3b8", "#b45309"][i]}` }}>
                <RankBadge rank={i + 1} />
                <Avatar name={r.userName} hue={r.avatarColor} size={48} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="bold truncate" style={{ fontSize: 15 }}>{r.userName}{r.user === user?._id && <span className="faint"> (you)</span>}</div>
                  <div className="faint small">{r.tasksCompleted}/{r.tasksTotal} tasks · {r.avgRating ? `★ ${r.avgRating}` : "unrated"}</div>
                  <div className="mt-8"><ScoreBreakdown row={r} /></div>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{r.score}</div>
              </div>
            ))}
          </div>

          {myIndex > 2 && (
            <div className="callout info mb-16">
              <Icon name="target" />
              <div>You're ranked <b>#{myIndex + 1}</b> of {board.length} with <b>{board[myIndex].score}</b> points — {board[myIndex - 1].score - board[myIndex].score} behind the next spot.</div>
            </div>
          )}

          <div className="card mb-16">
            <div className="card-header"><h3><Icon name="trending" size={16} /> Breakdown</h3></div>
            <div className="card-body"><ScoreChart rows={board.slice(0, 10)} height={300} /></div>
          </div>

          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Member</th>
                    <th className="hide-mobile">Breakdown</th>
                    <th className="right">Tasks</th>
                    <th className="right hide-mobile">On time</th>
                    <th className="right hide-mobile">Rating</th>
                    <th className="right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {board.map((r, i) => (
                    <tr key={r.user} style={r.user === user?._id ? { background: "var(--primary-soft)" } : undefined}>
                      <td><RankBadge rank={i + 1} /></td>
                      <td>
                        <div className="row">
                          <Avatar name={r.userName} hue={r.avatarColor} size={32} />
                          <div style={{ minWidth: 0 }}>
                            <div className="bold truncate">{r.userName}</div>
                            <div className="faint tiny">{project === "all" ? `${r.projects} project${r.projects === 1 ? "" : "s"}` : `${r.completionRate}% complete`}</div>
                          </div>
                        </div>
                      </td>
                      <td className="hide-mobile" style={{ minWidth: 180 }}>
                        <ScoreBreakdown row={r} />
                        <div className="faint tiny mt-8">T {r.taskPoints} · D {r.timeliness > 0 ? "+" : ""}{r.timeliness} · F {r.feedback} · A {r.activity}</div>
                      </td>
                      <td className="right">{r.tasksCompleted}<span className="faint">/{r.tasksTotal}</span></td>
                      <td className="right hide-mobile">
                        {r.onTime + r.late > 0 ? <Badge tone={r.late ? "warning" : "success"}>{r.onTime}/{r.onTime + r.late}</Badge> : <span className="faint">—</span>}
                        {r.overdue > 0 && <Badge tone="danger" style={{ marginLeft: 4 }}>{r.overdue} overdue</Badge>}
                      </td>
                      <td className="right hide-mobile">{r.avgRating ? <span className="row" style={{ justifyContent: "flex-end", gap: 6 }}><StarRating value={Math.round(r.avgRating)} readonly size="sm" /> {r.avgRating}</span> : <span className="faint">—</span>}</td>
                      <td className="right bold" style={{ fontSize: 16 }}>{r.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {project !== "all" && (
            <p className="faint small mt-16">
              Viewing <Link to={`/projects/${project}`}>{projects.find((p) => p.id === project)?.name}</Link> only.
            </p>
          )}
        </>
      )}
    </>
  );
}

function Rule({ color, title, text }) {
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="row" style={{ gap: 8 }}><i style={{ width: 12, height: 12, borderRadius: 3, background: color, display: "inline-block" }} /><b>{title}</b></div>
      <p className="muted small">{text}</p>
    </div>
  );
}
