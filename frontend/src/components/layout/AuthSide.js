import { Icon } from "../ui";

export default function AuthSide() {
  return (
    <div className="auth-side">
      <div className="row" style={{ gap: 12 }}>
        <div className="brand-mark">
          <Icon name="scale" size={18} />
        </div>
        <strong style={{ fontSize: 18 }}>GradeFair</strong>
      </div>

      <div>
        <h1>
          Fair credit for
          <br />
          real effort.
        </h1>
        <p>Track who did what in team projects, weigh contributions transparently, and let peer feedback shape the final picture.</p>

        <ul className="auth-features">
          <li>
            <div><Icon name="tasks" /></div>
            <div>
              <strong>Weighted tasks</strong>
              <span>Small, medium and large tasks earn different points when completed.</span>
            </div>
          </li>
          <li>
            <div><Icon name="clock" /></div>
            <div>
              <strong>Deadlines matter</strong>
              <span>On-time delivery earns a bonus; late work costs a little.</span>
            </div>
          </li>
          <li>
            <div><Icon name="star" /></div>
            <div>
              <strong>Peer feedback</strong>
              <span>Teammates rate each other so effort that isn't a "task" still counts.</span>
            </div>
          </li>
          <li>
            <div><Icon name="trophy" /></div>
            <div>
              <strong>Transparent leaderboard</strong>
              <span>Every score comes with a full breakdown — no black boxes.</span>
            </div>
          </li>
        </ul>
      </div>

      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Built for college project teams.</p>
    </div>
  );
}
