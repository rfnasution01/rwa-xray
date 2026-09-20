"use client";

import { AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";

import {
  formatDays,
  formatMoney,
  formatPercent,
} from "@/components/asset-detail/formatters";
import { SmallMetric } from "@/components/asset-detail/small-metric";
import { TechnicalTerm, type GlossaryTerm } from "@/components/technical-term";
import { calculateExitCapacity } from "@/domain/analysis/exit-capacity";
import { formatPlanningHorizon } from "@/lib/utils";

const positions = [10_000, 100_000, 500_000, 1_000_000];

export function CapacitySimulator({ volume24h }: { volume24h: number | null }) {
  const [position, setPosition] = useState(100_000);
  const [participation, setParticipation] = useState(0.05);
  const [haircut, setHaircut] = useState(0);
  const result = useMemo(
    () =>
      calculateExitCapacity({
        positionValue: position,
        volume24h,
        participationRate: participation,
        stressHaircut: haircut,
      }),
    [haircut, participation, position, volume24h],
  );

  return (
    <div className="mt-5 overflow-hidden border border-[#1a5557] bg-[#030f11] shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
      <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
        <div className="border-[#153b3d] bg-[#041416] p-5 sm:p-6 lg:border-r">
          <label className="input-label" htmlFor="position-value">
            Position value · USD
          </label>
          <input
            id="position-value"
            className="control-input mt-2"
            type="number"
            min="1"
            value={position}
            onChange={(event) => {
              const value = event.currentTarget.valueAsNumber;
              if (Number.isFinite(value) && value > 0) setPosition(value);
            }}
          />
          <div className="mt-2 grid grid-cols-4 gap-2">
            {positions.map((value) => (
              <button
                key={value}
                className={
                  position === value
                    ? "preset-button preset-button-active"
                    : "preset-button"
                }
                type="button"
                onClick={() => setPosition(value)}
              >
                {formatMoney(value)}
              </button>
            ))}
          </div>
          <RangeControl
            id="participation-rate"
            term="volumeParticipation"
            value={participation * 100}
            min={0.1}
            max={20}
            step={0.1}
            onChange={(value) => setParticipation(value / 100)}
          />
          <RangeControl
            id="stress-haircut"
            term="stressHaircut"
            value={haircut * 100}
            min={0}
            max={90}
            step={1}
            onChange={(value) => setHaircut(value / 100)}
          />
        </div>
        <div className="bg-[#030e10] p-5 sm:p-7">
          {result.status === "available" ? (
            <>
              <p className="fx-kicker">Estimated capacity</p>
              <div className="mt-4 flex items-end gap-3">
                <strong className="fx-result-value text-5xl font-medium tracking-[-0.05em] tabular-nums">
                  {formatDays(result.estimatedExitDays)}
                </strong>
                <span className="pb-1 font-mono text-[10px] tracking-wider text-[#628789] uppercase">
                  days
                </span>
              </div>
              <div className="mt-4 inline-flex flex-wrap items-center gap-2 border border-[#1c5557] bg-[#061719] px-3 py-2">
                <span className="font-mono text-[9px] tracking-[0.08em] text-[#6c9293] uppercase">
                  <TechnicalTerm term="planningHorizon" />
                </span>
                <strong className="font-mono text-xs text-[#69ebe5]">
                  {formatPlanningHorizon(result.planningHorizon)}
                </strong>
              </div>
              <dl className="mt-6 grid gap-3 sm:grid-cols-3">
                <SmallMetric
                  term="effectiveVolume"
                  value={formatMoney(result.effectiveVolume)}
                />
                <SmallMetric
                  term="dailyExitCapacity"
                  value={formatMoney(result.dailyCapacity)}
                />
                <SmallMetric
                  term="positionToVolume"
                  value={formatPercent(result.positionToVolumeRatio)}
                />
              </dl>
            </>
          ) : (
            <div className="grid min-h-48 place-items-center text-center">
              <div>
                <AlertTriangle className="mx-auto size-6 text-amber-500" />
                <h3 className="mt-3 font-semibold">No observed capacity</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Aggregate volume is missing or zero.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RangeControl(props: {
  id: string;
  term: GlossaryTerm;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange(value: number): void;
}) {
  return (
    <label className="mt-5 block" htmlFor={props.id}>
      <span className="flex justify-between text-xs font-semibold">
        <TechnicalTerm term={props.term} />
        <output>{formatPercent(props.value / 100)}</output>
      </span>
      <input
        id={props.id}
        className="fx-range mt-3 w-full"
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(event) => props.onChange(event.currentTarget.valueAsNumber)}
      />
    </label>
  );
}
