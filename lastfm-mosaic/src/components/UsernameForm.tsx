"use client";

import type { FormEvent } from "react";
import type { TimeFrame } from "@/lib/types";

/** Fetch-time inputs only. Display settings (view, granularity, zoom, ...) live in the controls card. */
export interface FormValues {
  user: string;
  timeFrame: TimeFrame;
}

interface Props {
  /** Controlled by the page, so a restored session can prefill the form. */
  values: FormValues;
  onChange: (values: FormValues) => void;
  disabled: boolean;
  onSubmit: (values: FormValues) => void;
  onClearCache: () => void;
}

const field = "rule-thin h-9 bg-paper px-3 text-sm text-ink";
const button = "rule-thin h-9 whitespace-nowrap px-4 text-sm font-medium disabled:border-ink-dim disabled:text-ink-dim";

export function UsernameForm({ values, onChange, disabled, onSubmit, onClearCache }: Props) {
  const { user, timeFrame } = values;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (user.trim()) onSubmit({ user: user.trim(), timeFrame });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        <span className="ui-label-sm">Last.fm username</span>
        <input
          className={field}
          value={user}
          onChange={(e) => onChange({ ...values, user: e.target.value })}
          required
          autoFocus
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="ui-label-sm">Time frame</span>
        <select
          className={field}
          value={timeFrame}
          onChange={(e) => onChange({ ...values, timeFrame: e.target.value as TimeFrame })}
        >
          <option value="6months">Last 6 months</option>
          <option value="1year">Last year</option>
          <option value="all">Entire history</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={disabled}
        className={`${button} bg-ink text-paper enabled:hover:bg-paper enabled:hover:text-ink disabled:bg-ink-dim disabled:text-paper`}
      >
        Show mosaic
      </button>
      <button
        type="button"
        onClick={onClearCache}
        disabled={disabled}
        className={`${button} enabled:hover:bg-ink enabled:hover:text-paper`}
      >
        Clear cached data
      </button>
    </form>
  );
}
