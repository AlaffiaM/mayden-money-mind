// Logout button — asks for confirmation before clearing the session.
// Used in the subscriber header and the admin sidebar.
import { useAuth } from "../../context/AuthContext";

export default function LogoutButton({ className, children, ariaLabel }) {
  const { logout } = useAuth();

  const handleClick = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      logout();
    }
  };

  return (
    <button onClick={handleClick} className={className} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
