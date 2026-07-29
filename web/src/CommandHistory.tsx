import { useEffect, useState } from "react";
import { InfoPopover } from "./InfoPopover.tsx";

export interface HistoryEntry {
  id: string;
  time: string;
  transcript: string;
  intentName: string;
}

const PAGE_SIZE = 5;

interface CommandHistoryProps {
  className?: string;
  title: string;
  info: string;
  infoLabel: string;
  emptyLabel: string;
  unknownLabel: string;
  entries: HistoryEntry[];
}

export function CommandHistory({ className, title, info, infoLabel, emptyLabel, unknownLabel, entries }: CommandHistoryProps) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const newestId = entries[0]?.id;

  // A freshly recognized command always jumps back to the newest page,
  // rather than leaving the user stranded on an older one.
  useEffect(() => setPage(0), [newestId]);

  const visibleEntries = entries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <aside className={`panel ${className ?? ""}`}>
      <div className="card__header">
        <h2 className="panel__title">{title}</h2>
        <InfoPopover text={info} label={infoLabel} />
      </div>
      {entries.length === 0 ? (
        <p className="card__placeholder">{emptyLabel}</p>
      ) : (
        <>
          <ul className="history-list">
            {visibleEntries.map((entry) => {
              const isUnknown = entry.intentName === "unknown";
              return (
                <li className={`history-item ${isUnknown ? "history-item--unknown" : ""}`} key={entry.id}>
                  <div className="history-item__row">
                    <span className="history-item__intent">{isUnknown ? unknownLabel : entry.intentName}</span>
                    <span className="history-item__time">{entry.time}</span>
                  </div>
                  <p className="history-item__transcript">"{entry.transcript}"</p>
                </li>
              );
            })}
          </ul>

          {pageCount > 1 && (
            <div className="pagination">
              <button
                type="button"
                className="pagination__btn"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                aria-label="Previous page"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <span className="pagination__label">
                {page + 1} / {pageCount}
              </span>
              <button
                type="button"
                className="pagination__btn"
                disabled={page >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                aria-label="Next page"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
