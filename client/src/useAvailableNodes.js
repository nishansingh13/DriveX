// client/src/useAvailableNodes.js
// Which nodes are available right now (from the public /api/health route).
// Refreshes every 5 seconds, and straight away when the Storage nodes page
// changes a node (it sends a "drivex:nodes" event).
import { useEffect, useState } from "react";
import { getHealth } from "./api/files";

export function announceNodeChange() {
  window.dispatchEvent(new Event("drivex:nodes"));
}

export default function useAvailableNodes() {
  const [available, setAvailable] = useState(null);

  useEffect(() => {
    const load = () => getHealth().then((h) => setAvailable(h.availableNodes)).catch(() => {});
    load();
    const timer = setInterval(load, 5000);
    window.addEventListener("drivex:nodes", load);
    return () => {
      clearInterval(timer);
      window.removeEventListener("drivex:nodes", load);
    };
  }, []);

  return available;
}
