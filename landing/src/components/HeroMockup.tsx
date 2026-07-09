import { useState } from 'react';
import { HERO_TABS } from '../content/site';

export function HeroMockup() {
  const [activeId, setActiveId] = useState<string>(HERO_TABS[0].id);
  const active = HERO_TABS.find((tab) => tab.id === activeId) ?? HERO_TABS[0];

  return (
    <div className="mockup-shell">
      <div className="mockup-toolbar">
        <div className="mockup-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="mockup-tabs" role="tablist" aria-label="Vista del producto">
          {HERO_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={tab.id === activeId}
              className={`mockup-tab${tab.id === activeId ? ' is-active' : ''}`}
              onClick={() => setActiveId(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mockup-body">
        <img key={active.screenshot} src={active.screenshot} alt={active.title} loading="eager" />
      </div>
      <div className="mockup-caption">
        <strong>{active.title}</strong>
        <span>{active.caption}</span>
      </div>
    </div>
  );
}
