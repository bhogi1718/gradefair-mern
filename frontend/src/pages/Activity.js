import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import useApi from "../hooks/useApi";
import ActivityFeed from "../components/ActivityFeed";
import { Icon, PageHeader, Segmented, SkeletonList } from "../components/ui";
import { ACTIVITY } from "../utils/constants";

const FILTERS = [
  { value: "", label: "Everything" },
  { value: "task_completed", label: "Completed" },
  { value: "task_created", label: "Created" },
  { value: "task_updated", label: "Updated" },
  { value: "feedback_given", label: "Feedback" }
];

export default function Activity() {
  const { isAdmin } = useAuth();
  const [scope, setScope] = useState("all");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);

  const path = scope === "me" ? `/activity/me?limit=100` : `/activity?limit=25&page=${page}${action ? `&action=${action}` : ""}`;
  const { data, loading } = useApi(path, { initial: { logs: [], total: 0, pages: 1 } });

  const logs = scope === "me" && action ? data.logs.filter((l) => l.action === action) : data.logs;

  return (
    <>
      <PageHeader
        title="Activity"
        subtitle={isAdmin ? "Everything happening across the platform." : "A running log of what your team is doing."}
        actions={
          !isAdmin && (
            <Segmented value={scope} onChange={(v) => { setScope(v); setPage(1); }} options={[{ value: "all", label: "Team" }, { value: "me", label: "Just me" }]} />
          )
        }
      />

      <div className="row wrap mb-16">
        {FILTERS.map((f) => (
          <button key={f.value} className={`btn btn-sm ${action === f.value ? "btn-primary" : "btn-secondary"}`} onClick={() => { setAction(f.value); setPage(1); }}>
            {f.value && <Icon name={ACTIVITY[f.value].icon} />} {f.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? <SkeletonList rows={8} /> : <ActivityFeed logs={logs} />}
        </div>
        {scope !== "me" && data.pages > 1 && (
          <div className="card-header" style={{ borderTop: "1px solid var(--border)", borderBottom: "none" }}>
            <span className="muted small">Page {data.page} of {data.pages} · {data.total} entries</span>
            <div className="row">
              <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><Icon name="chevronLeft" /> Prev</button>
              <button className="btn btn-sm btn-secondary" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next <Icon name="chevronRight" /></button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
