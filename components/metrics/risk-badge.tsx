import type { RiskLevel } from "../research/presentation-types";

type RiskBadgeProps = Readonly<{
  level: RiskLevel;
  label?: string;
}>;

const riskLabels: Record<RiskLevel, string> = {
  low: "Low risk",
  moderate: "Moderate risk",
  high: "High risk",
  extreme: "Extreme risk",
  unavailable: "Risk unavailable",
};

const riskMarks: Record<RiskLevel, string> = {
  low: "○",
  moderate: "◇",
  high: "△",
  extreme: "!",
  unavailable: "—",
};

export function RiskBadge({ level, label }: RiskBadgeProps) {
  return (
    <span className="risk-badge" data-risk={level}>
      <span className="risk-badge__mark" aria-hidden="true">
        {riskMarks[level]}
      </span>
      {label ?? riskLabels[level]}
    </span>
  );
}
