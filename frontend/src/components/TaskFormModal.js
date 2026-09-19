import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import API, { errMsg } from "../services/api";
import { Field, Modal } from "./ui";
import { toInputDate } from "../utils/format";
import { WEIGHT } from "../utils/constants";

const EMPTY = [];

/**
 * Create or edit a task. Pass `task` to edit.
 * `projects` is the list the manager can pick from (hidden if `projectId` is fixed).
 */
export default function TaskFormModal({ open, onClose, onSaved, task, projectId, projects = EMPTY, members = EMPTY }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      title: task?.title || "",
      description: task?.description || "",
      project: task?.project?._id || task?.project || projectId || projects[0]?._id || "",
      assignedTo: task?.assignedTo?._id || task?.assignedTo || "",
      weight: task?.weight || 1,
      priority: task?.priority || "medium",
      deadline: toInputDate(task?.deadline)
    });
  }, [open, task, projectId, projects]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Members eligible for the currently selected project
  const selectedProject = projects.find((p) => p._id === form.project);
  const eligible = selectedProject?.members?.length ? selectedProject.members : members;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Give the task a title");
    if (!form.assignedTo) return toast.error("Pick someone to assign it to");
    if (!form.project) return toast.error("Pick a project");

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description,
        assignedTo: form.assignedTo,
        weight: Number(form.weight),
        priority: form.priority,
        deadline: form.deadline || null
      };
      let res;
      if (task) {
        res = await API.put(`/tasks/${task._id}`, payload);
        toast.success("Task updated");
      } else {
        res = await API.post("/tasks", { ...payload, project: form.project });
        toast.success("Task created");
      }
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? "Edit task" : "New task"}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Saving…" : task ? "Save changes" : "Create task"}</button>
        </>
      }
    >
      <form onSubmit={submit} className="form-grid">
        <Field label="Title" className="full">
          <input className="input" value={form.title || ""} onChange={set("title")} placeholder="e.g. Build the login page" autoFocus />
        </Field>

        <Field label="Description" className="full">
          <textarea className="textarea" value={form.description || ""} onChange={set("description")} placeholder="What does done look like?" rows={3} />
        </Field>

        {!projectId && !task && (
          <Field label="Project" className="full">
            <select className="select" value={form.project || ""} onChange={(e) => setForm((f) => ({ ...f, project: e.target.value, assignedTo: "" }))}>
              {projects.length === 0 && <option value="">No projects yet</option>}
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Assign to" hint={eligible.length === 0 ? "No members available — add members to the project first" : undefined}>
          <select className="select" value={form.assignedTo || ""} onChange={set("assignedTo")}>
            <option value="">Select a member</option>
            {eligible.map((u) => (
              <option key={u._id} value={u._id}>{u.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Deadline">
          <input className="input" type="date" value={form.deadline || ""} onChange={set("deadline")} />
        </Field>

        <Field label="Size (weight)" hint={`Worth ${WEIGHT[form.weight || 1].points} points when completed`}>
          <select className="select" value={form.weight || 1} onChange={set("weight")}>
            {Object.entries(WEIGHT).map(([w, v]) => (
              <option key={w} value={w}>{v.label} · {v.points} pts</option>
            ))}
          </select>
        </Field>

        <Field label="Priority">
          <select className="select" value={form.priority || "medium"} onChange={set("priority")}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
