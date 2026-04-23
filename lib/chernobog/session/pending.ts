export type PendingState =
  | "none"
  | "processing"
  | "awaiting_file_selection"
  | "awaiting_confirmation"
  | "awaiting_clarification";

export function normalizePendingState(value: string | null | undefined): PendingState {
  switch (value) {
    case "processing":
    case "awaiting_file_selection":
    case "awaiting_confirmation":
    case "awaiting_clarification":
      return value;
    case "none":
    default:
      return "none";
  }
}