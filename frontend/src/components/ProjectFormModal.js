import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import API, { errMsg } from "../services/api";
import { Avatar, Field, Modal } from "./ui";
import { toInputDate } from "../utils/format";
import { PROJECT_COLORS } from "../utils/constants";

/** Create or edit a project. Pass `project` to edit. */
export default function ProjectFormModal({ open, onClose, onSaved, project }) {
  const [form, setForm] = useState({});
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: project?.name || "",
      description: project?.description || "",
      deadline: toInputDate(project?.deadline),
      color: project?.color || PROJECT_COLORS[0],
      status: project?.status || "active",
      members: (project?.members || []).map((m) => m._id || m)
    });
    setSearch("");
    API.get("/users").then((r) => setMembers(r.data.filter((u) => u.role === "member"))).catch(() => {});
  }, [open, project]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleMember = (id) =>
    setForm((f) => ({ ...f, members: f.members.includes(id) ? f.members.filter((m) => m !== id) : [...f.members, id] }));

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.name.trim()) return toast.error("Give the project a name");
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description,
        deadline: form.deadline || null,
        color: form.color,
        members: form.members
      };
      let res;
      if (project) {
        res = await API.put(`/projects/${project._id}`, { ...payload, status: form.status });
        toast.success("Project updated");
      } else {
        res = await API.post("/projects", payload);
        toast.success("Project created");
      }
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const filtered = members.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? "Edit project" : "New project"}
      wide
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Saving…" : project ? "Save changes" : "Create project"}</button>
        </>
      }
    >
      <form onSubmit={submit} className="form-grid">
        <Field label="Project name" className="full">
          <input className="input" value={form.name || ""} onChange={set("name")} placeholder="e.g. Campus Event Portal" autoFocus />
        </Field>

        <Field label="Description" className="full">
          <textarea className="textarea" value={form.description || ""} onChange={set("description")} placeholder="What is this project about?" rows={3} />
        </Field>

        <Field label="Deadline">
          <input className="input" type="date" value={form.deadline || ""} onChange={set("deadline")} />
        </Field>

        {project ? (
          <Field label="Status">
            <select className="select" value={form.status} onChange={set("status")}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
        ) : (
          <Field label="Colour">
            <div className="color-swatches" style={{ paddingTop: 6 }}>
              {PROJECT_COLORS.map((c) => (
                <button key={c} type="button" className={`swatch ${form.color === c ? "active" : ""}`} style={{ background: c }} onClick={() => setForm((f) => ({ ...f, color: c }))} aria-label={c} />
              ))}
            </div>
          </Field>
        )}

        {project && (
          <Field label="Colour" className="full">
            <div className="color-swatches">
              {PROJECT_COLORS.map((c) => (
                <button key={c} type="button" className={`swatch ${form.color === c ? "active" : ""}`} style={{ background: c }} onClick={() => setForm((f) => ({ ...f, color: c }))} aria-label={c} />
              ))}
            </div>
          </Field>
        )}

        <Field label={`Team members (${form.members?.length || 0} selected)`} className="full" hint="Members can also be added later, and assigning a task adds someone automatically.">
          <input className="input sm" placeholder="Search members…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 6 }} />
          <div className="checkbox-list">
            {filtered.length === 0 && <p className="faint small" style={{ padding: 8 }}>No members found.</p>}
            {filtered.map((m) => (
              <label key={m._id} className="checkbox-row">
                <input type="checkbox" checked={form.members?.includes(m._id) || false} onChange={() => toggleMember(m._id)} />
                <Avatar name={m.name} hue={m.avatarColor} size={26} />
                <span className="grow truncate">{m.name}</span>
                <span className="faint small truncate">{m.email}</span>
              </label>
            ))}
          </div>
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
