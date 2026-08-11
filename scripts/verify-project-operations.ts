import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL ${message}`);
  console.log(`PASS ${message}`);
}

async function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "chernobog-project-ops-"));
  process.env.CHERNOBOG_DATA_DIR = tempRoot;

  const service = await import("../lib/modules/project-operations/service");
  const commands = await import(
    "../lib/modules/project-operations/commands/executeProjectOperationsCommand"
  );
  const parser = await import(
    "../lib/modules/project-operations/commands/parseProjectOperationsCommand"
  );
  const { runCommandPipeline } = await import(
    "../lib/chernobog/pipeline/runCommand"
  );
  const { getAllChernobogRoutes } = await import(
    "../lib/chernobog-ui/routeRegistry"
  );
  const { getAllChernobogModules } = await import(
    "../lib/chernobog-ui/moduleRegistry"
  );
  const { db, chernobogDatabasePath } = await import("../lib/chernobog/db");

  try {
    const seeded = service.getAllProjects();
    assert(seeded.length === 3, "first run seeds three real project workspaces");
    assert(
      seeded.some((project) => project.slug === "chernobog"),
      "Chernobog seed workspace exists",
    );

    const parsed = parser.parseProjectOperationsCommand(
      "add urgent task to Chernobog: verify project operations",
    );
    assert(parsed?.domain === "project", "explicit task command routes to project domain");
    assert(parsed?.confidenceLevel === "high", "project command has high confidence");

    const created = await commands.executeProjectOperationsCommand({
      kind: "project_task_add",
      projectQuery: "Chernobog",
      title: "Verify project operations",
      urgent: true,
    });
    assert(created.ok, "command creates project task");

    const urgent = service.getUrgentTasks();
    const createdTask = urgent.find(
      ({ card }) => card.title === "Verify project operations",
    );
    assert(createdTask, "created task appears in urgent queue");

    const completed = await commands.executeProjectOperationsCommand({
      kind: "project_task_complete",
      taskIdentifier: createdTask.card.id.slice(0, 8),
    });
    assert(completed.ok, "short task ID completes task through command layer");
    assert(
      service.findTaskByIdentifier(createdTask.card.id)?.card.column === "done",
      "completed task persists in done column",
    );

    const focus = await commands.executeProjectOperationsCommand({
      kind: "project_focus_set",
      projectQuery: "Chernobog",
      focus: "Verification focus",
    });
    assert(focus.ok, "command updates project focus");
    assert(
      service.findProjectByQuery("Chernobog")?.focus === "Verification focus",
      "updated project focus persists",
    );

    const pipeline = await runCommandPipeline(
      "project operations status",
      "project-operations-verification",
    );
    assert(pipeline.payload.route === "tools", "main command pipeline invokes project module");
    assert(
      pipeline.payload.reply.includes("Project Operations Status"),
      "main pipeline returns project status reply",
    );

    const routes = getAllChernobogRoutes();
    assert(
      routes.some((route) => route.id === "project-operations" && route.path === "/projects"),
      "route registry exposes Project Operations",
    );
    assert(
      routes.some((route) => route.id === "project-operations-workspace"),
      "route registry exposes project workspaces",
    );

    const modules = getAllChernobogModules();
    assert(
      modules.some((module) => module.id === "project-operations"),
      "module directory exposes Project Operations",
    );

    assert(fs.existsSync(chernobogDatabasePath), "project data uses chernobog.db");
    const table = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'project_operations_projects'",
      )
      .get() as { name?: string } | undefined;
    assert(table?.name === "project_operations_projects", "SQLite project table exists");

    const routeFiles = [
      "app/projects/page.tsx",
      "app/projects/[slug]/page.tsx",
      "app/projects/notes/page.tsx",
      "app/projects/activity/page.tsx",
    ];
    for (const relativePath of routeFiles) {
      assert(fs.existsSync(path.join(process.cwd(), relativePath)), `${relativePath} exists`);
    }
  } finally {
    db.close();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
