import { useEffect, useMemo, useState } from 'react';
import { REGIONS } from '../config';
import { fetchMultiHistory } from '../services/albionApi';
import {
  calculateMeldingStrategies,
  calculateSalvageOpportunities,
  getAveragePricesByItem,
  getFragmentId,
  getMeldingPool,
  MELDING_MATERIALS,
  MELDING_TREES,
} from '../utils/melding';

const silver = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const MARKETS = [
  { label: 'All cities', value: '' },
  { label: 'Bridgewatch', value: 'Bridgewatch' },
  { label: 'Caerleon', value: 'Caerleon' },
  { label: 'Fort Sterling', value: 'Fort Sterling' },
  { label: 'Lymhurst', value: 'Lymhurst' },
  { label: 'Martlock', value: 'Martlock' },
  { label: 'Thetford', value: 'Thetford' },
  { label: 'Brecilien', value: 'Brecilien' },
  { label: "Arthur's Rest", value: 'Arthurs Rest Smugglers Network' },
  { label: "Merlyn's Rest", value: 'Merlyns Rest Smugglers Network' },
  { label: "Morgana's Rest", value: 'Morganas Rest Smugglers Network' },
];

function StrategyCard({ strategy, prices }) {
  return (
    <details className={`melding-strategy ${strategy.profit >= 0 ? 'profit' : 'loss'}`}>
      <summary>
        <div>
          <strong className="has-tooltip" data-tooltip="The artifact tree used for this melding option.">{strategy.tree === 'any' ? 'Any tree' : strategy.tree}</strong>
          <span className="has-tooltip" data-tooltip="The fixed number of fragments consumed by one meld.">{strategy.fragmentsUsed} fragments</span>
        </div>
        <div className="melding-strategy-result">
          <strong className="has-tooltip" data-tooltip="Expected artifact value minus the cost of the consumed fragments.">{strategy.profit >= 0 ? '+' : ''}{silver.format(strategy.profit)} silver</strong>
          <span className="has-tooltip" data-tooltip="Expected profit or loss as a percentage of the fragment cost.">{strategy.roi >= 0 ? '+' : ''}{strategy.roi.toFixed(1)}% ROI</span>
        </div>
      </summary>

      <div className="melding-metrics">
        <span className="has-tooltip" data-tooltip="Average fragment price multiplied by the fragments consumed.">Input cost<strong>{silver.format(strategy.inputCost)}</strong></span>
        <span className="has-tooltip" data-tooltip="Average market value of the possible artifact results that have price data.">Expected artifact value<strong>{silver.format(strategy.expectedValue)}</strong></span>
        <span className="has-tooltip" data-tooltip="Possible artifacts with market data divided by all possible artifacts.">Price coverage<strong>{strategy.pricedOutputs.length}/{strategy.pool.length}</strong></span>
      </div>

      <div className="melding-output-list">
        {strategy.pool.map((item) => (
          <div key={item.itemId} className={prices.get(item.itemId) == null ? 'missing-price' : ''}>
            <span>{item.name}</span>
            <strong className="has-tooltip" data-tooltip="This artifact's volume-weighted historical average market price.">{prices.get(item.itemId) == null ? 'No data' : silver.format(prices.get(item.itemId))}</strong>
          </div>
        ))}
      </div>
    </details>
  );
}

function SalvageOpportunities({ fragmentPrice, opportunities, poolSize, material, tier }) {
  const profitable = opportunities.filter((item) => item.profit > 0);
  const grouped = MELDING_TREES.map((tree) => ({
    items: profitable.filter((item) => item.tree === tree),
    tree,
  })).filter((group) => group.items.length > 0);
  const salvageReturn = fragmentPrice * 10;

  return (
    <section className="salvage-opportunities" aria-labelledby="salvage-title">
      <header className="salvage-heading">
        <div>
          <p className="eyebrow">Hypothetical salvage</p>
          <h2 id="salvage-title">Profitable Artifact Salvage</h2>
        </div>
        <p>Assumes each artifact returns exactly 10 Tier {tier} {MELDING_MATERIALS[material].toLowerCase()} fragments.</p>
      </header>

      <div className="salvage-summary">
        <span className="has-tooltip" data-tooltip="Ten times the all-city volume-weighted historical average fragment price.">10-fragment return<strong>{fragmentPrice ? `${silver.format(salvageReturn)} silver` : 'No price data'}</strong></span>
        <span className="has-tooltip" data-tooltip="Artifacts whose average price is lower than the value of ten matching fragments.">Profitable artifacts<strong>{profitable.length}</strong></span>
        <span className="has-tooltip" data-tooltip="Artifacts with market price data divided by all artifacts in the selected material pool.">Price coverage<strong>{opportunities.length}/{poolSize}</strong></span>
      </div>

      {!fragmentPrice && <div className="salvage-empty">Fragment price data is required to calculate salvage profit.</div>}
      {fragmentPrice > 0 && grouped.length === 0 && <div className="salvage-empty">No artifacts with available price data are profitable to salvage.</div>}
      {grouped.length > 0 && (
        <div className="salvage-tree-grid">
          {grouped.map((group) => (
            <article className="salvage-tree" key={group.tree}>
              <h3>{group.tree} tree</h3>
              <div className="salvage-list">
                {group.items.map((item) => (
                  <div className="salvage-item" key={item.itemId}>
                    <span>{item.name}</span>
                    <span className="has-tooltip" data-tooltip="All-city volume-weighted historical average artifact price.">Artifact<strong>{silver.format(item.artifactPrice)}</strong></span>
                    <span className="has-tooltip" data-tooltip="Value of ten matching fragments using their all-city average price.">Returns<strong>{silver.format(item.salvageReturn)}</strong></span>
                    <span className="salvage-profit has-tooltip" data-tooltip="Ten-fragment return value minus the artifact's average price.">Profit<strong>+{silver.format(item.profit)}</strong></span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function MeldingCalculator({ onClose, standalone = false }) {
  const [settings, setSettings] = useState({
    city: '',
    material: 'rune',
    region: 'americas',
    tier: 4,
  });
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const itemIds = useMemo(() => {
    const artifactIds = MELDING_TREES.flatMap((tree) => (
      getMeldingPool(tree, settings.material, settings.tier).map((item) => item.itemId)
    ));
    return [getFragmentId(settings.material, settings.tier), ...new Set(artifactIds)];
  }, [settings.material, settings.tier]);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setError('');
    fetchMultiHistory(
      itemIds,
      settings.region,
      settings.city ? [settings.city] : [],
      controller.signal,
    ).then((data) => {
      setHistory(data);
      setStatus('ready');
    }).catch((requestError) => {
      if (requestError.name === 'AbortError') return;
      setError(requestError.message);
      setStatus('error');
    });
    return () => controller.abort();
  }, [itemIds.join('|'), settings.region, settings.city]);

  const prices = useMemo(() => getAveragePricesByItem(history), [history]);
  const fragmentId = getFragmentId(settings.material, settings.tier);
  const fragmentPrice = prices.get(fragmentId) || 0;
  const strategies = calculateMeldingStrategies({
    ...settings,
    fragmentPrice,
    prices,
  }).sort((left, right) => right.profit - left.profit);
  const salvageOpportunities = calculateSalvageOpportunities({
    fragmentPrice,
    material: settings.material,
    prices,
    tier: settings.tier,
  });
  const salvagePoolSize = getMeldingPool('any', settings.material, settings.tier).length;
  const selectedMarket = MARKETS.find((market) => market.value === settings.city);

  function update(updates) {
    setSettings((current) => ({ ...current, ...updates }));
  }

  return (
    <div className={standalone ? 'rrr-page' : 'rrr-modal-backdrop'} role={standalone ? undefined : 'presentation'} onMouseDown={(event) => {
      if (!standalone && event.target === event.currentTarget) onClose();
    }}>
      <article className="rrr-calculator melding-calculator" role={standalone ? undefined : 'dialog'} aria-modal={standalone ? undefined : 'true'} aria-labelledby="melding-title">
        <header className="rrr-header">
          <div>
            <p className="eyebrow">Artifact foundry</p>
            <h1 id="melding-title">Artifact Melding Profitability</h1>
          </div>
          <div className="header-actions">
            {!standalone && <button className="icon-button navigation-button" type="button" onClick={() => window.open(`${window.location.href.split('#')[0]}#melding-calculator`, '_blank', 'noopener')}>Open In New Page</button>}
            {!standalone && <button className="icon-button danger" type="button" onClick={onClose}>Close</button>}
            {standalone && <button className="icon-button navigation-button" type="button" onClick={() => window.location.assign(window.location.href.split('#')[0])}>Market History</button>}
          </div>
        </header>

        <p className="rrr-intro">Compares volume-weighted historical average artifact prices against fragment costs and hypothetical salvage returns.</p>

        <section className="melding-controls">
          <label className="has-tooltip" data-tooltip="The Albion server whose market history is used.">Region<select value={settings.region} onChange={(event) => update({ region: event.target.value })}>{Object.entries(REGIONS).map(([value, region]) => <option key={value} value={value}>{region.label}</option>)}</select></label>
          <label className="has-tooltip" data-tooltip="All cities combines every city, Rest, and Black Market; selecting one market recalculates melding and salvage profitability using only that market.">Market<select value={settings.city} onChange={(event) => update({ city: event.target.value })}>{MARKETS.map((market) => <option key={market.label} value={market.value}>{market.label}</option>)}</select></label>
          <label className="has-tooltip" data-tooltip="The tier shared by the fragments and possible artifacts.">Tier<select value={settings.tier} onChange={(event) => update({ tier: Number(event.target.value) })}>{[4, 5, 6, 7, 8].map((tier) => <option key={tier} value={tier}>Tier {tier}</option>)}</select></label>
          <label className="has-tooltip" data-tooltip="The fragment material consumed to create an artifact.">Fragment<select value={settings.material} onChange={(event) => update({ material: event.target.value })}>{Object.entries(MELDING_MATERIALS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </section>

        <div className="melding-source-summary">
          <span className="has-tooltip" data-tooltip="The selected fragment whose average price sets the melding cost.">Tier {settings.tier} {MELDING_MATERIALS[settings.material]} average</span>
          <strong className="has-tooltip" data-tooltip="Volume-weighted historical average price of one selected fragment.">{fragmentPrice ? `${silver.format(fragmentPrice)} silver` : 'No price data'}</strong>
          <span>{settings.city ? `Every price uses ${selectedMarket?.label || settings.city} history only.` : 'Every price averages all cities.'} Any-tree melding costs 35 fragments; a selected tree costs 50.</span>
        </div>

        {status === 'loading' && <div className="card-message">Loading fragment and artifact price history...</div>}
        {status === 'error' && <div className="card-message error">{error}</div>}
        {status === 'ready' && (
          <section className="melding-strategies" aria-label="Melding strategy profitability">
            {strategies.map((strategy) => <StrategyCard key={strategy.tree} strategy={strategy} prices={prices} />)}
          </section>
        )}
        {status === 'ready' && (
          <SalvageOpportunities
            fragmentPrice={fragmentPrice}
            material={settings.material}
            opportunities={salvageOpportunities}
            poolSize={salvagePoolSize}
            tier={settings.tier}
          />
        )}
      </article>
    </div>
  );
}
