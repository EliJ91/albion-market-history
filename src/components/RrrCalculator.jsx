import { useMemo, useState } from 'react';
import { calculateScenario, LOCATION_PRESETS } from '../utils/resourceReturn';

const initialScenario = {
  location: 'hideoutSpecialized',
  zoneQuality: 1,
  powerLevel: 1,
  customBonus: 0,
  focus: false,
  dailyBonus: 0,
  extraBonus: 0,
};

function ScenarioEditor({ label, scenario, onChange }) {
  const result = useMemo(() => calculateScenario(scenario), [scenario]);
  const preset = LOCATION_PRESETS[scenario.location];
  const isHideout = preset.hideoutGeneral || preset.hideoutSpecialized;

  return (
    <section className="rrr-scenario">
      <div className="rrr-scenario-heading">
        <h2>{label}</h2>
        <strong className="has-tooltip" data-tooltip="The percentage of crafting materials expected to be returned.">{result.rrr.toFixed(1)}% RRR</strong>
      </div>

      <label className="has-tooltip" data-tooltip="The location preset that supplies the base production bonus.">
        Location / bonus type
        <select value={scenario.location} onChange={(event) => onChange({ location: event.target.value })}>
          {Object.entries(LOCATION_PRESETS).map(([value, option]) => (
            <option key={value} value={value}>{option.label}</option>
          ))}
        </select>
      </label>

      {preset.hideoutSpecialized && (
        <label className="has-tooltip" data-tooltip="Higher-quality zones increase specialized hideout crafting bonuses.">
          Zone quality
          <select value={scenario.zoneQuality} onChange={(event) => onChange({ zoneQuality: Number(event.target.value) })}>
            {[1, 2, 3, 4, 5, 6].map((quality) => <option key={quality} value={quality}>Quality {quality}</option>)}
          </select>
        </label>
      )}

      {isHideout && (
        <label className="has-tooltip" data-tooltip="Hideout power increases its general and specialized crafting bonuses.">
          Hideout power level
          <select value={scenario.powerLevel} onChange={(event) => onChange({ powerLevel: Number(event.target.value) })}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => <option key={level} value={level}>Level {level}</option>)}
          </select>
        </label>
      )}

      {scenario.location === 'custom' && (
        <label className="has-tooltip" data-tooltip="Enter a base production bonus instead of using a preset.">
          Base production bonus %
          <input min="0" step="0.01" type="number" value={scenario.customBonus} onChange={(event) => onChange({ customBonus: event.target.value })} />
        </label>
      )}

      <label className="has-tooltip" data-tooltip="A temporary daily activity bonus added to production bonus.">
        Daily production bonus
        <select value={scenario.dailyBonus} onChange={(event) => onChange({ dailyBonus: Number(event.target.value) })}>
          <option value="0">None</option>
          <option value="10">10%</option>
          <option value="20">20%</option>
        </select>
      </label>

      <label className="has-tooltip" data-tooltip="Any additional production bonus not covered by the other controls.">
        Other production bonus %
        <input min="0" step="0.01" type="number" value={scenario.extraBonus} onChange={(event) => onChange({ extraBonus: event.target.value })} />
      </label>

      <label className="checkbox-control has-tooltip" data-tooltip="Crafting focus adds 59 percentage points to production bonus.">
        <input checked={scenario.focus} type="checkbox" onChange={(event) => onChange({ focus: event.target.checked })} />
        Use focus (+59%)
      </label>

      <div className="rrr-result-breakdown">
        <span className="has-tooltip" data-tooltip="Production bonus supplied by the selected location, zone, and hideout power.">Base bonus <strong>{result.baseBonus.toFixed(2)}%</strong></span>
        <span className="has-tooltip" data-tooltip="Base bonus plus focus, daily bonus, and other bonus.">Total bonus <strong>{result.totalBonus.toFixed(2)}%</strong></span>
        <span className="has-tooltip" data-tooltip="Expected materials consumed after returns when starting with 100.">Resources used per 100 <strong>{(100 - result.rrr).toFixed(1)}</strong></span>
      </div>
    </section>
  );
}

export default function RrrCalculator({ onClose, standalone = false }) {
  const [scenarios, setScenarios] = useState([
    initialScenario,
    { ...initialScenario, zoneQuality: 6, powerLevel: 9, focus: true },
  ]);
  const results = scenarios.map(calculateScenario);
  const difference = Math.abs(results[0].rrr - results[1].rrr);

  function updateScenario(index, updates) {
    setScenarios((current) => current.map((scenario, scenarioIndex) => (
      scenarioIndex === index ? { ...scenario, ...updates } : scenario
    )));
  }

  return (
    <div className={standalone ? 'rrr-page' : 'rrr-modal-backdrop'} role={standalone ? undefined : 'presentation'} onMouseDown={(event) => {
      if (!standalone && event.target === event.currentTarget) onClose();
    }}>
      <article className="rrr-calculator" role={standalone ? undefined : 'dialog'} aria-modal={standalone ? undefined : 'true'} aria-labelledby="rrr-title">
        <header className="rrr-header">
          <div>
            <p className="eyebrow">Crafting comparison</p>
            <h1 id="rrr-title">Resource Return Rate Calculator</h1>
          </div>
          <div className="header-actions">
            {!standalone && <button className="icon-button" type="button" onClick={() => window.open(`${window.location.href.split('#')[0]}#rrr-calculator`, '_blank', 'noopener')}>Open in new page</button>}
            {!standalone && <button className="icon-button danger" type="button" onClick={onClose}>Close</button>}
            {standalone && <button className="icon-button" type="button" onClick={() => window.location.assign(window.location.href.split('#')[0])}>Market history</button>}
          </div>
        </header>

        <p className="rrr-intro">Compare production bonuses using Albion's formula: RRR = 1 - 1 / (1 + production bonus / 100).</p>

        <div className="rrr-comparison-summary">
          <span className="has-tooltip" data-tooltip="The gap between Scenario A and Scenario B resource return rates.">Difference</span>
          <strong className="has-tooltip" data-tooltip="How many percentage points separate the two return rates.">{difference.toFixed(1)} percentage points</strong>
          <span>{results[0].rrr === results[1].rrr ? 'Both scenarios return the same amount.' : `Scenario ${results[0].rrr > results[1].rrr ? 'A' : 'B'} returns more resources.`}</span>
        </div>

        <div className="rrr-scenarios">
          <ScenarioEditor label="Scenario A" scenario={scenarios[0]} onChange={(updates) => updateScenario(0, updates)} />
          <ScenarioEditor label="Scenario B" scenario={scenarios[1]} onChange={(updates) => updateScenario(1, updates)} />
        </div>
      </article>
    </div>
  );
}
