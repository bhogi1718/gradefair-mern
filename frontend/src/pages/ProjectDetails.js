import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import API, { errMsg } from "../services/api";
import { useAuth } from "../context/AuthContext";
import useApi from "../hooks/useApi";
import TaskItem from "../components/TaskItem";
import TaskBoard from "../components/TaskBoard";
import TaskFormModal from "../components/TaskFormModal";
import ProjectFormModal from "../components/ProjectFormModal";
import ScoreChart from "../components/ScoreChart";
import ActivityFeed from "../components/ActivityFeed";
import {
  Avatar, Badge, Callout, ConfirmDialog, Dropdown, EmptyState, Icon, Modal, ProgressBar, RankBadge, ScoreBreakdown, Segmented, SkeletonList, StarRating, StatCard, Tabs
} from "../components/ui";
import { deadlineInfo, formatDate, relativeTime } from "../utils/format";
import { PROJECT_STATUS, STATUS_ORDER, TASK_STATUS } from "../utils/constants";

export default function ProjectDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, isAdmin } = useAuth();

  const project = useApi(`/projects/${id}`);
  const tasks = useApi(`/projects/${id}/tasks`, { initial: [] });
  const summary = useApi(`/projects/${id}/summary`, { initial: { scores: [], activity: [], feedback: [] } });

  const [tab, setTab] = useState("overview");
  const [view, setView] = useState(() => localStorage.getItem("taskView") || "list");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterUser, setFilterUser] = useState("all");

  const [taskModal, setTaskModal] = useState({ open: false, task: null });
  const [deleteTask, setDeleteTask] = useState(null);
  const [editProject, setEditProject] = useState(false);
  const [deleteProject, setDeleteProject] = useState(false);
  const [addMember, setAddMember] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => localStorage.setItem("taskView", view), [view]);

  const p = project.data;
  const canManage = !!p && (isAdmin || p.manager?._id === user?._id);
  const isMember = !!p && (p.members || []).some((m) => m._id === user?._id);

  const refreshAll = useCallback(() => { project.reload(); tasks.reload(); summary.reload(); }, [project, tasks, summary]);

  const onTaskChange = (updated) => {
    tasks.setData((list) => list.map((t) => (t._id === updated._id ? updated : t)));
    project.reload();
    summary.reload();
  };

  const filteredTasks = useMemo(() => {
    let list = tasks.data || [];
    if (filterStatus !== "all") list = list.filter((t) => t.status === filterStatus);
    if (filterUser !== "all") list = list.filter((t) => (t.assignedTo?._id || t.assignedTo) === filterUser);
    return list;
  }, [tasks.data, filterStatus, filterUser]);

  const confirmDeleteTask = async () => {
    setBusy(true);
    try {
      await API.delete(`/tasks/${deleteTask._id}`);
      toast.success("Task deleted");
      setDeleteTask(null);
      refreshAll();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteProject = async () => {
    setBusy(true);
    try {
      await API.delete(`/projects/${id}`);
      toast.success("Project deleted");
      nav("/projects", { replace: true });
    } catch (err) {
      toast.error(errMsg(err));
      setBusy(false);
    }
  };

  const setProjectStatus = async (status) => {
    try {
      const res = await API.put(`/projects/${id}`, { status });
      project.setData(res.data);
      toast.success(`Project marked ${status}`);
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const removeMember = async (m) => {
    try {
      await API.delete(`/projects/${id}/members/${m._id}`);
      toast.success(`${m.name} removed`);
      refreshAll();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  if (project.error) {
    return (
      <div className="card">
        <EmptyState icon="alert" title="Project not available" text={project.error} action={<Link to="/projects" className="btn btn-secondary"><Icon name="arrowLeft" /> Back to projects</Link>} />
      </div>
    );
  }

  if (project.loading || !p) return <SkeletonList rows={6} />;

  const dl = deadlineInfo(p.deadline, p.status !== "active");
  const myRow = summary.data?.scores?.find((r) => r.user === user?._id);

  const tabs = [
    { id: "overview", label: "Overview", icon: "dashboard" },
    { id: "tasks", label: "Tasks", icon: "tasks", count: tasks.data?.length },
    { id: "team", label: "Team", icon: "users", count: p.members?.length },
    { id: "feedback", label: "Feedback", icon: "star", count: summary.data?.feedback?.length },
    { id: "activity", label: "Activity", icon: "activity" }
  ];

  return (
    <>
      <Link to="/projects" className="row small muted mb-16" style={{ gap: 6 }}><Icon name="arrowLeft" size={14} /> Back to projects</Link>

      {/* Header */}
      <div className="card mb-16" style={{ borderTop: `4px solid ${p.color}` }}>
        <div className="card-body">
          <div className="row between wrap" style={{ alignItems: "flex-start" }}>
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="row wrap" style={{ gap: 10 }}>
                <h1 style={{ fontSize: 24 }}>{p.name}</h1>
                <Badge tone={PROJECT_STATUS[p.status]?.tone} dot>{p.status}</Badge>
                {p.stats.overdue > 0 && <Badge tone="danger" icon="alert">{p.stats.overdue} overdue</Badge>}
              </div>
              {p.description && <p className="muted mt-8" style={{ maxWidth: 760, whiteSpace: "pre-wrap" }}>{p.description}</p>}
              <div className="row wrap mt-16" style={{ gap: 8 }}>
                <span className="chip"><Avatar name={p.manager?.name} hue={p.manager?.avatarColor} size={16} /> {p.manager?.name}</span>
                <span className={`chip ${dl.tone === "danger" ? "text-danger" : ""}`}><Icon name="calendar" /> {p.deadline ? dl.label : "No deadline"}</span>
                <span className="chip"><Icon name="users" /> {p.members?.length || 0} members</span>
                <span className="chip"><Icon name="clock" /> Created {formatDate(p.createdAt)}</span>
              </div>
            </div>

            {canManage && (
              <div className="row">
                <button className="btn btn-primary" onClick={() => setTaskModal({ open: true, task: null })} disabled={p.status === "archived"}>
                  <Icon name="plus" /> New task
                </button>
                <Dropdown trigger={<button className="btn-icon bordered" aria-label="Project actions"><Icon name="more" /></button>}>
                  <button onClick={() => setEditProject(true)}><Icon name="edit" /> Edit project</button>
                  <button onClick={() => setAddMember(true)}><Icon name="userPlus" /> Add member</button>
                  <hr />
                  {p.status !== "active" && <button onClick={() => setProjectStatus("active")}><Icon name="play" /> Mark active</button>}
                  {p.status !== "completed" && <button onClick={() => setProjectStatus("completed")}><Icon name="checkCircle" /> Mark completed</button>}
                  {p.status !== "archived" && <button onClick={() => setProjectStatus("archived")}><Icon name="inbox" /> Archive</button>}
                  <hr />
                  <button className="danger" onClick={() => setDeleteProject(true)}><Icon name="trash" /> Delete project</button>
                </Dropdown>
              </div>
            )}
          </div>

          <div className="mt-16">
            <ProgressBar value={p.stats.progress} label={`${p.stats.done} of ${p.stats.total} tasks completed`} size="thick" />
          </div>
        </div>
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {/* ------------------------------------------------------------ Overview */}
      {tab === "overview" && (
        <>
          <div className="grid grid-stats">
            <StatCard label="To do" value={p.stats.todo} icon="circle" tone="info" />
            <StatCard label="In progress" value={p.stats.inProgress} icon="play" tone="warning" />
            <StatCard label="Done" value={p.stats.done} icon="checkCircle" tone="success" />
            <StatCard label="Overdue" value={p.stats.overdue} icon="alert" tone={p.stats.overdue ? "danger" : "success"} />
          </div>

          {myRow && (
            <div className="card mt-24">
              <div className="card-header"><h3><Icon name="zap" size={16} /> Your contribution here</h3></div>
              <div className="card-body">
                <div className="row wrap" style={{ gap: 24 }}>
                  <div><div className="stat-label">Score</div><div className="stat-value">{myRow.score}</div></div>
                  <div><div className="stat-label">Tasks</div><div className="stat-value">{myRow.tasksCompleted}/{myRow.tasksTotal}</div></div>
                  <div><div className="stat-label">Share of project</div><div className="stat-value">{myRow.share}%</div></div>
                  <div><div className="stat-label">Peer rating</div><div className="stat-value">{myRow.avgRating ? `★ ${myRow.avgRating}` : "—"}</div></div>
                </div>
                <div className="mt-16"><ScoreBreakdown row={myRow} showLegend /></div>
              </div>
            </div>
          )}

          <div className="grid grid-3 mt-24">
            <div className="card span-2">
              <div className="card-header"><h3><Icon name="trending" size={16} /> Contribution breakdown</h3></div>
              <div className="card-body">{summary.loading ? <SkeletonList rows={3} /> : <ScoreChart rows={summary.data.scores} />}</div>
            </div>

            <div className="card">
              <div className="card-header"><h3><Icon name="trophy" size={16} /> Project leaderboard</h3></div>
              {summary.loading ? (
                <SkeletonList rows={4} />
              ) : summary.data.scores.length === 0 ? (
                <EmptyState icon="trophy" title="No scores yet" />
              ) : (
                <div className="list">
                  {summary.data.scores.map((r, i) => (
                    <div key={r.user} className="list-item">
                      <RankBadge rank={i + 1} />
                      <Avatar name={r.userName} hue={r.avatarColor} size={32} />
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div className="bold truncate">{r.userName}{r.user === user?._id && <span className="faint"> (you)</span>}</div>
                        <div className="faint tiny">{r.share}% of task points · {r.tasksCompleted}/{r.tasksTotal} done</div>
                      </div>
                      <span className="bold">{r.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* --------------------------------------------------------------- Tasks */}
      {tab === "tasks" && (
        <>
          <div className="row between wrap mb-16">
            <div className="row wrap">
              <Segmented
                value={filterStatus}
                onChange={setFilterStatus}
                options={[{ value: "all", label: "All" }, ...STATUS_ORDER.map((s) => ({ value: s, label: TASK_STATUS[s].label }))]}
              />
              <select className="select sm" value={filterUser} onChange={(e) => setFilterUser(e.target.value)} style={{ width: 180 }}>
                <option value="all">Everyone</option>
                {p.members?.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
            </div>
            <Segmented value={view} onChange={setView} options={[{ value: "list", label: "List", icon: "list" }, { value: "board", label: "Board", icon: "columns" }]} />
          </div>

          {tasks.loading ? (
            <div className="card"><SkeletonList rows={5} /></div>
          ) : filteredTasks.length === 0 ? (
            <div className="card">
              <EmptyState
                icon="tasks"
                title={tasks.data.length === 0 ? "No tasks yet" : "No tasks match the filter"}
                text={tasks.data.length === 0 ? (canManage ? "Create the first task for this project." : "Your manager hasn't added tasks yet.") : "Try a different status or member."}
                action={canManage && tasks.data.length === 0 && <button className="btn btn-primary" onClick={() => setTaskModal({ open: true, task: null })}><Icon name="plus" /> New task</button>}
              />
            </div>
          ) : view === "board" ? (
            <TaskBoard
              tasks={filteredTasks}
              userId={user?._id}
              canMove={(t) => canManage || (t.assignedTo?._id || t.assignedTo) === user?._id}
              onChange={onTaskChange}
              onEdit={canManage ? (t) => setTaskModal({ open: true, task: t }) : undefined}
            />
          ) : (
            <div className="card">
              <div className="list">
                {filteredTasks.map((t) => (
                  <TaskItem
                    key={t._id}
                    task={t}
                    canManage={canManage}
                    isAssignee={(t.assignedTo?._id || t.assignedTo) === user?._id}
                    onChange={onTaskChange}
                    onEdit={(task) => setTaskModal({ open: true, task })}
                    onDelete={setDeleteTask}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ---------------------------------------------------------------- Team */}
      {tab === "team" && (
        <div className="card">
          <div className="card-header">
            <h3><Icon name="users" size={16} /> Team members</h3>
            {canManage && <button className="btn btn-sm btn-primary" onClick={() => setAddMember(true)}><Icon name="userPlus" /> Add member</button>}
          </div>
          {(p.members || []).length === 0 ? (
            <EmptyState icon="users" title="No members yet" text="Add members or assign a task to bring people in." />
          ) : (
            <div className="list">
              {p.members.map((m) => {
                const mine = (tasks.data || []).filter((t) => (t.assignedTo?._id || t.assignedTo) === m._id);
                const done = mine.filter((t) => t.status === "done").length;
                const row = summary.data?.scores?.find((r) => r.user === m._id);
                return (
                  <div key={m._id} className="list-item">
                    <Avatar name={m.name} hue={m.avatarColor} size={40} />
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="bold">{m.name}{m._id === user?._id && <span className="faint"> (you)</span>}</div>
                      <div className="faint small">{m.email}</div>
                      <div className="mt-8" style={{ maxWidth: 320 }}>
                        <ProgressBar value={mine.length ? Math.round((done / mine.length) * 100) : 0} size="thin" label={`${done}/${mine.length} tasks`} />
                      </div>
                    </div>
                    <div className="hide-mobile center" style={{ minWidth: 70 }}>
                      <div className="stat-label">Score</div>
                      <div className="bold" style={{ fontSize: 18 }}>{row?.score ?? 0}</div>
                    </div>
                    <div className="hide-mobile center" style={{ minWidth: 70 }}>
                      <div className="stat-label">Rating</div>
                      <div className="bold" style={{ fontSize: 18 }}>{row?.avgRating ? `★ ${row.avgRating}` : "—"}</div>
                    </div>
                    {canManage && (
                      <button className="btn-icon danger" title="Remove from project" onClick={() => removeMember(m)}>
                        <Icon name="userMinus" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------ Feedback */}
      {tab === "feedback" && (
        <FeedbackTab project={p} isMember={isMember} canManage={canManage} feedback={summary.data?.feedback || []} loading={summary.loading} onChange={summary.reload} userId={user?._id} />
      )}

      {/* ------------------------------------------------------------ Activity */}
      {tab === "activity" && (
        <div className="card">
          <div className="card-body">
            {summary.loading ? <SkeletonList rows={5} /> : <ActivityFeed logs={summary.data.activity} showProject={false} />}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- Modals */}
      <TaskFormModal
        open={taskModal.open}
        task={taskModal.task}
        projectId={id}
        members={p.members || []}
        onClose={() => setTaskModal({ open: false, task: null })}
        onSaved={refreshAll}
      />
      <ProjectFormModal open={editProject} project={p} onClose={() => setEditProject(false)} onSaved={refreshAll} />
      <AddMemberModal open={addMember} project={p} onClose={() => setAddMember(false)} onSaved={refreshAll} />
      <ConfirmDialog
        open={!!deleteTask}
        onClose={() => setDeleteTask(null)}
        onConfirm={confirmDeleteTask}
        loading={busy}
        title="Delete this task?"
        text={`"${deleteTask?.title}" will be removed permanently, including any points it earned.`}
      />
      <ConfirmDialog
        open={deleteProject}
        onClose={() => setDeleteProject(false)}
        onConfirm={confirmDeleteProject}
        loading={busy}
        title="Delete this project?"
        text="All tasks, feedback and activity in this project will be deleted. This cannot be undone."
        confirmText="Delete project"
      />
    </>
  );
}

/* ------------------------------------------------------------------------ */

function FeedbackTab({ project, isMember, canManage, feedback, loading, onChange, userId }) {
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(null);

  const teammates = (project.members || []).filter((m) => m._id !== userId);
  const mine = Object.fromEntries(feedback.filter((f) => f.from?._id === userId).map((f) => [f.to?._id, f]));

  const submit = async (to) => {
    const d = drafts[to] || {};
    const existing = mine[to];
    const rating = d.rating ?? existing?.rating;
    if (!rating) return toast.error("Pick a star rating first");
    setSaving(to);
    try {
      await API.post("/feedback", { to, project: project._id, rating, comment: d.comment ?? existing?.comment ?? "" });
      toast.success("Feedback saved");
      setDrafts((x) => ({ ...x, [to]: {} }));
      onChange();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="card"><SkeletonList rows={4} /></div>;

  if (isMember && !canManage) {
    if (project.status === "archived") return <Callout tone="info">This project is archived, so feedback is closed.</Callout>;
    return (
      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <div>
              <h3><Icon name="star" size={16} /> Rate your teammates</h3>
              <p>Your ratings are only visible to the manager. You can update them any time.</p>
            </div>
          </div>
          {teammates.length === 0 ? (
            <EmptyState icon="users" title="No teammates yet" text="Once others join this project you can rate them here." />
          ) : (
            <div className="list">
              {teammates.map((m) => {
                const ex = mine[m._id];
                const d = drafts[m._id] || {};
                return (
                  <div key={m._id} className="list-item" style={{ alignItems: "flex-start" }}>
                    <Avatar name={m.name} hue={m.avatarColor} size={36} />
                    <div className="grow stack" style={{ gap: 8, minWidth: 0 }}>
                      <div className="row between wrap">
                        <span className="bold">{m.name}</span>
                        <StarRating value={d.rating ?? ex?.rating ?? 0} onChange={(r) => setDrafts((x) => ({ ...x, [m._id]: { ...x[m._id], rating: r } }))} />
                      </div>
                      <textarea className="textarea" rows={2} style={{ minHeight: 56 }} placeholder="Optional comment — what did they do well?" value={d.comment ?? ex?.comment ?? ""} onChange={(e) => setDrafts((x) => ({ ...x, [m._id]: { ...x[m._id], comment: e.target.value } }))} />
                      <div className="row between">
                        <span className="faint tiny">{ex ? `Last saved ${relativeTime(ex.updatedAt)}` : "Not rated yet"}</span>
                        <button className="btn btn-sm btn-primary" onClick={() => submit(m._id)} disabled={saving === m._id}>
                          {saving === m._id ? "Saving…" : ex ? "Update" : "Submit"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><h3><Icon name="info" size={16} /> Why peer feedback?</h3></div>
          <div className="card-body stack small muted">
            <p>Not everything valuable is a task: helping a teammate debug, coordinating meetings, reviewing work. Peer ratings capture that.</p>
            <p>Each teammate's <b>average rating × 4</b> is added to their score (max 20 points per project).</p>
            <p>Be honest and specific — comments help managers understand the number.</p>
          </div>
        </div>
      </div>
    );
  }

  // Manager / admin view
  const byUser = {};
  for (const f of feedback) {
    const k = f.to?._id;
    if (!k) continue;
    (byUser[k] ||= { user: f.to, items: [] }).items.push(f);
  }
  const groups = Object.values(byUser).map((g) => ({ ...g, avg: Math.round((g.items.reduce((s, f) => s + f.rating, 0) / g.items.length) * 10) / 10 })).sort((a, b) => b.avg - a.avg);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3><Icon name="star" size={16} /> Peer feedback</h3>
          <p>{feedback.length} rating{feedback.length === 1 ? "" : "s"} submitted by members</p>
        </div>
      </div>
      {groups.length === 0 ? (
        <EmptyState icon="star" title="No feedback yet" text="Members can rate each other from this tab." />
      ) : (
        <div className="list">
          {groups.map((g) => (
            <div key={g.user._id} className="list-item" style={{ alignItems: "flex-start" }}>
              <Avatar name={g.user.name} hue={g.user.avatarColor} size={38} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row between wrap">
                  <span className="bold">{g.user.name}</span>
                  <span className="row" style={{ gap: 6 }}><StarRating value={Math.round(g.avg)} readonly size="sm" /> <b>{g.avg}</b> <span className="faint small">({g.items.length})</span></span>
                </div>
                <div className="stack mt-8" style={{ gap: 6 }}>
                  {g.items.map((f) => (
                    <div key={f._id} className="row small" style={{ gap: 8, alignItems: "flex-start" }}>
                      <Avatar name={f.from?.name} hue={f.from?.avatarColor} size={20} />
                      <span className="muted"><b style={{ color: "var(--text)" }}>{f.from?.name}</b> · {f.rating}/5{f.comment && <> — "{f.comment}"</>}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddMemberModal({ open, project, onClose, onSaved }) {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    API.get("/users").then((r) => setUsers(r.data.filter((u) => u.role === "member"))).catch(() => {});
  }, [open]);

  const current = new Set((project.members || []).map((m) => m._id));
  const list = users.filter((u) => !current.has(u._id) && (u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase())));

  const add = async (u) => {
    setBusy(u._id);
    try {
      await API.post(`/projects/${project._id}/members`, { userId: u._id });
      toast.success(`${u.name} added`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add a team member">
      <input className="input" placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div className="list mt-16" style={{ maxHeight: 320, overflowY: "auto" }}>
        {list.length === 0 && <p className="faint small center" style={{ padding: 16 }}>{users.length === 0 ? "Loading…" : "No members available"}</p>}
        {list.map((u) => (
          <div key={u._id} className="list-item" style={{ padding: "10px 4px" }}>
            <Avatar name={u.name} hue={u.avatarColor} size={32} />
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="bold truncate">{u.name}</div>
              <div className="faint tiny truncate">{u.email}</div>
            </div>
            <button className="btn btn-sm btn-secondary" onClick={() => add(u)} disabled={busy === u._id}><Icon name="plus" /> Add</button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
