import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { errMsg } from "../services/api";
import { Field, Icon } from "../components/ui";
import AuthSide from "../components/layout/AuthSide";

const DEMO = [
  { label: "Manager", email: "priya@gradefair.local" },
  { label: "Member", email: "ananya@gradefair.local" },
  { label: "Admin", email: "admin@gradefair.local" }
];

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return toast.error("Enter your email and password");
    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      nav(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
    } catch (err) {
      toast.error(errMsg(err, "Invalid email or password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <AuthSide />

      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <h2>Sign in</h2>
          <p>Welcome back. Enter your details to continue.</p>

          <div className="stack">
            <Field label="Email">
              <div className="input-with-icon">
                <Icon name="mail" />
                <input className="input" type="email" autoComplete="email" placeholder="you@college.edu" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
              </div>
            </Field>

            <Field label="Password">
              <div className="input-with-icon">
                <Icon name="lock" />
                <input className="input" type={show ? "text" : "password"} autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingRight: 64 }} />
                <button type="button" className="input-suffix-btn" onClick={() => setShow((s) => !s)}>
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </Field>

            <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
              {!loading && <Icon name="arrowRight" />}
            </button>
          </div>

          <p className="center mt-24 muted">
            New here? <Link to="/signup">Create an account</Link>
          </p>

          <div className="demo-box">
            <strong>Demo accounts</strong> (after running <code>npm run seed</code> in the backend). Password: <code>Password123</code>
            <div className="row">
              {DEMO.map((d) => (
                <button key={d.email} type="button" className="btn btn-sm btn-secondary" onClick={() => { setEmail(d.email); setPassword("Password123"); }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
