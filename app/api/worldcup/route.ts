import { getSnapshot } from "@/lib/snapshot";

// Always recompute on request; upstream fetches are themselves cached 60s.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getSnapshot();
    return Response.json(snapshot);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 502 },
    );
  }
}
