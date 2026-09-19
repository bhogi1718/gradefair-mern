import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import API, { errMsg } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import useApi from "../hooks/useApi";
import { Avatar, Badge, EmptyState, Field, Icon, PageHeader, ScoreBreakdown, SkeletonList, StarRating, StatCard } from "../components/ui";
import { formatDate, relativeTime } from "../utils/format";
import { ROLE_LABEL } from "../utils/constants";

const HUES = [0, 20, 45, 90, 150, 180, 200, 220, 265, 300, 330];

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const stats = useApi("/users/me/stats");

  const [form, setForm] = useState({ name: "", bio: "", avatarColor: 220 });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (user) setForm({ name: user.name || "", bio: user.bio || "", avatarColor: user.avatarColor ?? 220 });
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name cannot be empty");
    setSaving(true);
    try {
      const res = await API.put("/users/me", form);
      updateUser(res.data);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword.length < 6) return toast.error("New password must be at least 6 characters");
    if (pw.newPassword !== pw.confirm) return toast.error("Passwords do not match");
    setSavingPw(true);
    try {
      await API.put("/users/me/password", { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      toast.success("Password changed");
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSavingPw(false);
    }
  };

  const s = stats.data;
  const isMember = user?.role === "member";

  return (
    <>
      <PageHeader title="Your profile" subtitle="Manage your details and see your track record." />

      <div className="grid grid-3">
        {/* Identity card */}
        <div className="card">
          <div className="card-body center">
            <Avatar name={form.name || user?.name} hue={form.avatarColor} size={88} />
            <h2 className="mt-16">{user?.name}</h2>
            <p className="muted">{user?.email}</p>
            <div className="mt-8"><Badge tone={user?.role === "admin" ? "danger" : user?.role === "manager" ? "primary" : "success"}>{ROLE_LABEL[user?.role]}</Badge></div>
            {user?.bio && <p className="muted small mt-16">{user.bio}</p>}
            <div className="faint tiny mt-16">Member since {formatDate(user?.createdAt)}</div>
          </div>
          <div className="card-header" style={{ borderTop: "1px solid var(--border)", borderBottom: "none" }}>
            <span className="small muted">Appearance</span>
            <div className="segmented">
              <button className={theme === "light" ? "active" : ""} onClick={() => setTheme("light")}><Icon name="sun" /> Light</button>
              <button className={theme === "dark" ? "active" : ""} onClick={() => setTheme("dark")}><Icon name="moon" /> Dark</button>
            </div>
          </div>
        </div>

        {/* Edit profile */}
        <div className="card span-2">
          <div className="card-header"><h3><Icon name="user" size={16} /> Profile details</h3></div>
          <form className="card-body form-grid" onSubmit={saveProfile}>
            <Field label="Full name">
              <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Email" hint="Email can't be changed">
              <input className="input" value={user?.email || ""} disabled style={{ opacity: 0.6 }} />
            </Field>
            <Field label="Bio" className="full" hint={`${form.bio.length}/200`}>
              <textarea className="textarea" rows={2} maxLength={200} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} placeholder="A line about you — e.g. CS final year, loves backend work" />
            </Field>
            <Field label="Avatar colour" className="full">
              <div className="color-swatches">
                {HUES.map((h) => (
                  <button key={h} type="button" className={`swatch ${form.avatarColor === h ? "active" : ""}`} style={{ background: `hsl(${h} 70% 55%)` }} onClick={() => setForm((f) => ({ ...f, avatarColor: h }))} aria-label={`Hue ${h}`} />
                ))}
              </div>
            </Field>
            <div className="full row" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
            </div>
          </form>
        </div>

        {/* Stats */}
        {isMember && (
          <div className="card span-2">
            <div className="card-header"><h3><Icon name="zap" size={16} /> Your track record</h3></div>
            <div className="card-body">
              {stats.loading ? (
                <SkeletonList rows={3} />
              ) : !s ? (
                <EmptyState icon="zap" title="No stats yet" />
              ) : (
                <>
                  <div className="grid grid-stats">
                    <StatCard label="Total score" value={s.overall?.score ?? 0} icon="zap" tone="primary" />
                    <StatCard label="Tasks done" value={`${s.tasks.done}/${s.tasks.total}`} icon="checkCircle" tone="success" />
                    <StatCard label="Projects" value={s.projects} icon="folder" tone="info" />
                    <StatCard label="Avg rating" value={s.overall?.avgRating ? `★ ${s.overall.avgRating}` : "—"} icon="star" tone="warning" hint={`${s.feedbackReceived.length} received · ${s.feedbackGivenCount} given`} />
                  </div>
                  {s.overall && <div className="mt-24"><ScoreBreakdown row={s.overall} showLegend /></div>}
                  {s.perProject.length > 0 && (
                    <div className="table-wrap mt-24">
                      <table className="table">
                        <thead><tr><th>Project</th><th className="right">Tasks</th><th className="right">Share</th><th className="right">Rating</th><th className="right">Score</th></tr></thead>
                        <tbody>
                          {s.perProject.map((r) => (
                            <tr key={r.project}>
                              <td><Link to={`/projects/${r.project}`} className="row" style={{ color: "inherit", fontWeight: 600 }}><span className="project-dot" style={{ background: r.projectColor }} />{r.projectName}</Link></td>
                              <td className="right">{r.tasksCompleted}/{r.tasksTotal}</td>
                              <td className="right">{r.share}%</td>
                              <td className="right">{r.avgRating ? `★ ${r.avgRating}` : "—"}</td>
                              <td className="right bold">{r.score}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Password */}
        <div className={`card ${isMember ? "" : "span-2"}`}>
          <div className="card-header"><h3><Icon name="lock" size={16} /> Change password</h3></div>
          <form className="card-body stack" onSubmit={savePassword}>
            <Field label="Current password"><input className="input" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} /></Field>
            <Field label="New password"><input className="input" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} /></Field>
            <Field label="Confirm new password"><input className="input" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} /></Field>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" type="submit" disabled={savingPw || !pw.currentPassword || !pw.newPassword}>{savingPw ? "Updating…" : "Update password"}</button>
            </div>
          </form>
        </div>

        {/* Recent feedback */}
        {isMember && s?.feedbackReceived?.length > 0 && (
          <div className="card span-2">
            <div className="card-header"><h3><Icon name="star" size={16} /> Feedback received</h3><Link to="/feedback" className="btn btn-sm btn-ghost">All feedback <Icon name="arrowRight" /></Link></div>
            <div className="list">
              {s.feedbackReceived.slice(0, 5).map((f) => (
                <div key={f._id} className="list-item" style={{ alignItems: "flex-start" }}>
                  <Avatar name={f.from?.name} hue={f.from?.avatarColor} size={32} />
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="row between wrap"><span className="bold small">{f.from?.name} <span className="faint">· {f.project?.name}</span></span><StarRating value={f.rating} readonly size="sm" /></div>
                    {f.comment && <p className="muted small mt-8">"{f.comment}"</p>}
                    <div className="faint tiny mt-8">{relativeTime(f.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header"><h3><Icon name="logout" size={16} /> Session</h3></div>
          <div className="card-body">
            <p className="muted small">Signed in as {user?.email}. Last login {relativeTime(user?.lastLoginAt) || "unknown"}.</p>
            <button className="btn btn-danger-soft mt-16" onClick={logout}><Icon name="logout" /> Sign out</button>
          </div>
        </div>
      </div>
    </>
  );
}
