import { useEffect, useMemo, useState } from 'react';
import { buildShoppingList, parseChestLog } from '../utils/shoppingList';
import RrrCalculator from './RrrCalculator';

const STORAGE_KEY = 'albion-market-history:shopping-list:v1';
const wholeNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

function navigateTo(hash) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function loadShoppingState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      enchantment: saved?.enchantment ?? '0',
      log: saved?.log ?? '',
      rrr: saved?.rrr ?? '0',
      tier: saved?.tier ?? '6',
    };
  } catch {
    return { enchantment: '0', log: '', rrr: '0', tier: '6' };
  }
}

export default function ShoppingList({ onOpenRrr, standalone = false }) {
  const [state, setState] = useState(loadShoppingState);
  const [rrrOpen, setRrrOpen] = useState(false);
  const parsedLog = useMemo(() => parseChestLog(state.log), [state.log]);
  const shoppingList = useMemo(() => buildShoppingList({
    enchantment: state.enchantment,
    inventory: parsedLog.inventory,
    rrr: state.rrr,
    tier: state.tier,
  }), [parsedLog.inventory, state.enchantment, state.rrr, state.tier]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  function updateState(updates) {
    setState((current) => ({ ...current, ...updates }));
  }

  function openRrrCalculator() {
    if (standalone) {
      setRrrOpen(true);
      return;
    }
    onOpenRrr?.();
  }

  return (
    <div className="rrr-page">
      <article className="rrr-calculator shopping-list-page" role="main" aria-labelledby="shopping-title">
        <header className="rrr-header">
          <div>
            <p className="eyebrow">Crafting planner</p>
            <h1 id="shopping-title">Shopping List</h1>
          </div>
          <div className="header-actions">
            <button className="icon-button navigation-button" type="button" onClick={() => navigateTo('#market')}>Market History</button>
            <button className="icon-button navigation-button" type="button" onClick={() => navigateTo('#crafting-planner')}>Crafting Planner</button>
            <button className="icon-button navigation-button" type="button" onClick={() => navigateTo('#artifact-melding')}>Artifact Melding</button>
            <button className="icon-button navigation-button" type="button" onClick={openRrrCalculator}>Compare RRR</button>
          </div>
        </header>

        <p className="rrr-intro">Paste a chest log, choose the tier and enchantment you want to craft, and this will build a buy list from the artifacts and materials you already have.</p>

        <section className="shopping-controls">
          <label>
            Craft tier
            <select value={state.tier} onChange={(event) => updateState({ tier: event.target.value })}>
              {[4, 5, 6, 7, 8].map((tier) => <option key={tier} value={tier}>T{tier}</option>)}
            </select>
          </label>
          <label>
            Enchantment
            <select value={state.enchantment} onChange={(event) => updateState({ enchantment: event.target.value })}>
              {[0, 1, 2, 3, 4].map((enchantment) => <option key={enchantment} value={enchantment}>.{enchantment}</option>)}
            </select>
          </label>
          <label>
            RRR %
            <input min="0" max="100" step="0.1" type="number" value={state.rrr} onChange={(event) => updateState({ rrr: event.target.value })} />
          </label>
          <button className="icon-button navigation-button shopping-rrr-button" type="button" onClick={openRrrCalculator}>RRR Calculator</button>
        </section>

        <section className="shopping-log-panel">
          <label htmlFor="shopping-chest-log">Chest log</label>
          <textarea
            id="shopping-chest-log"
            placeholder={'Paste items here, for example:\n8 Master\'s Burning Orb\n128 Exceptional Planks\n64 Exceptional Steel Bar'}
            value={state.log}
            onChange={(event) => updateState({ log: event.target.value })}
          />
        </section>

        <section className="materials-summary shopping-summary" aria-label="Shopping list summary">
          <span>Items recognized<strong>{wholeNumber.format(parsedLog.recognized.length)}</strong></span>
          <span>Matching artifacts<strong>{wholeNumber.format(shoppingList.artifactCount)}</strong></span>
          <span>Craft plans<strong>{wholeNumber.format(shoppingList.craftPlans.filter((plan) => !plan.missingRecipe).length)}</strong></span>
          <span>RRR used<strong>{decimal.format(Number(state.rrr) || 0)}%</strong></span>
        </section>

        {parsedLog.recognized.length === 0 && (
          <div className="card-message">Paste your chest log to generate a shopping list.</div>
        )}

        {parsedLog.unrecognized.length > 0 && (
          <section className="shopping-warning">
            <h2>Unrecognized lines</h2>
            <p>These were ignored. Edit the names or use item IDs if something important is missing.</p>
            <div>
              {parsedLog.unrecognized.slice(0, 12).map((line) => <code key={line}>{line}</code>)}
            </div>
          </section>
        )}

        {shoppingList.craftPlans.length > 0 && (
          <section className="materials-plan shopping-plan" aria-label="Craftable items">
            <header className="materials-section-heading">
              <div>
                <p className="eyebrow">Based on artifacts</p>
                <h2>Craftable Items</h2>
              </div>
            </header>
            <div className="materials-plan-list">
              {shoppingList.craftPlans.map((plan) => (
                <div className={`materials-plan-row ${plan.missingRecipe ? 'shopping-missing-recipe' : ''}`} key={`${plan.artifact.itemId}:${plan.itemId}`}>
                  <header>
                    <span>
                      <strong>{plan.name}</strong>
                      <code>{plan.itemId}</code>
                    </span>
                    <span>Craft <strong>{wholeNumber.format(plan.craftableAmount)}</strong></span>
                  </header>
                  <div className="materials-entry-resources">
                    <span>
                      {plan.artifact.name}
                      <strong>{wholeNumber.format(plan.artifact.quantity)}</strong>
                    </span>
                    {plan.missingRecipe && <span>No matching recipe for this tier/enchantment<strong>Skip</strong></span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {shoppingList.buyList.length > 0 ? (
          <section className="materials-breakdown shopping-buy-list">
            <header className="materials-section-heading">
              <div>
                <p className="eyebrow">Materials to buy</p>
                <h2>Materials To Buy</h2>
              </div>
            </header>
            <section className="materials-table" aria-label="Materials to buy">
              <div className="materials-table-header shopping-table-header">
                <span>Material</span>
                <span>Needed</span>
                <span>Owned</span>
                <span>Buy</span>
              </div>
              {shoppingList.buyList.map((resource) => (
                <div className="materials-table-row shopping-table-row" key={resource.itemId}>
                  <span>
                    <strong>{resource.name}</strong>
                    <code>{resource.itemId}</code>
                  </span>
                  <span>{wholeNumber.format(resource.required)}</span>
                  <span>{wholeNumber.format(resource.owned)}</span>
                  <span>{wholeNumber.format(resource.buy)}</span>
                </div>
              ))}
            </section>
          </section>
        ) : parsedLog.recognized.length > 0 && (
          <div className="card-message">No materials need to be bought for the selected tier and enchantment, or no matching artifact recipes were found.</div>
        )}
      </article>
      {rrrOpen && <RrrCalculator onClose={() => setRrrOpen(false)} />}
    </div>
  );
}
