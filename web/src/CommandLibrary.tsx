import { useState, type ReactNode } from "react";
import { commands, type CommandCategory } from "../../src/commands.ts";
import type { Language } from "../../src/types.ts";
import { InfoPopover } from "./InfoPopover.tsx";

const CATEGORY_ORDER: CommandCategory[] = ["speed", "direction", "command", "telemetry"];

const CATEGORY_ICON: Record<CommandCategory, ReactNode> = {
  speed: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 16a8 8 0 1 1 16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 16 16 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.4" fill="currentColor" />
    </svg>
  ),
  direction: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 12h6m0 0-2.5-2.5M9 12l-2.5 2.5M21 12h-6m0 0 2.5-2.5M15 12l2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  command: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M7.5 6.5a7 7 0 1 0 9 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  telemetry: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 19V11m6.5 8V5m6.5 14v-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

interface CommandLibraryProps {
  className?: string;
  title: string;
  hint: string;
  infoLabel: string;
  categoryLabel: Record<CommandCategory, string>;
  language: Language;
}

export function CommandLibrary({ className, title, hint, infoLabel, categoryLabel, language }: CommandLibraryProps) {
  const [activeCategory, setActiveCategory] = useState<CommandCategory | null>(null);
  const [expandedCommand, setExpandedCommand] = useState<string | null>(null);

  function selectCategory(category: CommandCategory) {
    setActiveCategory((current) => (current === category ? null : category));
    setExpandedCommand(null);
  }

  return (
    <aside className={`panel ${className ?? ""}`}>
      <div className="card__header">
        <h2 className="panel__title">{title}</h2>
        <InfoPopover text={hint} label={infoLabel} />
      </div>

      <div className="category-grid" role="group" aria-label={title}>
        {CATEGORY_ORDER.map((category) => (
          <button
            key={category}
            type="button"
            className={`category-button ${activeCategory === category ? "category-button--active" : ""}`}
            aria-pressed={activeCategory === category}
            onClick={() => selectCategory(category)}
          >
            <span className="category-button__icon">{CATEGORY_ICON[category]}</span>
            <span className="category-button__label">{categoryLabel[category]}</span>
          </button>
        ))}
      </div>

      {activeCategory && (
        <div className="command-group">
          {commands
            .filter((command) => command.category === activeCategory)
            .map((command) => {
              const isOpen = expandedCommand === command.name;
              const phrases = command.displayPhrases?.[language] ?? command.phrases[language];
              const numberNote = command.numberNote?.[language];
              return (
                <div className="command-item" key={command.name}>
                  <button
                    type="button"
                    className="command-item__toggle"
                    aria-expanded={isOpen}
                    onClick={() => setExpandedCommand(isOpen ? null : command.name)}
                  >
                    <span>{phrases[0]}</span>
                    <span className={`command-item__chevron ${isOpen ? "command-item__chevron--open" : ""}`}>
                      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M6 9l6 6 6-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                  {isOpen && (
                    <>
                      <ul className="command-item__phrases">
                        {phrases.map((phrase) => (
                          <li key={phrase}>{phrase}</li>
                        ))}
                      </ul>
                      {numberNote && <p className="command-item__number-note">{numberNote}</p>}
                    </>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </aside>
  );
}
