import { Link } from "react-router-dom";
import { Avatar, EmptyState, Icon } from "./ui";
import { ACTIVITY } from "../utils/constants";
import { formatDateTime, relativeTime } from "../utils/format";

/** Timeline of activity log entries. */
export default function ActivityFeed({ logs = [], compact = false, showProject = true }) {
  if (!logs.length) return <EmptyState icon="activity" title="No activity yet" text="Actions on tasks and projects will show up here." />;

  return (
    <div className="timeline">
      {logs.map((log) => {
        const meta = ACTIVITY[log.action] || { label: log.action, tone: "", icon: "circle" };
        return (
          <div key={log._id} className="timeline-item" style={compact ? { padding: "8px 0" } : undefined}>
            <div className={`timeline-icon ${meta.tone}`}>
              <Icon name={meta.icon} size={15} />
            </div>
            <div className="timeline-body">
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                {log.user && <Avatar name={log.user.name} hue={log.user.avatarColor} size={20} />}
                <span>
                  <b>{log.user?.name || "Someone"}</b> {meta.label}
                  {log.task?.title && <> <b>{log.task.title}</b></>}
                  {!log.task && log.action.startsWith("task_") && log.action !== "task_deleted" && log.action !== "task_created" && <span className="faint"> a task that was later deleted</span>}
                  {!log.task?.title && log.action === "task_deleted" && log.detail && <> <b>{log.detail}</b></>}
                  {log.detail && log.action !== "task_deleted" && log.action !== "project_created" && (
                    <span className="muted"> — {log.detail}</span>
                  )}
                </span>
              </div>
              <time title={formatDateTime(log.createdAt)}>
                {relativeTime(log.createdAt)}
                {showProject && log.project && (
                  <>
                    {" · "}
                    <Link to={`/projects/${log.project._id}`} style={{ color: "inherit" }}>
                      <span className="project-dot" style={{ background: log.project.color, display: "inline-block", width: 8, height: 8, marginRight: 4, verticalAlign: "middle" }} />
                      {log.project.name}
                    </Link>
                  </>
                )}
              </time>
            </div>
          </div>
        );
      })}
    </div>
  );
}
