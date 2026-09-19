import { useAuth } from "../context/AuthContext";
import ManagerDashboard from "./ManagerDashboard";
import MemberDashboard from "./MemberDashboard";

export default function Dashboard() {
  const { user } = useAuth();
  return user?.role === "manager" ? <ManagerDashboard /> : <MemberDashboard />;
}
