import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import useApi from "../hooks/useApi";
import ProjectFormModal from "../components/ProjectFormModal";
import { AvatarGroup, Badge, EmptyState, Icon, PageHeader, ProgressBar, Segmented, Skeleton } from "../components/ui";
import { deadlineInfo } from "../utils/format";
import { PROJECT_STATUS } from "../utils/constants";

export default function Projects() {
  const { isManager, isAdmin } = useAuth();
  const nav = useNavigate();
  const { data, loading, reload } = useApi("/projects", { initial: [] });

  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const projects = useMemo(() => {
    let list = data || [];
    if (status !== "all") list = list.filter((p) => p.status === status);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s) || p.manager?.name?.toLowerCase().includes(s));
    }
    return list;
  }, [data, status, q]);

  const counts = useMemo(() => {
    const c = { all: (data || []).length, active: 0, completed: 0, archived: 0 };
    for (const p of data || []) c[p.status] = (c[p.status] || 0) + 1;
    return c;
  }, [data]);

  return (
    <>
      <PageHeader
        title={isManager ? "Projects" : isAdmin ? "All projects" : "My projects"}
        subtitle={isManager ? "Projects you manage." : isAdmin ? "Every project on the platform." : "Projects you're a member of."}
        actions={isManager && <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Icon name="plus" /> New project</button>}
      />

      <div className="row between wrap mb-16">
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: `All (${counts.all})` },
            { value: "active", label: `Active (${counts.active})` },
            { value: "completed", label: `Completed (${counts.completed})` },
            { value: "archived", label: `Archived (${counts.archived})` }
          ]}
        />
        <div className="input-with-icon" style={{ width: 260, maxWidth: "100%" }}>
          <Icon name="search" />
          <input className="input sm" placeholder="Search projects…" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 34 }} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card card-body stack">
              <Skeleton h={18} w="60%" />
              <Skeleton h={12} />
              <Skeleton h={12} w="80%" />
              <Skeleton h={8} />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="folder"
            title={q || status !== "all" ? "No projects match" : isManager ? "No projects yet" : "You're not in any projects yet"}
            text={q || status !== "all" ? "Try a different filter or search term." : isManager ? "Create a project and add your team to get started." : "Your manager will add you to a project, or assign you a task."}
            action={isManager && !q && status === "all" && <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Icon name="plus" /> New project</button>}
          />
        </div>
      ) : (
        <div className="grid grid-auto">
          {projects.map((p) => {
            const dl = deadlineInfo(p.deadline, p.status !== "active");
            return (
              <div key={p._id} className="card clickable" onClick={() => nav(`/projects/${p._id}`)} style={{ borderTop: `4px solid ${p.color}` }}>
                <div className="card-body">
                  <div className="row between" style={{ alignItems: "flex-start" }}>
                    <h3 className="truncate" style={{ fontSize: 17 }}>{p.name}</h3>
                    <Badge tone={PROJECT_STATUS[p.status]?.tone} dot>{p.status}</Badge>
                  </div>
                  <p className="muted small mt-8" style={{ minHeight: 40, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {p.description || "No description"}
                  </p>

                  <div className="mt-16">
                    <ProgressBar value={p.stats.progress} label={`${p.stats.done}/${p.stats.total} tasks done`} />
                  </div>

                  <div className="row between mt-16">
                    <AvatarGroup users={p.members || []} size={28} />
                    <div className="row" style={{ gap: 6 }}>
                      {p.stats.overdue > 0 && <Badge tone="danger" icon="alert">{p.stats.overdue}</Badge>}
                      {p.deadline && <Badge tone={dl.tone} icon="calendar">{dl.label}</Badge>}
                    </div>
                  </div>

                  {(isAdmin || !isManager) && p.manager && (
                    <div className="faint tiny mt-8">Managed by {p.manager.name}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProjectFormModal open={showCreate} onClose={() => setShowCreate(false)} onSaved={(p) => { reload(); nav(`/projects/${p._id}`); }} />
    </>
  );
}
