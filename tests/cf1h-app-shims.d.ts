declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

declare module "@/components/chernobog-ui/ChernobogShell" {
  import type { ReactNode } from "react";

  export function ChernobogShell(props: {
    currentArea: string;
    children: ReactNode;
  }): ReactNode;
}
