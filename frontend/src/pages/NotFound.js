import { Link } from "react-router-dom";
import { EmptyState, Icon } from "../components/ui";

export default function NotFound() {
  return (
    <div className="card" style={{ maxWidth: 520, margin: "40px auto" }}>
      <EmptyState
        icon="search"
        title="Page not found"
        text="The page you're looking for doesn't exist or has moved."
        action={<Link to="/" className="btn btn-primary"><Icon name="arrowLeft" /> Go home</Link>}
      />
    </div>
  );
}
