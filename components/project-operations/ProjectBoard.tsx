import {
  archiveTaskCardAction,
  createTaskCardAction,
  updateTaskCardAction,
} from "@/app/projects/actions";
import type {
  ProjectBoard as ProjectBoardModel,
  TaskColumnId,
  TaskPriority,
} from "@/lib/modules/project-operations";

import {
  MachinePanel,
  StatusPill,
  buttonClass,
  inputClass,
  quietButtonClass,
} from "./ui";

const columns: Array<{ id: TaskColumnId; label: string; signal: string }> = [
  { id: "backlog", label: "Backlog", signal: "Stored" },
  { id: "next", label: "Next", signal: "Queued" },
  { id: "doing", label: "Doing", signal: "Active" },
  { id: "done", label: "Done", signal: "Closed" },
];

const priorities: TaskPriority[] = ["Low", "Medium", "High", "Critical"];

function TaskCard({
  projectSlug,
  boardId,
  card,
}: {
  projectSlug: string;
  boardId: string;
  card: ProjectBoardModel["cards"][number];
}) {
  return (
    <article className="group/card relative border border-[#5d3214]/55 bg-[linear-gradient(135deg,#0b0704,#050302)] p-3 transition hover:border-[#8c4f21]/75">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#c9782f]/35 to-transparent" />
      <div className="flex items-start justify-between gap-2">
        <h5 className="text-[11px] font-semibold leading-5 text-[#efc18c]">
          {card.title}
        </h5>
        {card.urgent ? (
          <span className="shrink-0 border border-[#ff4a3d]/35 bg-[#ff4a3d]/10 px-1.5 py-0.5 text-[7px] uppercase tracking-[0.16em] text-[#ff9f96]">
            urgent
          </span>
        ) : null}
      </div>
      <p className="mt-2 line-clamp-3 text-[10px] leading-4 text-[#8f6a49]">
        {card.description}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusPill value={card.priority} />
        <span className="text-[8px] uppercase tracking-[0.14em] text-[#725036]">
          {card.due}
        </span>
      </div>
      <div className="mt-2 font-mono text-[8px] uppercase tracking-[0.1em] text-[#5f412b]">
        ID {card.id.slice(0, 8)}
      </div>

      <details className="mt-3 border-t border-[#5d3214]/45 pt-2">
        <summary className="cursor-pointer list-none text-[8px] uppercase tracking-[0.18em] text-[#8f5b2a] transition hover:text-[#d28a45] [&::-webkit-details-marker]:hidden">
          Configure task +
        </summary>
        <form action={updateTaskCardAction} className="mt-3 grid gap-2">
          <input type="hidden" name="slug" value={projectSlug} />
          <input type="hidden" name="boardId" value={boardId} />
          <input type="hidden" name="cardId" value={card.id} />
          <input className={inputClass} name="title" defaultValue={card.title} required />
          <textarea className={inputClass} name="description" defaultValue={card.description} rows={3} required />
          <select className={inputClass} name="priority" defaultValue={card.priority}>
            {priorities.map((priority) => <option key={priority}>{priority}</option>)}
          </select>
          <select className={inputClass} name="column" defaultValue={card.column}>
            {columns.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
          <input className={inputClass} name="due" defaultValue={card.due} required />
          <label className="flex items-center gap-2 text-[10px] text-[#9f7955]">
            <input type="checkbox" name="urgent" defaultChecked={card.urgent} /> Urgent
          </label>
          <button className={buttonClass} type="submit">Save task</button>
        </form>
        <form action={archiveTaskCardAction} className="mt-2">
          <input type="hidden" name="slug" value={projectSlug} />
          <input type="hidden" name="boardId" value={boardId} />
          <input type="hidden" name="cardId" value={card.id} />
          <button className={quietButtonClass} type="submit">Archive task</button>
        </form>
      </details>
    </article>
  );
}

export function ProjectBoard({
  projectSlug,
  board,
}: {
  projectSlug: string;
  board: ProjectBoardModel;
}) {
  const activeCards = board.cards.filter((card) => !card.archived);

  return (
    <MachinePanel className="overflow-visible">
      <div className="flex flex-col gap-3 border-b border-[#5d3214]/55 p-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-[#efc18c]">
              {board.name}
            </h3>
            <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#765237]">
              {activeCards.length} active cards
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-[10px] leading-5 text-[#8f6a49]">
            {board.description}
          </p>
        </div>

        <details className="group/new shrink-0 border border-[#7c451e]/70 bg-[#120904]/65 lg:w-[360px]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.2em] text-[#d99a54] [&::-webkit-details-marker]:hidden">
            <span>Issue new task</span>
            <span className="font-mono group-open:hidden">+</span>
            <span className="hidden font-mono group-open:inline">−</span>
          </summary>
          <form action={createTaskCardAction} className="grid gap-2 border-t border-[#5d3214]/55 p-3">
            <input type="hidden" name="slug" value={projectSlug} />
            <input type="hidden" name="boardId" value={board.id} />
            <input className={inputClass} name="title" placeholder="Task title" required />
            <textarea className={inputClass} name="description" placeholder="What does done look like?" rows={2} required />
            <div className="grid gap-2 sm:grid-cols-3">
              <select className={inputClass} name="priority" defaultValue="Medium">
                {priorities.map((priority) => <option key={priority}>{priority}</option>)}
              </select>
              <select className={inputClass} name="column" defaultValue="backlog">
                {columns.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
              </select>
              <input className={inputClass} name="due" defaultValue="Later" required />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-[10px] text-[#9f7955]">
                <input type="checkbox" name="urgent" /> Mark urgent
              </label>
              <button className={buttonClass} type="submit">Add task</button>
            </div>
          </form>
        </details>
      </div>

      <div className="grid gap-px bg-[#4f2b14]/45 sm:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => {
          const cards = activeCards.filter((card) => card.column === column.id);

          return (
            <section key={column.id} className="min-w-0 bg-[#050302] p-3">
              <div className="flex items-center justify-between border-b border-[#5d3214]/45 pb-2">
                <div>
                  <div className="text-[7px] uppercase tracking-[0.2em] text-[#765237]">
                    {column.signal}
                  </div>
                  <h4 className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#d6a56f]">
                    {column.label}
                  </h4>
                </div>
                <span className="border border-[#5d3214]/55 bg-black/30 px-2 py-1 font-mono text-[9px] text-[#9e7149]">
                  {String(cards.length).padStart(2, "0")}
                </span>
              </div>

              <div className="mt-3 space-y-2.5">
                {cards.map((card) => (
                  <TaskCard
                    key={card.id}
                    projectSlug={projectSlug}
                    boardId={board.id}
                    card={card}
                  />
                ))}

                {cards.length === 0 ? (
                  <div className="border border-dashed border-[#5d3214]/35 px-3 py-5 text-center">
                    <div className="text-[8px] uppercase tracking-[0.18em] text-[#5f412b]">
                      Channel clear
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </MachinePanel>
  );
}
