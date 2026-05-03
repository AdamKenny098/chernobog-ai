type PresenceCommandStripProps = {
    message: string;
  };
  
  export default function PresenceCommandStrip({
    message,
  }: PresenceCommandStripProps) {
    return (
      <div className="mt-8 min-w-[460px] border border-red-950/80 bg-black/35 px-8 py-4 text-center text-sm tracking-[0.18em] text-zinc-300 shadow-[0_0_18px_rgba(255,20,10,0.18)]">
        {message}
      </div>
    );
  }