// client/src/pages/AuthLayout.jsx
// Shared layout for Login and Register (Fig 6.1, 6.2). The left side shows
// an 8 MB file being stored: its 8 chunks drop into the four node bays,
// first copies solid and second copies outlined (Fig 4.2).
import { Logo } from "../components/Navbar";
import { NODE_COLORS, NODE_IDS } from "../nodes";

export default function AuthLayout({ children }) {
  return (
    <div className="auth">
      <section className="auth-intro">
        <Logo />
        <h1>Every file, split into chunks and stored twice</h1>
        <p>
          DriveX cuts each upload into 1 MB chunks and keeps two copies of every
          chunk on different storage nodes. Every read is checked against a SHA-256
          hash, so a lost node or a damaged copy never costs you a file.
        </p>
        <figure className="intro-bays">
          {NODE_IDS.map((id, n) => (
            <div key={id} className="intro-bay">
              <span style={{ color: NODE_COLORS[id] }}>{id}</span>
              <div>
                {[0, 1, 2, 3, 4, 5, 6, 7]
                  .filter((i) => i % 4 === n || (i + 1) % 4 === n)
                  .map((i) => {
                    const first = i % 4 === n;
                    return (
                      <i
                        key={i}
                        className="drop"
                        style={{
                          animationDelay: `${i * 110 + (first ? 0 : 60)}ms`,
                          ...(first
                            ? { background: NODE_COLORS[id], color: "#fff" }
                            : { boxShadow: `inset 0 0 0 2px ${NODE_COLORS[id]}`, color: NODE_COLORS[id] }),
                        }}
                      >
                        C{i + 1}
                      </i>
                    );
                  })}
              </div>
            </div>
          ))}
          <figcaption>An 8 MB file: chunk i goes to node (i mod 4) + 1 and the next node.</figcaption>
        </figure>
      </section>
      <section className="auth-form">{children}</section>
    </div>
  );
}
