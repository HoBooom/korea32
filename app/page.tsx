import Dashboard from "@/components/Dashboard";
import { getSnapshot } from "@/lib/snapshot";

// Recompute on each request; upstream API fetches are cached for 60s.
export const dynamic = "force-dynamic";

export default async function Home() {
  const snapshot = await getSnapshot();
  return <Dashboard initial={snapshot} />;
}
