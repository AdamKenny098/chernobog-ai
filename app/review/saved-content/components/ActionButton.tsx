import styles from "../saved-content-dashboard.module.css";

type ActionButtonProps = {
  request: unknown;
  children: React.ReactNode;
  runAction: (request: unknown) => Promise<void>;
  danger?: boolean;
};

export default function ActionButton({
  request,
  children,
  runAction,
  danger,
}: ActionButtonProps) {
  return (
    <button
      className={danger ? styles.dangerButton : styles.smallButton}
      onClick={() => {
        void runAction(request);
      }}
      type="button"
    >
      {children}
    </button>
  );
}
