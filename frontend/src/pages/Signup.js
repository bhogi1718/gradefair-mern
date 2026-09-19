import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { errMsg } from "../services/api";
import { Field, Icon } from "../components/ui";
import AuthSide from "../components/layout/AuthSide";

export default function Signup() {
  const nav = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", role: "member" });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password) return toast.error("Please fill in all fields");
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    if (form.password !== form.confirm) return toast.error("Passwords do not match");

    setLoading(true);
    try {
      const user = await register({ name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role });
      toast.success(`Account created. Welcome, ${user.name.split(" ")[0]}!`);
      nav("/dashboard", { replace: true });
    } catch (err) {
      toast.error(errMsg(err, "Sign up failed"));
    } finally {
      setLoading(false);
    }
  };

  const strength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : /[A-Z]/.test(form.password) && /\d/.test(form.password) && form.password.length >= 8 ? 3 : 2;

  return (
    <div className="auth">
      <AuthSide />

      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <h2>Create your account</h2>
          <p>Join your team on GradeFair.</p>

          <div className="stack">
            <Field label="Full name">
              <div className="input-with-icon">
                <Icon name="user" />
                <input className="input" placeholder="Ada Lovelace" value={form.name} onChange={set("name")} autoFocus autoComplete="name" />
              </div>
            </Field>

            <Field label="Email">
              <div className="input-with-icon">
                <Icon name="mail" />
                <input className="input" type="email" placeholder="you@college.edu" value={form.email} onChange={set("email")} autoComplete="email" />
              </div>
            </Field>

            <Field label="Password" hint={strength === 1 ? "Too short" : strength === 2 ? "Okay — add a capital letter and a number for a strong one" : strength === 3 ? "Strong password" : "At least 6 characters"}>
              <div className="input-with-icon">
                <Icon name="lock" />
                <input className="input" type={show ? "text" : "password"} value={form.password} onChange={set("password")} autoComplete="new-password" style={{ paddingRight: 64 }} />
                <button type="button" className="input-suffix-btn" onClick={() => setShow((s) => !s)}>
                  {show ? "Hide" : "Show"}
                </button>
              </div>
              <div className="progress thin" style={{ marginTop: 4 }}>
                <div className={`progress-fill ${strength === 1 ? "danger" : strength === 2 ? "warning" : "success"}`} style={{ width: `${(strength / 3) * 100}%` }} />
              </div>
            </Field>

            <Field label="Confirm password">
              <div className="input-with-icon">
                <Icon name="lock" />
                <input className="input" type={show ? "text" : "password"} value={form.confirm} onChange={set("confirm")} autoComplete="new-password" />
              </div>
            </Field>

            <Field label="I am a…">
              <div className="role-cards">
                <button type="button" className={`role-card ${form.role === "member" ? "active" : ""}`} onClick={() => setForm((f) => ({ ...f, role: "member" }))}>
                  <Icon name="user" />
                  <strong>Team member</strong>
                  <span>I complete tasks and rate teammates</span>
                </button>
                <button type="button" className={`role-card ${form.role === "manager" ? "active" : ""}`} onClick={() => setForm((f) => ({ ...f, role: "manager" }))}>
                  <Icon name="layers" />
                  <strong>Project manager</strong>
                  <span>I create projects and assign work</span>
                </button>
              </div>
            </Field>

            <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </div>

          <p className="center mt-24 muted">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
