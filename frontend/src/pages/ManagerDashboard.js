import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useApi from "../hooks/useApi";
import ScoreChart from "../components/ScoreChart";
import ProjectFormModal from "../components/ProjectFormModal";
import TaskFormModal from "../components/TaskFormModal";
import ActivityFeed from "../components/ActivityFeed";
import { Avatar, Badge, EmptyState, Icon, PageHeader, ProgressBar, RankBadge, SkeletonCards, SkeletonList, StatCard } from "../components/ui";
import { deadlineInfo, plural } from "../utils/format";

export default function ManagerDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [showProject, setShowProject] = useState(false);
  const [showTask, setShowTask] = useState(false);

  const projects = useApi("/projects", { initial: [] });
  const tasks = useApi("/tasks", { initial: [] });
  const scores = useApi("/score/overall", { initial: [] });
  const activity = useApi("/activity?limit=8", { initial: { logs: [] } });

  const loading = projects.loading || tasks.loading || scores.loading;

  const stats = useMemo(() => {
    const t = tasks.data || [];
    const now = Date.now();
    const done = t.filter((x) => x.status === "done").length;
    const overdue = t.filter((x) => x.status !== "done" && x.deadline && new Date(x.deadline) < now).length;
    const members = new Set((projects.data || []).flatMap((p) => p.members?.map((m) => m._id) || []));
    return {
      projects: (projects.data || []).filter((p) => p.status === "active").length,
      tasks: t.length,
      done,
      completion: t.length ? Math.round((done / t.length) * 100) : 0,
      overdue,
      members: members.size
    };
  }, [tasks.data, projects.data]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return (tasks.data || [])
      .filter((t) => t.status !== "done" && t.deadline)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .filter((t) => new Date(t.deadline).getTime() - now < 7 * 24 * 3600 * 1000)
      .slice(0, 6);
  }, [tasks.data]);

  const reloadAll = () => { projects.reload(); tasks.reload(); scores.reload(); activity.reload(); };

  return (
    <>
      <PageHeader
        title={`Good ${greeting()}, ${user?.name?.split(" ")[0]}`}
        subtitle="Here's how your projects and team are doing."
        actions={
          <>
            <button className="btn btn-secondary" onClick={() => setShowTask(true)} disabled={!projects.data?.length}>
              <Icon name="plus" /> New task
            </button>
            <button className="btn btn-primary" onClick={() => setShowProject(true)}>
              <Icon name="plus" /> New project
            </button>
          </>
        }
      />

      {loading ? (
        <SkeletonCards count={5} />
      ) : (
        <div className="grid grid-stats">
          <StatCard label="Active projects" value={stats.projects} icon="folder" tone="primary" hint={`${projects.data.length} total`} />
          <StatCard label="Team members" value={stats.members} icon="users" tone="info" />
          <StatCard label="Tasks" value={stats.tasks} icon="tasks" tone="primary" hint={`${stats.done} completed`} />
          <StatCard label="Completion" value={`${stats.completion}%`} icon="target" tone="success" />
          <StatCard label="Overdue" value={stats.overdue} icon="alert" tone={stats.overdue ? "danger" : "success"} hint={stats.overdue ? "needs attention" : "all on track"} />
        </div>
      )}

      <div className="grid grid-3 mt-24">
        {/* Score chart */}
        <div className="card span-2">
          <div className="card-header">
            <div>
              <h3><Icon name="trending" size={16} /> Contribution breakdown</h3>
              <p>Top contributors across your projects</p>
            </div>
            <Link to="/leaderboard" className="btn btn-sm btn-ghost">Full leaderboard <Icon name="arrowRight" /></Link>
          </div>
          <div className="card-body">
            {scores.loading ? <SkeletonList rows={3} /> : <ScoreChart rows={(scores.data || []).slice(0, 8)} />}
          </div>
        </div>

        {/* Top performers */}
        <div className="card">
          <div className="card-header">
            <h3><Icon name="trophy" size={16} /> Top performers</h3>
          </div>
          {scores.loading ? (
            <SkeletonList rows={5} />
          ) : (scores.data || []).length === 0 ? (
            <EmptyState icon="trophy" title="No scores yet" text="Assign and complete tasks to see rankings." />
          ) : (
            <div className="list">
              {scores.data.slice(0, 5).map((r, i) => (
                <div key={r.user} className="list-item">
                  <RankBadge rank={i + 1} />
                  <Avatar name={r.userName} hue={r.avatarColor} size={34} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="bold truncate">{r.userName}</div>
                    <div className="faint tiny">{r.tasksCompleted}/{r.tasksTotal} tasks · {r.avgRating ? `★ ${r.avgRating}` : "no ratings"}</div>
                  </div>
                  <div className="bold" style={{ fontSize: 16 }}>{r.score}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project progress */}
        <div className="card span-2">
          <div className="card-header">
            <h3><Icon name="folder" size={16} /> Project progress</h3>
            <Link to="/projects" className="btn btn-sm btn-ghost">All projects <Icon name="arrowRight" /></Link>
          </div>
          {projects.loading ? (
            <SkeletonList rows={3} />
          ) : projects.data.length === 0 ? (
            <EmptyState icon="folder" title="No projects yet" text="Create your first project to start assigning work." action={<button className="btn btn-primary" onClick={() => setShowProject(true)}><Icon name="plus" /> New project</button>} />
          ) : (
            <div className="list">
              {projects.data.slice(0, 6).map((p) => (
                <div key={p._id} className="list-item hover" onClick={() => nav(`/projects/${p._id}`)}>
                  <span className="project-dot" style={{ background: p.color, width: 12, height: 12 }} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row between">
                      <span className="bold truncate">{p.name}</span>
                      <span className="small muted">{p.stats.done}/{p.stats.total} tasks</span>
                    </div>
                    <div className="mt-8"><ProgressBar value={p.stats.progress} size="thin" /></div>
                  </div>
                  {p.stats.overdue > 0 && <Badge tone="danger" icon="alert">{p.stats.overdue} overdue</Badge>}
                  <Badge tone={p.status === "active" ? "success" : p.status === "completed" ? "primary" : "neutral"}>{p.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming deadlines */}
        <div className="card">
          <div className="card-header">
            <h3><Icon name="clock" size={16} /> Due this week</h3>
          </div>
          {tasks.loading ? (
            <SkeletonList rows={3} />
          ) : upcoming.length === 0 ? (
            <EmptyState icon="checkCircle" title="Nothing due soon" text="No open tasks are due in the next 7 days." />
          ) : (
            <div className="list">
              {upcoming.map((t) => {
                const dl = deadlineInfo(t.deadline);
                return (
                  <div key={t._id} className="list-item hover" onClick={() => nav(`/projects/${t.project?._id}`)}>
                    <Avatar name={t.assignedTo?.name} hue={t.assignedTo?.avatarColor} size={30} />
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="truncate bold small">{t.title}</div>
                      <div className="faint tiny truncate">{t.assignedTo?.name} · {t.project?.name}</div>
                    </div>
                    <Badge tone={dl.tone}>{dl.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity */}
        <div className="card span-2">
          <div className="card-header">
            <h3><Icon name="activity" size={16} /> Recent activity</h3>
            <Link to="/activity" className="btn btn-sm btn-ghost">View all <Icon name="arrowRight" /></Link>
          </div>
          <div className="card-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
            {activity.loading ? <SkeletonList rows={4} /> : <ActivityFeed logs={activity.data?.logs || []} compact />}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3><Icon name="sparkles" size={16} /> Quick tips</h3></div>
          <div className="card-body stack small muted">
            <p>• Set <b>deadlines</b> on tasks — on-time completion earns members a bonus.</p>
            <p>• Use task <b>size</b> honestly: large tasks are worth 3× a small one.</p>
            <p>• Encourage <b>peer feedback</b>; it captures effort that isn't a task.</p>
            <p>• Mark projects <b>completed</b> when they wrap up to freeze the leaderboard.</p>
            <p className="mt-8">{plural(stats.tasks - stats.done, "open task")} across {plural(projects.data?.length || 0, "project")}.</p>
          </div>
        </div>
      </div>

      <ProjectFormModal open={showProject} onClose={() => setShowProject(false)} onSaved={reloadAll} />
      <TaskFormModal open={showTask} onClose={() => setShowTask(false)} onSaved={reloadAll} projects={projects.data || []} />
    </>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
}
