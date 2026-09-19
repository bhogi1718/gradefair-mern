import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import API, { errMsg } from "../services/api";
import { useAuth } from "../context/AuthContext";
import useApi from "../hooks/useApi";
import { Avatar, Badge, EmptyState, Icon, PageHeader, SkeletonList, StarRating, StatCard, Tabs } from "../components/ui";
import { relativeTime } from "../utils/format";

export default function Feedback() {
  const { user } = useAuth();
  const projects = useApi("/projects", { initial: [] });
  const given = useApi("/feedback/me/given", { initial: [] });
  const received = useApi("/feedback/me/received", { initial: [] });

  const [tab, setTab] = useState("give");
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(null);

  const givenMap = useMemo(() => Object.fromEntries((given.data || []).map((f) => [`${f.project?._id}_${f.to?._id}`, f])), [given.data]);

  // Only active/completed projects with at least one teammate
  const groups = useMemo(
    () =>
      (projects.data || [])
        .filter((p) => p.status !== "archived")
        .map((p) => ({ ...p, teammates: (p.members || []).filter((m) => m._id !== user?._id) }))
        .filter((p) => p.teammates.length > 0),
    [projects.data, user?._id]
  );

  const pending = groups.reduce((n, p) => n + p.teammates.filter((m) => !givenMap[`${p._id}_${m._id}`]).length, 0);
  const avgReceived = received.data?.length ? Math.round((received.data.reduce((s, f) => s + f.rating, 0) / received.data.length) * 10) / 10 : null;

  const submit = async (projectId, to) => {
    const key = `${projectId}_${to}`;
    const d = drafts[key] || {};
    const ex = givenMap[key];
    const rating = d.rating ?? ex?.rating;
    if (!rating) return toast.error("Pick a star rating first");
    setSaving(key);
    try {
      await API.post("/feedback", { to, project: projectId, rating, comment: d.comment ?? ex?.comment ?? "" });
      toast.success("Feedback saved");
      setDrafts((x) => ({ ...x, [key]: {} }));
      given.reload();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(null);
    }
  };

  const loading = projects.loading || given.loading || received.loading;

  return (
    <>
      <PageHeader title="Peer feedback" subtitle="Rate the people you work with, and see how they rate you." />

      <div className="grid grid-stats mb-16">
        <StatCard label="Ratings to give" value={pending} icon="star" tone={pending ? "warning" : "success"} hint={pending ? "teammates not yet rated" : "all caught up"} />
        <StatCard label="Ratings given" value={given.data?.length || 0} icon="checkCircle" tone="primary" />
        <StatCard label="Ratings received" value={received.data?.length || 0} icon="inbox" tone="info" />
        <StatCard label="Your average" value={avgReceived ? `★ ${avgReceived}` : "—"} icon="award" tone="warning" />
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "give", label: "Rate teammates", icon: "star", count: pending || undefined },
          { id: "received", label: "Received", icon: "inbox", count: received.data?.length }
        ]}
      />

      {loading ? (
        <div className="card"><SkeletonList rows={5} /></div>
      ) : tab === "give" ? (
        groups.length === 0 ? (
          <div className="card"><EmptyState icon="users" title="No teammates to rate yet" text="You'll be able to rate people once you share a project with them." /></div>
        ) : (
          <div className="stack" style={{ gap: 20 }}>
            {groups.map((p) => (
              <div key={p._id} className="card">
                <div className="card-header">
                  <div className="row">
                    <span className="project-dot" style={{ background: p.color, width: 12, height: 12 }} />
                    <div>
                      <h3><Link to={`/projects/${p._id}`} style={{ color: "inherit" }}>{p.name}</Link></h3>
                      <p>{p.teammates.length} teammate{p.teammates.length === 1 ? "" : "s"}</p>
                    </div>
                  </div>
                  <Badge tone={p.status === "active" ? "success" : "primary"} dot>{p.status}</Badge>
                </div>
                <div className="list">
                  {p.teammates.map((m) => {
                    const key = `${p._id}_${m._id}`;
                    const ex = givenMap[key];
                    const d = drafts[key] || {};
                    const dirty = d.rating !== undefined || d.comment !== undefined;
                    return (
                      <div key={m._id} className="list-item" style={{ alignItems: "flex-start" }}>
                        <Avatar name={m.name} hue={m.avatarColor} size={38} />
                        <div className="grow stack" style={{ gap: 8, minWidth: 0 }}>
                          <div className="row between wrap">
                            <div>
                              <div className="bold">{m.name}</div>
                              <div className="faint tiny">{ex ? `Rated ${ex.rating}/5 · ${relativeTime(ex.updatedAt)}` : "Not rated yet"}</div>
                            </div>
                            <StarRating value={d.rating ?? ex?.rating ?? 0} onChange={(r) => setDrafts((x) => ({ ...x, [key]: { ...x[key], rating: r } }))} />
                          </div>
                          {(dirty || !ex) && (
                            <textarea className="textarea" rows={2} style={{ minHeight: 52 }} placeholder="Optional comment for the manager — what did they do well?" value={d.comment ?? ex?.comment ?? ""} onChange={(e) => setDrafts((x) => ({ ...x, [key]: { ...x[key], comment: e.target.value } }))} />
                          )}
                          {ex && !dirty && ex.comment && <p className="muted small">"{ex.comment}"</p>}
                          {(dirty || !ex) && (
                            <div className="row" style={{ justifyContent: "flex-end" }}>
                              {dirty && <button className="btn btn-sm btn-ghost" onClick={() => setDrafts((x) => ({ ...x, [key]: {} }))}>Discard</button>}
                              <button className="btn btn-sm btn-primary" onClick={() => submit(p._id, m._id)} disabled={saving === key}>{saving === key ? "Saving…" : ex ? "Update rating" : "Submit rating"}</button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (received.data || []).length === 0 ? (
        <div className="card"><EmptyState icon="inbox" title="Nothing received yet" text="When teammates rate you it will appear here." /></div>
      ) : (
        <div className="card">
          <div className="list">
            {received.data.map((f) => (
              <div key={f._id} className="list-item" style={{ alignItems: "flex-start" }}>
                <Avatar name={f.from?.name} hue={f.from?.avatarColor} size={38} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row between wrap">
                    <div>
                      <span className="bold">{f.from?.name}</span>
                      <span className="faint small"> · <Icon name="folder" size={12} /> {f.project?.name}</span>
                    </div>
                    <span className="row" style={{ gap: 6 }}><StarRating value={f.rating} readonly size="sm" /><b>{f.rating}/5</b></span>
                  </div>
                  {f.comment ? <p className="muted small mt-8">"{f.comment}"</p> : <p className="faint tiny mt-8">No comment</p>}
                  <div className="faint tiny mt-8">{relativeTime(f.updatedAt || f.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
