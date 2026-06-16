import { useMemo, useState } from 'react';
import { calculateScenario, LOCATION_PRESETS } from '../utils/resourceReturn';

export const initialScenario = {
  location: 'hideoutSpecialized',
  zoneQuality: 1,
  powerLevel: 1,
  customBonus: 0,
  focus: false,
  dailyBonus: 0,
};

export function ScenarioEditor({ label, scenario, onChange, onUseRrr }) {
  const result = useMemo(() => calculateScenario(scenario), [scenario]);
  const preset = LOCATION_PRESETS[scenario.location];
  const isHideout = preset.hideoutGeneral || preset.hideoutSpecialized;

  return (
    <section className="rrr-scenario">
      <div className="rrr-scenario-heading">
        <h2>{label}</h2>
        {onUseRrr ? (
          <button
            className="rrr-use-button has-tooltip"
            data-tooltip="Use this calculated RRR in the crafting planner."
            type="button"
            onClick={() => onUseRrr(result.rrr)}
          >
            Use {result.rrr.toFixed(1)}% RRR
          </button>
        ) : (
          <strong className="has-tooltip" data-tooltip="RRR is the share of normal materials you expect back after crafting.">{result.rrr.toFixed(1)}% RRR</strong>
        )}
      </div>

      <label className="has-tooltip" data-tooltip="Pick where you craft. This sets the starting production bonus.">
        Location / bonus type
        <select value={scenario.location} onChange={(event) => onChange({ location: event.target.value })}>
          {Object.entries(LOCATION_PRESETS).map(([value, option]) => (
            <option key={value} value={value}>{option.label}</option>
          ))}
        </select>
      </label>

      <div className="rrr-control-row">
        {isHideout && (
        <label className="rrr-field has-tooltip" data-tooltip="A powered hideout gives more crafting bonus. Higher level means more RRR.">
          Hideout power level
          <select value={scenario.powerLevel} onChange={(event) => onChange({ powerLevel: Number(event.target.value) })}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => <option key={level} value={level}>Level {level}</option>)}
          </select>
        </label>
        )}

        {preset.hideoutSpecialized && (
        <label className="rrr-field has-tooltip" data-tooltip="For specialized hideout crafting, better zones add more bonus. Quality 6 is best.">
          Zone quality
          <select value={scenario.zoneQuality} onChange={(event) => onChange({ zoneQuality: Number(event.target.value) })}>
            {[1, 2, 3, 4, 5, 6].map((quality) => <option key={quality} value={quality}>Quality {quality}</option>)}
          </select>
        </label>
        )}
      </div>

      {scenario.location === 'custom' && (
        <label className="has-tooltip" data-tooltip="Use this when you already know the exact production bonus.">
          Base production bonus %
          <input min="0" step="0.01" type="number" value={scenario.customBonus} onChange={(event) => onChange({ customBonus: event.target.value })} />
        </label>
      )}

      <div className="rrr-control-row">
        <label className="rrr-field has-tooltip" data-tooltip="Daily activity bonuses add 10% or 20% production bonus for specific items.">
          Daily production bonus
          <select value={scenario.dailyBonus} onChange={(event) => onChange({ dailyBonus: Number(event.target.value) })}>
            <option value="0">None</option>
            <option value="10">10%</option>
            <option value="20">20%</option>
          </select>
        </label>

        <label className="checkbox-control rrr-focus-control has-tooltip" data-tooltip="Focus adds 59 production bonus before RRR is calculated.">
          <input checked={scenario.focus} type="checkbox" onChange={(event) => onChange({ focus: event.target.checked })} />
          Use focus (+59%)
        </label>
      </div>

      <div className="rrr-result-breakdown">
        <span className="has-tooltip" data-tooltip="Production bonus from the selected place before focus or daily bonuses.">Base bonus <strong>{result.baseBonus.toFixed(2)}%</strong></span>
        <span className="has-tooltip" data-tooltip="Base bonus plus focus and daily bonus. This number becomes RRR.">Total bonus <strong>{result.totalBonus.toFixed(2)}%</strong></span>
        <span className="has-tooltip" data-tooltip="If you craft with 100 materials, this is how many are actually spent after returns.">Resources used per 100 <strong>{(100 - result.rrr).toFixed(1)}</strong></span>
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
            {!standalone && <button className="icon-button navigation-button" type="button" onClick={() => window.open(`${window.location.href.split('#')[0]}#rrr-calculator`, '_blank', 'noopener')}>Open In New Page</button>}
            {!standalone && <button className="icon-button danger" type="button" onClick={onClose}>Close</button>}
            {standalone && <button className="icon-button navigation-button" type="button" onClick={() => window.location.assign(window.location.href.split('#')[0])}>Market History</button>}
          </div>
        </header>

        <p className="rrr-intro">Compare production bonuses using Albion's formula. Zone quality is included for specialized hideout crafting.</p>

        <div className="rrr-comparison-summary">
          <span className="has-tooltip" data-tooltip="How far apart the two RRR results are.">Difference</span>
          <strong className="has-tooltip" data-tooltip="A percentage-point gap, not extra silver or item value.">{difference.toFixed(1)} percentage points</strong>
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
