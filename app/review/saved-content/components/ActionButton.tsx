"use client";

import type { CSSProperties, ReactNode } from "react";

type CommonActionButtonProps = {
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
};

type CommandActionButtonProps = CommonActionButtonProps & {
  command: string;
  request?: never;
  runAction: (command: string) => Promise<void>;
};

type RequestActionButtonProps = CommonActionButtonProps & {
  command?: never;
  request: unknown;
  runAction: (request: unknown) => Promise<void>;
};

type ActionButtonProps = CommandActionButtonProps | RequestActionButtonProps;

export default function ActionButton(props: ActionButtonProps) {
  async function handleClick() {
    if ("command" in props && typeof props.command === "string") {
      await props.runAction(props.command);
      return;
    }

    await props.runAction(props.request);
  }

  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={() => {
        void handleClick();
      }}
      style={{
        ...styles.button,
        ...(props.danger ? styles.dangerButton : {}),
        ...(props.disabled ? styles.disabledButton : {}),
      }}
    >
      {props.children}
    </button>
  );
}

const styles: Record<string, CSSProperties> = {
  button: {
    border: "1px solid #26343D",
    background: "#101820",
    color: "#D8E1E8",
    borderRadius: "8px",
    padding: "8px 10px",
    cursor: "pointer",
  },
  dangerButton: {
    border: "1px solid #5A2730",
    background: "#231014",
    color: "#FFD6DC",
  },
  disabledButton: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
};