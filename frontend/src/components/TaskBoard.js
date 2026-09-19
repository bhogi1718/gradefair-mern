import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import API, { errMsg } from "../services/api";
import { Avatar, Badge, Icon } from "./ui";
import { deadlineInfo } from "../utils/format";
import { PRIORITY, STATUS_ORDER, TASK_STATUS, WEIGHT } from "../utils/constants";

const COL_ICON = { todo: "circle", "in-progress": "play", done: "checkCircle" };

/**
 * Kanban board with native drag-and-drop. `canMove(task)` decides whether a card
 * can be dragged; otherwise it is read-only.
 */
export default function TaskBoard({ tasks, canMove, onChange, onEdit, showProject = false, userId }) {
  const [dragId, setDragId] = useState(null);
  const [over, setOver] = useState(null);

  const move = async (task, status) => {
    if (task.status === status) return;
    try {
      const res = await API.patch(`/tasks/${task._id}/status`, { status });
      onChange?.(res.data);
      window.dispatchEvent(new Event("gradefair:tasks-changed"));
      if (status === "done") toast.success("Task completed!");
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const onDrop = (status) => {
    const task = tasks.find((t) => t._id === dragId);
    setDragId(null);
    setOver(null);
    if (task) move(task, status);
  };

  return (
    <div className="board">
      {STATUS_ORDER.map((status) => {
        const col = tasks.filter((t) => t.status === status);
        return (
          <div
            key={status}
            className={`board-col ${over === status ? "drag-over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); if (over !== status) setOver(status); }}
            onDragLeave={() => setOver(null)}
            onDrop={() => onDrop(status)}
          >
            <div className="board-col-head">
              <Icon name={COL_ICON[status]} size={15} className={status === "done" ? "text-success" : status === "in-progress" ? "text-warning" : "faint"} />
              {TASK_STATUS[status].label}
              <span className="count">{col.length}</span>
            </div>

            <div className="board-cards">
              {col.length === 0 && <p className="faint small center" style={{ padding: "18px 0" }}>Nothing here</p>}
              {col.map((task) => {
                const movable = canMove(task);
                const dl = deadlineInfo(task.deadline, status === "done");
                const mine = userId && (task.assignedTo?._id || task.assignedTo) === userId;
                return (
                  <div
                    key={task._id}
                    className={`board-card ${dragId === task._id ? "dragging" : ""}`}
                    draggable={movable}
                    onDragStart={() => movable && setDragId(task._id)}
                    onDragEnd={() => { setDragId(null); setOver(null); }}
                    style={{ cursor: movable ? "grab" : "default", borderLeft: mine ? "3px solid var(--primary)" : undefined }}
                    onDoubleClick={() => onEdit?.(task)}
                  >
                    <div className="board-card-title">{task.title}</div>
                    <div className="row wrap" style={{ gap: 6 }}>
                      <Badge tone={PRIORITY[task.priority]?.tone} dot>{task.priority}</Badge>
                      <Badge tone="neutral">{WEIGHT[task.weight]?.points} pts</Badge>
                      {task.deadline && <Badge tone={dl.tone} icon="calendar">{dl.label}</Badge>}
                    </div>
                    <div className="row between mt-8">
                      {showProject && task.project ? (
                        <Link to={`/projects/${task.project._id}`} className="row faint small" style={{ gap: 6, color: "inherit" }}>
                          <span className="project-dot" style={{ background: task.project.color }} />
                          <span className="truncate" style={{ maxWidth: 140 }}>{task.project.name}</span>
                        </Link>
                      ) : <span />}
                      {task.assignedTo && (
                        <span className="row faint small" style={{ gap: 6 }} title={task.assignedTo.name}>
                          <Avatar name={task.assignedTo.name} hue={task.assignedTo.avatarColor} size={20} />
                        </span>
                      )}
                    </div>

                    {movable && (
                      <div className="row mt-8" style={{ gap: 4 }}>
                        {status !== "todo" && (
                          <button className="btn btn-sm btn-ghost" onClick={() => move(task, STATUS_ORDER[STATUS_ORDER.indexOf(status) - 1])} title="Move back">
                            <Icon name="arrowLeft" />
                          </button>
                        )}
                        <span className="grow" />
                        {status !== "done" && (
                          <button className={`btn btn-sm ${status === "in-progress" ? "btn-success-soft" : "btn-secondary"}`} onClick={() => move(task, STATUS_ORDER[STATUS_ORDER.indexOf(status) + 1])}>
                            {status === "todo" ? "Start" : "Complete"} <Icon name="arrowRight" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
