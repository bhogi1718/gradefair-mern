import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import API, { errMsg } from "../services/api";
import { Avatar, Badge, Dropdown, Icon } from "./ui";
import { deadlineInfo, formatDate } from "../utils/format";
import { PRIORITY, TASK_STATUS, WEIGHT } from "../utils/constants";

/**
 * A single task row. Handles its own status changes and surfaces edit/delete
 * through callbacks so the parent can open modals.
 */
export default function TaskItem({ task, canManage = false, isAssignee = false, onChange, onEdit, onDelete, showProject = false, showAssignee = true }) {
  const [busy, setBusy] = useState(false);
  const done = task.status === "done";
  const canMove = canManage || isAssignee;

  const setStatus = async (status) => {
    if (!canMove || busy || status === task.status) return;
    setBusy(true);
    try {
      const res = await API.patch(`/tasks/${task._id}/status`, { status });
      onChange?.(res.data);
      window.dispatchEvent(new Event("gradefair:tasks-changed"));
      if (status === "done") toast.success("Nice — task completed!");
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const dl = deadlineInfo(task.deadline, done);
  const project = task.project;

  return (
    <div className="task-item">
      <button
        className={`task-check ${done ? "done" : task.status === "in-progress" ? "progress" : ""}`}
        onClick={() => setStatus(done ? "todo" : "done")}
        disabled={!canMove || busy}
        title={!canMove ? "Only the assignee or manager can change this" : done ? "Mark as not done" : "Mark as done"}
        aria-label={done ? "Reopen task" : "Complete task"}
      >
        <Icon name="check" size={13} strokeWidth={3} />
      </button>

      <div className="grow" style={{ minWidth: 0 }}>
        <div className={`task-title ${done ? "done" : ""}`}>
          <span>{task.title}</span>
          <Badge tone={PRIORITY[task.priority]?.tone || "neutral"} dot>{task.priority}</Badge>
          <Badge tone="neutral">{WEIGHT[task.weight]?.label || "Small"} · {WEIGHT[task.weight]?.points || 10} pts</Badge>
        </div>

        {task.description && <p className="muted small mt-8" style={{ whiteSpace: "pre-wrap" }}>{task.description}</p>}

        <div className="task-meta">
          {showProject && project && (
            <Link to={`/projects/${project._id}`} className="chip" style={{ color: "inherit" }}>
              <span className="project-dot" style={{ background: project.color }} />
              {project.name}
            </Link>
          )}
          {showAssignee && task.assignedTo && (
            <span title={task.assignedTo.email}>
              <Avatar name={task.assignedTo.name} hue={task.assignedTo.avatarColor} size={18} /> {task.assignedTo.name}
            </span>
          )}
          <span className={dl.tone === "danger" ? "text-danger bold" : dl.tone === "warning" ? "text-warning bold" : ""}>
            <Icon name="calendar" size={13} /> {dl.label}
          </span>
          {done && task.completedAt && (
            <span className="text-success">
              <Icon name="checkCircle" size={13} /> Done {formatDate(task.completedAt)}
            </span>
          )}
        </div>
      </div>

      <div className="task-actions">
        {canMove && (
          <select className="select sm hide-mobile" value={task.status} onChange={(e) => setStatus(e.target.value)} disabled={busy} aria-label="Status">
            {Object.entries(TASK_STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        )}
        {!canMove && <Badge tone={TASK_STATUS[task.status]?.tone}>{TASK_STATUS[task.status]?.label}</Badge>}

        {canManage && (
          <Dropdown trigger={<button className="btn-icon" aria-label="Task actions"><Icon name="more" /></button>}>
            <button onClick={() => onEdit?.(task)}><Icon name="edit" /> Edit task</button>
            <button className="danger" onClick={() => onDelete?.(task)}><Icon name="trash" /> Delete task</button>
          </Dropdown>
        )}
      </div>
    </div>
  );
}
