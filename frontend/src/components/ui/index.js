import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icons";
import { initials } from "../../utils/format";
import useClickOutside from "../../hooks/useClickOutside";

export { Icon };

/* ------------------------------------------------------------------ Avatar */
export function Avatar({ name = "", hue = 220, size = 36, className = "", title }) {
  return (
    <span
      className={`avatar ${className}`}
      title={title ?? name}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.38)),
        background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 45%))`
      }}
    >
      {initials(name) || "?"}
    </span>
  );
}

export function AvatarGroup({ users = [], max = 4, size = 28 }) {
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;
  return (
    <div className="avatar-group">
      {shown.map((u) => (
        <Avatar key={u._id} name={u.name} hue={u.avatarColor} size={size} />
      ))}
      {rest > 0 && (
        <span className="avatar avatar-more" style={{ width: size, height: size }} title={`${rest} more`}>
          +{rest}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- Badge */
export function Badge({ tone = "neutral", dot = false, icon, children, className = "", style }) {
  return (
    <span className={`badge badge-${tone} ${dot ? "badge-dot" : ""} ${className}`} style={style}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- StatCard */
export function StatCard({ label, value, hint, icon, tone = "primary" }) {
  return (
    <div className="card stat">
      <div className={`stat-icon ${tone}`}>
        <Icon name={icon} size={22} />
      </div>
      <div className="grow">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {hint && <div className="stat-hint">{hint}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- ProgressBar */
export function ProgressBar({ value = 0, tone, size = "", label, right }) {
  const v = Math.max(0, Math.min(100, value));
  const autoTone = tone || (v >= 100 ? "success" : v >= 60 ? "" : v >= 30 ? "warning" : "danger");
  return (
    <div>
      {(label || right) && (
        <div className="progress-row">
          <span>{label}</span>
          <span>{right ?? `${v}%`}</span>
        </div>
      )}
      <div className={`progress ${size}`}>
        <div className={`progress-fill ${autoTone}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

export function Ring({ value = 0, size = 64, stroke = 6, color, children }) {
  return (
    <div className="ring" style={{ "--size": `${size}px`, "--stroke": `${stroke}px`, "--pct": value, "--ring-color": color }}>
      <span>{children ?? `${value}%`}</span>
    </div>
  );
}

/* ------------------------------------------------------------- EmptyState */
export function EmptyState({ icon = "inbox", title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={26} />
      </div>
      {title && <h4>{title}</h4>}
      {text && <p>{text}</p>}
      {action && <div className="mt-16">{action}</div>}
    </div>
  );
}

/* --------------------------------------------------------------- Skeleton */
export function Skeleton({ h = 16, w = "100%", r = 8, style, className = "" }) {
  return <div className={`skeleton ${className}`} style={{ height: h, width: w, borderRadius: r, ...style }} />;
}

export function SkeletonList({ rows = 4 }) {
  return (
    <div className="stack" style={{ padding: 20 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="row">
          <Skeleton h={36} w={36} r={18} />
          <div className="grow stack" style={{ gap: 6 }}>
            <Skeleton h={14} w="60%" />
            <Skeleton h={11} w="35%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 4 }) {
  return (
    <div className="grid grid-stats">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card stat">
          <Skeleton h={46} w={46} r={14} />
          <div className="grow stack" style={{ gap: 8 }}>
            <Skeleton h={12} w="50%" />
            <Skeleton h={24} w="35%" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- PageHeader */
export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="page-header">
      <div>
        {back}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}

/* --------------------------------------------------------------------- Tabs */
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={active === t.id} className={`tab ${active === t.id ? "active" : ""}`} onClick={() => onChange(t.id)}>
          {t.icon && <Icon name={t.icon} size={15} />}
          {t.label}
          {t.count !== undefined && <span className="count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- Segmented */
export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? "active" : ""} onClick={() => onChange(o.value)} type="button">
          {o.icon && <Icon name={o.icon} size={14} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------- Modal */
export function Modal({ open, onClose, title, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------ ConfirmDialog */
export function ConfirmDialog({ open, onClose, onConfirm, title = "Are you sure?", text, confirmText = "Delete", danger = true, loading = false }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm} disabled={loading}>
            {loading ? "Working…" : confirmText}
          </button>
        </>
      }
    >
      <p className="muted">{text}</p>
    </Modal>
  );
}

/* ------------------------------------------------------------------- Field */
export function Field({ label, hint, children, className = "" }) {
  return (
    <div className={`field ${className}`}>
      {label && <label>{label}</label>}
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

/* ------------------------------------------------------------- StarRating */
export function StarRating({ value = 0, onChange, size = "", readonly = false }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className={`stars ${size} ${readonly ? "readonly" : ""}`} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={n <= shown ? "on" : ""}
          disabled={readonly}
          onMouseEnter={() => !readonly && setHover(n)}
          onClick={() => !readonly && onChange?.(n)}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          <Icon name="star" fill={n <= shown ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- Dropdown */
export function Dropdown({ trigger, children, align = "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false), open);
  return (
    <div className="menu-wrap" ref={ref}>
      <span onClick={() => setOpen((o) => !o)}>{trigger}</span>
      {open && (
        <div className="menu" style={align === "left" ? { left: 0, right: "auto" } : undefined} onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Callout */
export function Callout({ tone = "info", icon = "info", children }) {
  return (
    <div className={`callout ${tone}`}>
      <Icon name={icon} />
      <div>{children}</div>
    </div>
  );
}

/* --------------------------------------------------------- ScoreBreakdown */
export function ScoreBreakdown({ row, showLegend = false }) {
  const parts = [
    { key: "task", v: row.taskPoints || 0, cls: "bd-task", label: "Task points" },
    { key: "time", v: Math.max(0, row.timeliness || 0), cls: "bd-time", label: "On-time bonus" },
    { key: "fb", v: row.feedback || 0, cls: "bd-feedback", label: "Peer feedback" },
    { key: "act", v: row.activity || 0, cls: "bd-activity", label: "Activity" }
  ];
  const total = parts.reduce((s, p) => s + p.v, 0) || 1;
  return (
    <div>
      <div className="breakdown" title={parts.map((p) => `${p.label}: ${p.v}`).join(" · ")}>
        {parts.map((p) => (
          <div key={p.key} className={p.cls} style={{ width: `${(p.v / total) * 100}%` }} />
        ))}
      </div>
      {showLegend && (
        <div className="legend mt-8">
          {parts.map((p) => (
            <span key={p.key}>
              <i className={p.cls} /> {p.label}: <b>{p.v}</b>
            </span>
          ))}
          {row.timeliness < 0 && (
            <span>
              <i className="bd-neg" /> Late penalty: <b>{row.timeliness}</b>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- RankBadge */
export function RankBadge({ rank }) {
  return <span className={`rank r${rank <= 3 ? rank : ""}`}>{rank}</span>;
}
