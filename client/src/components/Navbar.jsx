// client/src/components/Navbar.jsx
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { NODE_COLORS, NODE_IDS } from "../nodes";
import useAvailableNodes from "../useAvailableNodes";

// The logo is a 2×2 block of chunks in the four node colours.
export function Logo() {
  return (
    <div className="logo">
      <span className="logo-mark" aria-hidden="true">
        {NODE_IDS.map((id) => <i key={id} style={{ background: NODE_COLORS[id] }} />)}
      </span>
      DriveX
    </div>
  );
}

// One light per node: lit in the node's colour when available, hatched when not.
function NodeLights() {
  const available = useAvailableNodes();
  if (!available) return null;
  return (
    <div className="node-lights" title={`${available.length} of 4 nodes online`}>
      {NODE_IDS.map((id) => {
        const on = available.includes(id);
        return (
          <span key={id} className={on ? "light" : "light off"}>
            <i style={on ? { background: NODE_COLORS[id] } : undefined} />
            {id}
            <span className="sr-only">{on ? " online" : " offline"}</span>
          </span>
        );
      })}
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="navbar">
      <Logo />
      <nav>
        <NavLink to="/" end>My files</NavLink>
        {user.role === "admin" && <NavLink to="/nodes">Storage nodes</NavLink>}
      </nav>
      <NodeLights />
      <div className="navbar-user">
        <span>{user.email}</span>
        <button className="btn quiet" onClick={() => { logout(); navigate("/login"); }}>
          Log out
        </button>
      </div>
    </header>
  );
}
