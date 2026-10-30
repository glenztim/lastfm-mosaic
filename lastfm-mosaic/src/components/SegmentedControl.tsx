interface Option<T extends string | number> {
  value: T;
  label: string;
}

interface Props<T extends string | number> {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Squares sharing 2px borders (an ink frame with ink gaps); the selected one is inverted. */
export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex w-fit max-w-full flex-wrap gap-(--rule-thin) bg-ink p-(--rule-thin) text-[13px] font-medium"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`h-6 px-2.5 ${
              active
                ? "bg-ink text-paper"
                : "bg-paper text-ink decoration-2 underline-offset-4 hover:underline"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
