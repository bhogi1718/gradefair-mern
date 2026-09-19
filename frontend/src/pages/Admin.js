import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import API, { errMsg } from "../services/api";
import { useAuth } from "../context/AuthContext";
import useApi from "../hooks/useApi";
import { Avatar, Badge, ConfirmDialog, Dropdown, EmptyState, Field, Icon, Modal, PageHeader, Segmented, SkeletonCards, SkeletonList, StatCard, Tabs } from "../components/ui";
import { formatDate, relativeTime } from "../utils/format";
import { PROJECT_STATUS } from "../utils/constants";

const ROLE_TONE = { admin: "danger", manager: "primary", member: "success" };

export default function Admin() {
  const { user: me } = useAuth();
  const stats = useApi("/admin/stats");
  const users = useApi("/admin/users", { initial: [] });
  const projects = useApi("/admin/projects", { initial: [] });

  const [tab, setTab] = useState("users");
  const [role, setRole] = useState("all");
  const [q, setQ] = useState("");
  const [create, setCreate] = useState(false);
  const [resetFor, setResetFor] = useState(null);
  const [deleteFor, setDeleteFor] = useState(null);
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => {
    let l = users.data || [];
    if (role !== "all") l = l.filter((u) => u.role === role);
    if (q.trim()) l = l.filter((u) => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()));
    return l;
  }, [users.data, role, q]);

  const changeRole = async (u, newRole) => {
    if (newRole === u.role) return;
    try {
      const res = await API.put(`/admin/users/${u._id}/role`, { role: newRole });
      users.setData((l) => l.map((x) => (x._id === u._id ? { ...x, role: res.data.role } : x)));
      toast.success(`${u.name} is now ${newRole}`);
      stats.reload();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await API.delete(`/admin/users/${deleteFor._id}`);
      toast.success("User deleted");
      setDeleteFor(null);
      users.reload();
      stats.reload();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const s = stats.data;

  return (
    <>
      <PageHeader title="Admin panel" subtitle="Platform-wide overview and user management." actions={<button className="btn btn-primary" onClick={() => setCreate(true)}><Icon name="userPlus" /> Create user</button>} />

      {stats.loading ? (
        <SkeletonCards count={6} />
      ) : s && (
        <div className="grid grid-stats">
          <StatCard label="Users" value={s.users} icon="users" tone="primary" hint={`${s.usersByRole.manager || 0} managers · ${s.usersByRole.member || 0} members`} />
          <StatCard label="New this week" value={s.newUsersLast7Days} icon="userPlus" tone="info" />
          <StatCard label="Projects" value={s.projects} icon="folder" tone="primary" />
          <StatCard label="Tasks" value={s.tasks} icon="tasks" tone="warning" hint={`${s.doneTasks} completed`} />
          <StatCard label="Feedback entries" value={s.feedback} icon="star" tone="warning" />
          <StatCard label="Actions this week" value={s.activityLast7Days} icon="activity" tone="success" />
        </div>
      )}

      <div className="mt-24">
        <Tabs active={tab} onChange={setTab} tabs={[{ id: "users", label: "Users", icon: "users", count: users.data?.length }, { id: "projects", label: "Projects", icon: "folder", count: projects.data?.length }]} />
      </div>

      {tab === "users" && (
        <>
          <div className="row between wrap mb-16">
            <Segmented value={role} onChange={setRole} options={[{ value: "all", label: "All" }, { value: "admin", label: "Admins" }, { value: "manager", label: "Managers" }, { value: "member", label: "Members" }]} />
            <div className="input-with-icon" style={{ width: 260 }}>
              <Icon name="search" />
              <input className="input sm" placeholder="Search users…" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 34 }} />
            </div>
          </div>

          <div className="card">
            {users.loading ? (
              <SkeletonList rows={6} />
            ) : list.length === 0 ? (
              <EmptyState icon="users" title="No users match" />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>User</th><th>Role</th><th className="hide-mobile">Activity</th><th className="hide-mobile">Last login</th><th className="hide-mobile">Joined</th><th></th></tr>
                  </thead>
                  <tbody>
                    {list.map((u) => (
                      <tr key={u._id}>
                        <td>
                          <div className="row">
                            <Avatar name={u.name} hue={u.avatarColor} size={34} />
                            <div style={{ minWidth: 0 }}>
                              <div className="bold truncate">{u.name}{u._id === me._id && <span className="faint"> (you)</span>}</div>
                              <div className="faint tiny truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {u._id === me._id ? (
                            <Badge tone={ROLE_TONE[u.role]} className="cap">{u.role}</Badge>
                          ) : (
                            <select className="select sm" value={u.role} onChange={(e) => changeRole(u, e.target.value)} style={{ width: 120 }}>
                              <option value="member">Member</option>
                              <option value="manager">Manager</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                        </td>
                        <td className="hide-mobile small muted">
                          {u.role === "manager" ? `${u.projectsManaged} project${u.projectsManaged === 1 ? "" : "s"} managed` : u.role === "member" ? `${u.tasksDone}/${u.tasksTotal} tasks done` : "—"}
                        </td>
                        <td className="hide-mobile small muted">{u.lastLoginAt ? relativeTime(u.lastLoginAt) : "never"}</td>
                        <td className="hide-mobile small muted">{formatDate(u.createdAt)}</td>
                        <td className="right">
                          {u._id !== me._id && (
                            <Dropdown trigger={<button className="btn-icon" aria-label="User actions"><Icon name="more" /></button>}>
                              <button onClick={() => setResetFor(u)}><Icon name="key" /> Reset password</button>
                              <button className="danger" onClick={() => setDeleteFor(u)}><Icon name="trash" /> Delete user</button>
                            </Dropdown>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "projects" && (
        <div className="card">
          {projects.loading ? (
            <SkeletonList rows={5} />
          ) : (projects.data || []).length === 0 ? (
            <EmptyState icon="folder" title="No projects yet" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Project</th><th>Manager</th><th>Status</th><th className="right">Members</th><th className="hide-mobile">Created</th></tr></thead>
                <tbody>
                  {projects.data.map((p) => (
                    <tr key={p._id}>
                      <td><Link to={`/projects/${p._id}`} className="row bold" style={{ color: "inherit" }}><span className="project-dot" style={{ background: p.color }} />{p.name}</Link></td>
                      <td className="small">{p.manager?.name} <span className="faint">· {p.manager?.email}</span></td>
                      <td><Badge tone={PROJECT_STATUS[p.status]?.tone} dot>{p.status}</Badge></td>
                      <td className="right">{p.members?.length || 0}</td>
                      <td className="hide-mobile small muted">{formatDate(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <CreateUserModal open={create} onClose={() => setCreate(false)} onSaved={() => { users.reload(); stats.reload(); }} />
      <ResetPasswordModal user={resetFor} onClose={() => setResetFor(null)} />
      <ConfirmDialog open={!!deleteFor} onClose={() => setDeleteFor(null)} onConfirm={confirmDelete} loading={busy} title={`Delete ${deleteFor?.name}?`} text="Their account and feedback will be removed. Users who manage projects or have open tasks cannot be deleted." confirmText="Delete user" />
    </>
  );
}

function CreateUserModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "member" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/admin/users", form);
      toast.success("User created");
      setForm({ name: "", email: "", password: "", role: "member" });
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create user" footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Creating…" : "Create"}</button></>}>
      <form className="stack" onSubmit={submit}>
        <Field label="Full name"><input className="input" value={form.name} onChange={set("name")} autoFocus /></Field>
        <Field label="Email"><input className="input" type="email" value={form.email} onChange={set("email")} /></Field>
        <Field label="Temporary password" hint="At least 6 characters — share it with them securely"><input className="input" type="text" value={form.password} onChange={set("password")} /></Field>
        <Field label="Role">
          <select className="select" value={form.role} onChange={set("role")}>
            <option value="member">Member</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose }) {
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await API.put(`/admin/users/${user._id}/password`, { newPassword: pw });
      toast.success(`Password reset for ${user.name}`);
      setPw("");
      onClose();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!user} onClose={onClose} title={`Reset password — ${user?.name}`} footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={saving || pw.length < 6}>{saving ? "Saving…" : "Reset password"}</button></>}>
      <Field label="New password" hint="At least 6 characters"><input className="input" type="text" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></Field>
    </Modal>
  );
}
