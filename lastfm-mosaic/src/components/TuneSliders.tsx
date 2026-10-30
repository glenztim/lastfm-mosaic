import { TUNE_RANGES, isNoTune, type Tune } from "@/lib/color";

interface Props {
  tune: Tune;
  onChange: (change: Partial<Tune>) => void;
  onReset: () => void;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}

function Slider({ label, value, min, max, step, display, onChange }: SliderProps) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="flex items-baseline justify-between gap-2">
        <span className="ui-label-sm text-ink-dim">{label}</span>
        <span className="text-xs tabular-nums">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        // Round away float noise from fractional steps (0.07000000000000001).
        onChange={(e) => onChange(Math.round(Number(e.target.value) * 100) / 100)}
        className="w-full"
      />
    </label>
  );
}

const signed = (n: number, digits = 0) => `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;

/** Hue shift, saturation and brightness sliders (see `tuneColor`) with a reset button. */
export function TuneSliders({ tune, onChange, onReset }: Props) {
  const { hue, sat, bright } = TUNE_RANGES;
  return (
    <div className="flex flex-col gap-2.5">
      <Slider
        label="Hue"
        {...hue}
        value={tune.hue}
        display={`${signed(tune.hue)}°`}
        onChange={(v) => onChange({ hue: v })}
      />
      <Slider
        label="Saturation"
        {...sat}
        value={tune.sat}
        display={`${tune.sat} %`}
        onChange={(v) => onChange({ sat: v })}
      />
      <Slider
        label="Brightness"
        {...bright}
        value={tune.bright}
        display={signed(tune.bright, 2)}
        onChange={(v) => onChange({ bright: v })}
      />
      <button
        type="button"
        onClick={onReset}
        disabled={isNoTune(tune)}
        className="ui-label-sm rule-thin h-7 w-fit px-3 enabled:hover:bg-ink enabled:hover:text-paper disabled:opacity-50"
      >
        Reset
      </button>
    </div>
  );
}
