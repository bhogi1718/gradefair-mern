import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import API, { errMsg } from "../services/api";
import { useAuth } from "../context/AuthContext";
import useApi from "../hooks/useApi";
import TaskItem from "../components/TaskItem";
import TaskBoard from "../components/TaskBoard";
import TaskFormModal from "../components/TaskFormModal";
import { ConfirmDialog, EmptyState, Icon, PageHeader, Segmented, SkeletonList, StatCard } from "../components/ui";
import { STATUS_ORDER, TASK_STATUS } from "../utils/constants";

const SORTS = {
  deadline: { label: "Deadline", fn: (a, b) => (a.deadline ? new Date(a.deadline) : Infinity) - (b.deadline ? new Date(b.deadline) : Infinity) },
  priority: { label: "Priority", fn: (a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]) },
  weight: { label: "Points", fn: (a, b) => b.weight - a.weight },
  newest: { label: "Newest", fn: (a, b) => new Date(b.createdAt) - new Date(a.createdAt) }
};

export default function Tasks() {
  const { user, isManager } = useAuth();
  const tasks = useApi("/tasks", { initial: [] });
  const projects = useApi(isManager ? "/projects" : null, { initial: [] });

  const [view, setView] = useState(() => localStorage.getItem("taskView") || "list");
  const [status, setStatus] = useState("all");
  const [project, setProject] = useState("all");
  const [sort, setSort] = useState("deadline");
  const [q, setQ] = useState("");
  const [hideDone, setHideDone] = useState(false);

  const [taskModal, setTaskModal] = useState({ open: false, task: null });
  const [deleteTask, setDeleteTask] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => localStorage.setItem("taskView", view), [view]);

  const projectOptions = useMemo(() => {
    const map = new Map();
    for (const t of tasks.data || []) if (t.project) map.set(t.project._id, t.project);
    return [...map.values()];
  }, [tasks.data]);

  const filtered = useMemo(() => {
    let list = tasks.data || [];
    if (status !== "all") list = list.filter((t) => t.status === status);
    if (hideDone && status === "all") list = list.filter((t) => t.status !== "done");
    if (project !== "all") list = list.filter((t) => t.project?._id === project);
    if (q.trim()) list = list.filter((t) => t.title.toLowerCase().includes(q.toLowerCase()) || t.assignedTo?.name?.toLowerCase().includes(q.toLowerCase()));
    return [...list].sort(SORTS[sort].fn);
  }, [tasks.data, status, project, q, sort, hideDone]);

  const stats = useMemo(() => {
    const t = tasks.data || [];
    const now = Date.now();
    return {
      open: t.filter((x) => x.status !== "done").length,
      done: t.filter((x) => x.status === "done").length,
      overdue: t.filter((x) => x.status !== "done" && x.deadline && new Date(x.deadline) < now).length,
      dueSoon: t.filter((x) => x.status !== "done" && x.deadline && new Date(x.deadline) >= now && new Date(x.deadline) - now < 3 * 86400000).length
    };
  }, [tasks.data]);

  const onChange = (updated) => tasks.setData((list) => list.map((t) => (t._id === updated._id ? updated : t)));

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await API.delete(`/tasks/${deleteTask._id}`);
      toast.success("Task deleted");
      setDeleteTask(null);
      tasks.reload();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={isManager ? "All tasks" : "My tasks"}
        subtitle={isManager ? "Every task across the projects you manage." : "Everything assigned to you. Drag cards on the board or use the status controls."}
        actions={isManager && <button className="btn btn-primary" onClick={() => setTaskModal({ open: true, task: null })} disabled={!projects.data?.length}><Icon name="plus" /> New task</button>}
      />

      <div className="grid grid-stats mb-16">
        <StatCard label="Open" value={stats.open} icon="tasks" tone="primary" />
        <StatCard label="Due in 3 days" value={stats.dueSoon} icon="clock" tone="warning" />
        <StatCard label="Overdue" value={stats.overdue} icon="alert" tone={stats.overdue ? "danger" : "success"} />
        <StatCard label="Completed" value={stats.done} icon="checkCircle" tone="success" />
      </div>

      <div className="row between wrap mb-16">
        <div className="row wrap">
          <Segmented value={status} onChange={setStatus} options={[{ value: "all", label: "All" }, ...STATUS_ORDER.map((s) => ({ value: s, label: TASK_STATUS[s].label }))]} />
          {projectOptions.length > 1 && (
            <select className="select sm" value={project} onChange={(e) => setProject(e.target.value)} style={{ width: 200 }}>
              <option value="all">All projects</option>
              {projectOptions.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          )}
          <select className="select sm" value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 140 }}>
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>Sort: {v.label}</option>)}
          </select>
          {status === "all" && view === "list" && (
            <label className="row small muted" style={{ gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} style={{ accentColor: "var(--primary)" }} /> Hide done
            </label>
          )}
        </div>
        <div className="row">
          <div className="input-with-icon" style={{ width: 220 }}>
            <Icon name="search" />
            <input className="input sm" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 34 }} />
          </div>
          <Segmented value={view} onChange={setView} options={[{ value: "list", label: "List", icon: "list" }, { value: "board", label: "Board", icon: "columns" }]} />
        </div>
      </div>

      {tasks.loading ? (
        <div className="card"><SkeletonList rows={6} /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="tasks"
            title={(tasks.data || []).length === 0 ? "No tasks yet" : "Nothing matches"}
            text={(tasks.data || []).length === 0 ? (isManager ? "Create a task inside one of your projects." : "You'll see tasks here once your manager assigns them.") : "Try changing the filters."}
          />
        </div>
      ) : view === "board" ? (
        <TaskBoard
          tasks={filtered}
          userId={user?._id}
          showProject
          canMove={(t) => isManager || (t.assignedTo?._id || t.assignedTo) === user?._id}
          onChange={onChange}
          onEdit={isManager ? (t) => setTaskModal({ open: true, task: t }) : undefined}
        />
      ) : (
        <div className="card">
          <div className="list">
            {filtered.map((t) => (
              <TaskItem
                key={t._id}
                task={t}
                showProject
                showAssignee={isManager}
                canManage={isManager}
                isAssignee={(t.assignedTo?._id || t.assignedTo) === user?._id}
                onChange={onChange}
                onEdit={(task) => setTaskModal({ open: true, task })}
                onDelete={setDeleteTask}
              />
            ))}
          </div>
        </div>
      )}

      <TaskFormModal
        open={taskModal.open}
        task={taskModal.task}
        projects={projects.data || []}
        members={taskModal.task?.project ? (projects.data || []).find((p) => p._id === taskModal.task.project._id)?.members || [] : []}
        onClose={() => setTaskModal({ open: false, task: null })}
        onSaved={() => tasks.reload()}
      />
      <ConfirmDialog open={!!deleteTask} onClose={() => setDeleteTask(null)} onConfirm={confirmDelete} loading={busy} title="Delete this task?" text={`"${deleteTask?.title}" will be removed permanently.`} />
    </>
  );
}
