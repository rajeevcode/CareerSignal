import { createFileRoute } from "@tanstack/react-router";
import { runHealthChecks } from "@/lib/health.functions";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const report = await runHealthChecks();
        return new Response(JSON.stringify(report, null, 2), {
          status: report.ok ? 200 : 503,
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
