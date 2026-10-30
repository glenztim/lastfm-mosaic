import { useColors } from "@/components/ColorsContext";
import { gradientSamples } from "@/lib/color";
import { GRANULARITY_UNIT } from "@/lib/settings";
import type { Granularity } from "@/lib/types";

interface Props {
  cap: number;
  granularity: Granularity;
}

/** The count gradient. Follows the sliders without lag (`legend.gradient`). */
export function Legend({ cap, granularity }: Props) {
  const { gradient } = useColors().legend;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="ui-label font-bold">Scrobbles</h3>
      <div className="flex items-center gap-2 text-xs tabular-nums">
        <span
          className="rule-thin h-4 w-4"
          style={{ background: gradient.zero }}
          title="No scrobbles"
        />
        <span>1</span>
        <span
          className="rule-thin h-4 w-40"
          style={{
            background: `linear-gradient(to right, ${gradientSamples(gradient.stops).join(", ")})`,
          }}
        />
        <span>
          {cap}+ per {GRANULARITY_UNIT[granularity]}
        </span>
      </div>
    </div>
  );
}
