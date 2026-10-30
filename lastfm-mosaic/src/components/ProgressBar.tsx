interface Props {
  done: number;
  total: number;
}

export function ProgressBar({ done, total }: Props) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  return (
    <div className="flex flex-col gap-2" role="status">
      <div className="rule-thin h-4 w-full max-w-md bg-paper">
        <div className="h-full bg-ink transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-sm tabular-nums text-ink-dim">
        {total > 0 ? `Fetched ${done} / ${total} pages` : "Contacting Last.fm…"}
      </p>
    </div>
  );
}
