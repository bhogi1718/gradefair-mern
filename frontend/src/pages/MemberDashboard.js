import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useApi from "../hooks/useApi";
import TaskItem from "../components/TaskItem";
import ActivityFeed from "../components/ActivityFeed";
import { Avatar, Badge, EmptyState, Icon, PageHeader, Ring, ScoreBreakdown, SkeletonCards, SkeletonList, StarRating, StatCard } from "../components/ui";
import { relativeTime } from "../utils/format";

export default function MemberDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();

  const tasks = useApi("/tasks", { initial: [] });
  const score = useApi("/score/me", { initial: null });
  const feedback = useApi("/feedback/me/received", { initial: [] });
  const activity = useApi("/activity/me?limit=6", { initial: { logs: [] } });
  const board = useApi("/score/project", { initial: [] });

  const stats = useMemo(() => {
    const t = tasks.data || [];
    const now = Date.now();
    const done = t.filter((x) => x.status === "done").length;
    return {
      total: t.length,
      done,
      inProgress: t.filter((x) => x.status === "in-progress").length,
      overdue: t.filter((x) => x.status !== "done" && x.deadline && new Date(x.deadline) < now).length,
      completion: t.length ? Math.round((done / t.length) * 100) : 0
    };
  }, [tasks.data]);

  // My rank inside each project I belong to
  const ranks = useMemo(() => {
    const byProject = {};
    for (const r of board.data || []) {
      (byProject[r.project] ||= []).push(r);
    }
    return Object.values(byProject)
      .map((rows) => {
        rows.sort((a, b) => b.score - a.score);
        const idx = rows.findIndex((r) => r.user === user?._id);
        return idx === -1 ? null : { project: rows[idx].projectName, color: rows[idx].projectColor, rank: idx + 1, of: rows.length, score: rows[idx].score, id: rows[idx].project };
      })
      .filter(Boolean);
  }, [board.data, user?._id]);

  const openTasks = (tasks.data || [])
    .filter((t) => t.status !== "done")
    .sort((a, b) => (a.deadline ? new Date(a.deadline) : Infinity) - (b.deadline ? new Date(b.deadline) : Infinity))
    .slice(0, 6);

  const overall = score.data?.overall;

  return (
    <>
      <PageHeader title={`Hi, ${user?.name?.split(" ")[0]}`} subtitle="Here's your contribution at a glance." actions={<Link to="/tasks" className="btn btn-primary"><Icon name="tasks" /> My tasks</Link>} />

      {tasks.loading ? (
        <SkeletonCards count={4} />
      ) : (
        <div className="grid grid-stats">
          <StatCard label="Total score" value={overall?.score ?? 0} icon="zap" tone="primary" hint={overall ? `${overall.projects} project${overall.projects === 1 ? "" : "s"}` : "no scores yet"} />
          <StatCard label="Tasks completed" value={`${stats.done}/${stats.total}`} icon="checkCircle" tone="success" hint={`${stats.completion}% done`} />
          <StatCard label="In progress" value={stats.inProgress} icon="play" tone="warning" />
          <StatCard label="Overdue" value={stats.overdue} icon="alert" tone={stats.overdue ? "danger" : "success"} hint={stats.overdue ? "catch up soon" : "all on track"} />
          <StatCard label="Peer rating" value={overall?.avgRating ? `★ ${overall.avgRating}` : "—"} icon="star" tone="warning" hint={overall?.ratingCount ? `${overall.ratingCount} rating${overall.ratingCount === 1 ? "" : "s"}` : "no ratings yet"} />
        </div>
      )}

      <div className="grid grid-3 mt-24">
        {/* Score breakdown */}
        <div className="card span-2">
          <div className="card-header">
            <div>
              <h3><Icon name="scale" size={16} /> How your score is built</h3>
              <p>Transparent breakdown of every point</p>
            </div>
            <Link to="/leaderboard" className="btn btn-sm btn-ghost">Leaderboard <Icon name="arrowRight" /></Link>
          </div>
          <div className="card-body">
            {score.loading ? (
              <SkeletonList rows={2} />
            ) : !overall ? (
              <EmptyState icon="zap" title="No score yet" text="Complete tasks and collect peer feedback to start earning points." />
            ) : (
              <>
                <div className="row" style={{ gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                  <Ring value={overall.completionRate} size={84} stroke={8} color="var(--success)">
                    {overall.completionRate}%
                  </Ring>
                  <div className="grow">
                    <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em" }}>{overall.score} <span className="muted" style={{ fontSize: 14, fontWeight: 500 }}>points</span></div>
                    <div className="muted small">{overall.onTime} on time · {overall.late} late · {overall.overdue} overdue</div>
                  </div>
                </div>
                <div className="mt-16"><ScoreBreakdown row={overall} showLegend /></div>

                {score.data.perProject.length > 0 && (
                  <div className="mt-24 stack">
                    {score.data.perProject.map((r) => (
                      <div key={r.project} className="row" style={{ gap: 12 }}>
                        <span className="project-dot" style={{ background: r.projectColor }} />
                        <Link to={`/projects/${r.project}`} className="grow truncate" style={{ color: "inherit", fontWeight: 600 }}>{r.projectName}</Link>
                        <span className="faint small hide-mobile">{r.tasksCompleted}/{r.tasksTotal} tasks</span>
                        <span className="faint small hide-mobile">{r.share}% of project</span>
                        <span className="bold">{r.score} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Rankings */}
        <div className="card">
          <div className="card-header"><h3><Icon name="trophy" size={16} /> Your rankings</h3></div>
          {board.loading ? (
            <SkeletonList rows={3} />
          ) : ranks.length === 0 ? (
            <EmptyState icon="trophy" title="Not ranked yet" text="You'll appear once you have tasks in a project." />
          ) : (
            <div className="list">
              {ranks.map((r) => (
                <div key={r.id} className="list-item hover" onClick={() => nav(`/projects/${r.id}`)}>
                  <span className={`rank r${r.rank <= 3 ? r.rank : ""}`}>{r.rank}</span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="bold truncate">{r.project}</div>
                    <div className="faint tiny">of {r.of} members</div>
                  </div>
                  <span className="bold">{r.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Open tasks */}
        <div className="card span-2">
          <div className="card-header">
            <h3><Icon name="tasks" size={16} /> Up next</h3>
            <Link to="/tasks" className="btn btn-sm btn-ghost">All tasks <Icon name="arrowRight" /></Link>
          </div>
          {tasks.loading ? (
            <SkeletonList rows={3} />
          ) : openTasks.length === 0 ? (
            <EmptyState icon="checkCircle" title="All caught up!" text="You have no open tasks right now." />
          ) : (
            <div className="list">
              {openTasks.map((t) => (
                <TaskItem key={t._id} task={t} isAssignee showProject showAssignee={false} onChange={() => { tasks.reload(); score.reload(); board.reload(); }} />
              ))}
            </div>
          )}
        </div>

        {/* Feedback received */}
        <div className="card">
          <div className="card-header">
            <h3><Icon name="star" size={16} /> Recent feedback</h3>
            <Link to="/feedback" className="btn btn-sm btn-ghost">More <Icon name="arrowRight" /></Link>
          </div>
          {feedback.loading ? (
            <SkeletonList rows={3} />
          ) : (feedback.data || []).length === 0 ? (
            <EmptyState icon="star" title="No feedback yet" text="Teammates' ratings will show up here." />
          ) : (
            <div className="list">
              {feedback.data.slice(0, 4).map((f) => (
                <div key={f._id} className="list-item" style={{ alignItems: "flex-start" }}>
                  <Avatar name={f.from?.name} hue={f.from?.avatarColor} size={30} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row between">
                      <span className="bold small truncate">{f.from?.name}</span>
                      <StarRating value={f.rating} readonly size="sm" />
                    </div>
                    {f.comment && <p className="muted small mt-8">"{f.comment}"</p>}
                    <div className="faint tiny mt-8"><Badge tone="neutral" style={{ padding: "1px 7px" }}>{f.project?.name}</Badge> {relativeTime(f.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card span-2">
          <div className="card-header">
            <h3><Icon name="activity" size={16} /> Your recent activity</h3>
            <Link to="/activity" className="btn btn-sm btn-ghost">View all <Icon name="arrowRight" /></Link>
          </div>
          <div className="card-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
            {activity.loading ? <SkeletonList rows={3} /> : <ActivityFeed logs={activity.data?.logs || []} compact />}
          </div>
        </div>
      </div>
    </>
  );
}
