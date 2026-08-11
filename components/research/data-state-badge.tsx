import {
  dataStateDescriptors,
  type DataState,
} from "./presentation-types";

type DataStateBadgeProps = Readonly<{
  state: DataState;
  label?: string;
}>;

export function DataStateBadge({ state, label }: DataStateBadgeProps) {
  const descriptor = dataStateDescriptors[state];

  return (
    <span
      className="data-state-badge"
      data-state={state}
      title={descriptor.description}
    >
      <span className="data-state-badge__mark" aria-hidden="true" />
      {label ?? descriptor.label}
    </span>
  );
}
