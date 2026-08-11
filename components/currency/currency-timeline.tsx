import type { CurrencyDetail } from "../../lib/data/currency-detail";
import { formatHistoricalDate } from "../../lib/data/currency-detail";

export function CurrencyTimeline({
  events,
}: Readonly<{ events: CurrencyDetail["timeline"] }>) {
  return (
    <ol className="currency-timeline">
      {events.map((event, index) => (
        <li key={event.key}>
          <div className="currency-timeline__index" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </div>
          <div className="currency-timeline__event">
            <header>
              <div>
                <p>{event.title}</p>
                <time className="metric-numerals">
                  {formatHistoricalDate(event.date)}
                </time>
              </div>
              <span>{event.date.precision} precision</span>
            </header>
            <p>{event.statement}</p>
            {event.ambiguity !== undefined ? (
              <p className="currency-timeline__ambiguity">
                <strong>Boundary:</strong> {event.ambiguity}
              </p>
            ) : null}
            <footer aria-label={`Sources for ${event.title}`}>
              {event.sources.map((source) => (
                <a
                  key={source.key}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.publisher} ↗
                </a>
              ))}
            </footer>
          </div>
        </li>
      ))}
    </ol>
  );
}
