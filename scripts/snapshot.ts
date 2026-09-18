import { CmcApiError } from "@/server/cmc/error";
import { getSnapshotWorker } from "@/server/snapshots/worker";

const mode = parseMode(process.argv.slice(2));

try {
  const worker = getSnapshotWorker();
  const report =
    mode === "broad" ? await worker.runBroad() : await worker.runPriority();
  console.info(JSON.stringify({ event: "snapshot_run", ...report }));
  process.exit(report.status === "failure" ? 1 : 0);
} catch (error) {
  const safeError =
    error && typeof error === "object"
      ? (error as { name?: unknown; code?: unknown })
      : null;
  const schemaIssues =
    error instanceof CmcApiError && Array.isArray(error.details)
      ? error.details
          .map((issue: unknown) => {
            if (!issue || typeof issue !== "object") return "unknown";
            const candidate = issue as { code?: unknown; path?: unknown };
            const path = Array.isArray(candidate.path)
              ? candidate.path.join(".")
              : "unknown";
            return `${String(candidate.code ?? "unknown")}:${path}`;
          })
          .slice(0, 10)
      : [];
  console.error(
    JSON.stringify({
      event: "snapshot_run",
      mode,
      status: "failure",
      code: "SNAPSHOT_WORKER_FAILED",
      errorName: String(safeError?.name ?? "UnknownError"),
      errorCode: String(safeError?.code ?? "NO_CODE"),
      schemaIssues,
    }),
  );
  process.exit(1);
}

function parseMode(arguments_: string[]): "broad" | "priority" {
  const value = arguments_.find((argument) => argument.startsWith("--mode="));
  const mode = value?.slice("--mode=".length);
  if (mode === "broad" || mode === "priority") return mode;
  throw new Error("Snapshot mode must be broad or priority");
}
