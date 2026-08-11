import Link from "next/link";

type MethodologyTooltipProps = Readonly<{
  label?: string;
  title: string;
  description: string;
  href?: string;
}>;

export function MethodologyTooltip({
  label = "Methodology",
  title,
  description,
  href,
}: MethodologyTooltipProps) {
  return (
    <details className="methodology-tooltip">
      <summary>
        <span>{label}</span>
        <span className="methodology-tooltip__icon" aria-hidden="true">
          i
        </span>
      </summary>
      <div className="methodology-tooltip__panel">
        <p className="methodology-tooltip__title">{title}</p>
        <p>{description}</p>
        {href ? <Link href={href}>Read full methodology →</Link> : null}
      </div>
    </details>
  );
}
