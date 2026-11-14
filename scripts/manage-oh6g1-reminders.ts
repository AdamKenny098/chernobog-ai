/** Explicit local-only reminder management. This is NOT an HTTP write API. */
import { liveReminderStore } from "../packages/personal-assistance/src/reminders/store";
import type { ReminderPriority } from "../packages/personal-assistance/src/reminders/foundation";

function options(args: string[]): Record<string, string> {
  if (args.length % 2 !== 0) throw new Error("Options must use --name value pairs.");
  const opts: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!/^--[a-zA-Z]+$/u.test(args[i]) || Object.hasOwn(opts, args[i].slice(2))) {
      throw new Error("Invalid or duplicate option.");
    }
    opts[args[i].slice(2)] = args[i + 1];
  }
  return opts;
}

async function main(): Promise<void> {
  const [action, ...rest] = process.argv.slice(2);
  if (!action || !["add", "cancel", "list"].includes(action)) {
    throw new Error("Usage: add --key KEY --title TITLE --dueAt ISO --priority important | cancel --id ID | list");
  }
  const opts = options(rest);
  const expected = action === "add"
    ? ["key", "title", "dueAt", "priority"]
    : action === "cancel" ? ["id"] : [];
  if (Object.keys(opts).some((key) => !expected.includes(key))) {
    throw new Error("Unknown option for this command.");
  }
  if (action === "add" && (!opts.key || !opts.title || !opts.dueAt)) {
    throw new Error("add requires --key --title --dueAt (ISO instant with offset)");
  }
  if (action === "cancel" && !opts.id) throw new Error("cancel requires --id");
  const store = await liveReminderStore();
  if (action === "add") {
    const result = store.create({
      key: opts.key, title: opts.title, dueAt: opts.dueAt,
      priority: (opts.priority ?? "normal") as ReminderPriority,
    });
    console.log(JSON.stringify(result, null, 2));
  } else if (action === "cancel") {
    console.log(JSON.stringify({ reminder: store.cancel(opts.id) }, null, 2));
  } else {
    console.log(JSON.stringify({ reminders: store.list() }, null, 2));
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Reminder command failed.");
  process.exitCode = 1;
});
