import { useEffect, useMemo, useState } from 'react';
import { CRAFTING_PLANNER_STORAGE_KEY } from '../config';
import { CRAFTING_CITY_BONUSES } from '../data/craftingBonuses';
import {
  buildItemId,
  canChangeTier,
  getAvailableTiers,
  getEnchantment,
  getEquivalentItem,
  getItemName,
  getTier,
  searchItems,
} from '../utils/itemCatalog';
import { calculateRequiredMaterials, getRecipe } from '../utils/craftingProfit';
import { calculateScenario } from '../utils/resourceReturn';
import { initialScenario, ScenarioEditor } from './RrrCalculator';

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const wholeNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

function navigateTo(hash) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function buildPlannerEntry({ amount, id, itemId, name, rrr }) {
  const recipe = getRecipe(itemId);
  const result = calculateRequiredMaterials({ amount, recipe, rrr });
  if (!recipe || !result) return null;

  return {
    amount: result.targetAmount,
    id: id || `${itemId}:${Date.now()}`,
    itemId,
    name: name || getItemName(itemId),
    result,
    rrr: result.rrr,
  };
}

function loadPlannerEntries() {
  try {
    const saved = JSON.parse(localStorage.getItem(CRAFTING_PLANNER_STORAGE_KEY));
    if (!Array.isArray(saved)) return [];

    return saved
      .filter((entry) => entry && typeof entry.itemId === 'string')
      .map((entry) => buildPlannerEntry({
        amount: entry.amount,
        id: entry.id,
        itemId: entry.itemId,
        name: entry.name,
        rrr: entry.rrr,
      }))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function serializePlannerEntries(entries) {
  return entries.map((entry) => ({
    amount: entry.amount,
    id: entry.id,
    itemId: entry.itemId,
    name: entry.name,
    rrr: entry.rrr,
  }));
}

function MaterialItemPicker({ onSelect, selectedItem }) {
  const [query, setQuery] = useState(selectedItem?.name || '');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [tier, setTier] = useState(selectedItem ? String(getTier(selectedItem.itemId) || '') : '');
  const [enchantment, setEnchantment] = useState(selectedItem ? String(getEnchantment(selectedItem.itemId)) : '0');
  const suggestions = useMemo(() => searchItems(query), [query]);
  const availableTiers = selectedItem ? getAvailableTiers(selectedItem.itemId) : [];

  function selectItem(item) {
    setQuery(item.name);
    setTier(String(getTier(item.itemId) || ''));
    setEnchantment(String(getEnchantment(item.itemId)));
    setSuggestionsOpen(false);
    onSelect(item);
  }

  function changeTier(nextTier) {
    const nextEnchantment = Number(nextTier) < 4 ? '0' : enchantment;
    const equivalentItem = getEquivalentItem(selectedItem.itemId, nextTier, nextEnchantment);
    setTier(nextTier);
    setEnchantment(nextEnchantment);

    if (equivalentItem) {
      setQuery(equivalentItem.name);
      onSelect(equivalentItem);
    }
  }

  function changeEnchantment(nextEnchantment) {
    const itemId = buildItemId(selectedItem.itemId, tier, nextEnchantment);
    const nextItem = { itemId, name: getItemName(itemId, selectedItem.name) };
    setEnchantment(nextEnchantment);
    setQuery(nextItem.name);
    onSelect(nextItem);
  }

  return (
    <>
      <div className="search-field">
        <label htmlFor="materials-item-search">Item</label>
        <input
          id="materials-item-search"
          autoComplete="off"
          placeholder="Search item, ID, or 5.3 staff"
          value={query}
          onBlur={() => setTimeout(() => setSuggestionsOpen(false), 100)}
          onChange={(event) => {
            setQuery(event.target.value);
            setSuggestionsOpen(true);
            onSelect(null);
          }}
          onFocus={() => setSuggestionsOpen(true)}
        />
        {suggestionsOpen && !selectedItem && suggestions.length > 0 && (
          <div className="suggestions" role="listbox">
            {suggestions.map((item) => (
              <button
                key={`${item.name}:${item.itemId}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectItem(item)}
                role="option"
                type="button"
              >
                <span>{item.name}</span>
                <code>{item.itemId}</code>
              </button>
            ))}
          </div>
        )}
      </div>

      <label className="has-tooltip" data-tooltip="Changes the selected item to the same item family at another tier when one exists.">
        Tier
        <select
          disabled={!selectedItem || !canChangeTier(selectedItem.itemId)}
          value={tier}
          onChange={(event) => changeTier(event.target.value)}
        >
          {availableTiers.map((value) => <option key={value} value={value}>T{value}</option>)}
        </select>
      </label>

      <label className="has-tooltip" data-tooltip="Changes enchantment for craftable items that have enchanted versions.">
        Enchantment
        <select
          disabled={!selectedItem || Number(tier) < 4}
          value={enchantment}
          onChange={(event) => changeEnchantment(event.target.value)}
        >
          {[0, 1, 2, 3, 4].map((value) => <option key={value} value={value}>.{value}</option>)}
        </select>
      </label>
    </>
  );
}

function MaterialsBreakdown({ action, result, title = 'Current craft breakdown' }) {
  return (
    <section className="materials-breakdown">
      <header className="materials-section-heading">
        <div>
          <p className="eyebrow">Preview</p>
          <h2>{title}</h2>
        </div>
        {action}
      </header>
      <section className="materials-summary">
        <span className="has-tooltip" data-tooltip="The number of crafting actions needed to reach the requested amount.">Crafts required<strong>{wholeNumber.format(result.craftsRequired)}</strong></span>
        <span className="has-tooltip" data-tooltip="The finished items produced after rounding to whole crafts.">Items produced<strong>{wholeNumber.format(result.amountProduced)}</strong></span>
        <span className="has-tooltip" data-tooltip="The RRR used to subtract returned materials.">RRR used<strong>{number.format(result.rrr)}%</strong></span>
      </section>
      <section className="materials-table" aria-label="Current craft material breakdown">
        <div className="materials-table-header">
          <span>Material</span>
          <span className="has-tooltip" data-tooltip="Total material the recipe asks for before returns.">Recipe total</span>
          <span className="has-tooltip" data-tooltip="Expected returns from earlier crafts that can help pay for later crafts. The final craft's returns are not counted toward what you need to bring.">Usable returns</span>
          <span className="has-tooltip" data-tooltip="The amount to bring after returns, rounded up.">Required</span>
        </div>
        {result.resources.map((resource) => (
          <div className="materials-table-row" key={resource.itemId}>
            <span>
              <strong>{resource.name}</strong>
              <code>{resource.itemId}</code>
            </span>
            <span>{number.format(resource.gross)}</span>
            <span>{number.format(resource.returned)}</span>
            <span>{wholeNumber.format(resource.required)}</span>
          </div>
        ))}
      </section>
    </section>
  );
}

function RrrPicker({ onChangeScenario, onClose, onUse, scenario }) {
  return (
    <div className="rrr-modal-backdrop rrr-picker-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <article className="rrr-picker-modal" role="dialog" aria-modal="true" aria-labelledby="rrr-picker-title">
        <header className="rrr-header">
          <div>
            <p className="eyebrow">Crafting planner</p>
            <h1 id="rrr-picker-title">Choose RRR</h1>
          </div>
          <div className="header-actions">
            <button className="icon-button danger" type="button" onClick={onClose}>Close</button>
          </div>
        </header>
        <ScenarioEditor
          label="Scenario A"
          scenario={scenario}
          onChange={onChangeScenario}
          onUseRrr={onUse}
        />
      </article>
    </div>
  );
}

function parseBonusLabel(bonus) {
  const match = bonus.match(/^(.*)\s(\+\d+%)$/);
  if (!match) return { label: bonus, value: '' };
  return { label: match[1], value: match[2] };
}

function getBonusCategory(label) {
  if (/^Raw /.test(label) || label === 'Food') return 'food';
  if (label === 'Potion') return 'potion';
  if (/(Armor|Helmet|Shoes|Gathering Gear)/.test(label)) return 'armor';
  if (/^(Axe|Bow|Crossbow|Dagger|Hammer|Mace|Quarterstaff|Spear|Sword|War Gloves|Arcane Staff|Cursed Staff|Fire Staff|Frost Staff|Holy Staff|Nature Staff|Shapeshifter Staff|Off-Hand)$/.test(label)) return 'weapon';
  return 'other';
}

const bonusCategoryOrder = {
  food: 0,
  potion: 1,
  weapon: 2,
  armor: 3,
  other: 4,
};

function getSortedBonusItems(bonuses) {
  return bonuses
    .map((bonus) => {
      const parsedBonus = parseBonusLabel(bonus);
      const category = getBonusCategory(parsedBonus.label);
      return { ...parsedBonus, bonus, category };
    })
    .sort((left, right) => {
      const categoryDifference = bonusCategoryOrder[left.category] - bonusCategoryOrder[right.category];
      if (categoryDifference !== 0) return categoryDifference;
      return left.label.localeCompare(right.label);
    });
}

const craftingBonusSections = [
  {
    title: 'Cities',
    entries: CRAFTING_CITY_BONUSES.filter((entry) => entry.group === 'city'),
  },
  {
    title: 'Outlands',
    entries: CRAFTING_CITY_BONUSES.filter((entry) => entry.group === 'rest'),
  },
];

function CraftingBonusModal({ onClose }) {
  return (
    <div className="rrr-modal-backdrop crafting-bonus-backdrop" role="presentation">
      <article className="crafting-bonus-modal" role="dialog" aria-modal="true" aria-labelledby="crafting-bonus-title">
        <header className="crafting-bonus-header">
          <div>
            <h1 id="crafting-bonus-title">Crafting Bonuses</h1>
          </div>
          <button className="icon-button crafting-bonus-close" type="button" onClick={onClose}>
            <span aria-hidden="true">x</span>
            Close
          </button>
        </header>
        <div className="crafting-bonus-sections">
          {craftingBonusSections.map((section) => (
            <section className="crafting-bonus-section" key={section.title}>
              <h2>{section.title}</h2>
              <div className="crafting-bonus-table">
                {section.entries.map((entry) => (
                  <section className={`crafting-bonus-row biome-${entry.biomeKey}`} key={entry.city}>
                    <div className="crafting-bonus-location">
                      <h3>{entry.city}</h3>
                      {entry.biomeKey !== 'none' && <span className="crafting-biome-pill">{entry.biome}</span>}
                    </div>
                    <div className="crafting-bonus-chips">
                      {getSortedBonusItems(entry.bonuses).map((bonus) => {
                        return (
                          <span className={`crafting-bonus-chip ${bonus.category}`} key={bonus.bonus}>
                            <span>{bonus.label}</span>
                            {bonus.value && <strong>{bonus.value}</strong>}
                          </span>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="crafting-bonus-note">
          <strong className="legend-food">Green</strong> marks food or farming output. <strong className="legend-potion">Yellow</strong> marks potion bonuses. <strong className="legend-weapon">Red</strong> marks weapon bonuses. <strong className="legend-armor">Blue</strong> marks armor bonuses. Neutral entries are tools, bags, capes, or other utility crafts.
        </p>
      </article>
    </div>
  );
}

export default function MaterialsCalculator({ onClose, onOpenRrr, standalone = false }) {
  const [entries, setEntries] = useState(loadPlannerEntries);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [amount, setAmount] = useState(1);
  const [rrr, setRrr] = useState(0);
  const [rrrScenario, setRrrScenario] = useState({ ...initialScenario });
  const [pickerKey, setPickerKey] = useState(0);
  const recipe = selectedItem ? getRecipe(selectedItem.itemId) : null;
  const result = calculateRequiredMaterials({ amount, recipe, rrr });

  useEffect(() => {
    localStorage.setItem(CRAFTING_PLANNER_STORAGE_KEY, JSON.stringify(serializePlannerEntries(entries)));
  }, [entries]);

  function addEntry() {
    if (!selectedItem || !result) return;
    setEntries((current) => [...current, buildPlannerEntry({
      amount: result.targetAmount,
      id: `${selectedItem.itemId}:${Date.now()}:${current.length}`,
      itemId: selectedItem.itemId,
      name: selectedItem.name,
      rrr: result.rrr,
    })].filter(Boolean));
    setSelectedItem(null);
    setAmount(1);
    setPickerKey((value) => value + 1);
  }

  function removeEntry(id) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  function clearEntries() {
    setEntries([]);
  }

  return (
    <div className={standalone ? 'rrr-page' : 'rrr-modal-backdrop'} role={standalone ? undefined : 'presentation'} onMouseDown={(event) => {
      if (!standalone && event.target === event.currentTarget) onClose();
    }}>
      <article className="rrr-calculator materials-calculator" role={standalone ? 'main' : 'dialog'} aria-modal={standalone ? undefined : 'true'} aria-labelledby="materials-title">
        <header className="rrr-header">
          <div>
            <p className="eyebrow">Crafting planner</p>
            <h1 id="materials-title">Crafting Planner</h1>
          </div>
          <div className="header-actions">
            {standalone && <button className="icon-button navigation-button" type="button" onClick={() => navigateTo('#market')}>Market History</button>}
            {standalone && <button className="icon-button navigation-button" type="button" onClick={() => navigateTo('#artifact-melding')}>Artifact Melding</button>}
            {standalone && <button className="icon-button navigation-button" type="button" onClick={onOpenRrr}>Compare RRR</button>}
            {!standalone && <button className="icon-button danger" type="button" onClick={onClose}>Close</button>}
          </div>
        </header>

        <div className="materials-intro-row">
          <p className="rrr-intro">Build a craft list, set each item's RRR, and see the total materials you need to bring after expected returns.</p>
          <button className="icon-button navigation-button materials-bonus-button" type="button" onClick={() => setBonusOpen(true)}>Crafting Bonuses</button>
        </div>

        <section className="materials-controls">
          <MaterialItemPicker key={pickerKey} selectedItem={selectedItem} onSelect={setSelectedItem} />
          <label className="has-tooltip" data-tooltip="How many finished items you want. If a recipe makes more than one, this rounds up to the needed number of crafts.">
            Amount to craft
            <input min="1" step="1" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </label>
          <div className="materials-rrr-control">
            <label className="has-tooltip" data-tooltip="Your resource return rate. Returnable materials are reduced by this percent.">
              RRR %
              <input min="0" max="100" step="0.1" type="number" value={rrr} onChange={(event) => setRrr(event.target.value)} />
            </label>
            <button className="icon-button navigation-button materials-calculate-button" type="button" onClick={() => setPickerOpen(true)}>Calculate</button>
          </div>
        </section>

        {!selectedItem && entries.length === 0 && <div className="card-message">Search for a craftable item, set the amount and RRR, then add it to your plan.</div>}
        {selectedItem && !recipe && <div className="card-message">No recipe was found for {selectedItem.name}. Try a normal craftable item.</div>}

        {result && (
          <MaterialsBreakdown
            result={result}
            action={<button className="primary-button materials-add-button" type="button" onClick={addEntry}>Add</button>}
          />
        )}

        {entries.length > 0 && (
          <section className="materials-plan" aria-label="Crafting plan">
            <header className="materials-section-heading">
              <div>
                <p className="eyebrow">Craft list</p>
                <h2>Items to bring</h2>
              </div>
              <button className="icon-button danger" type="button" onClick={clearEntries}>Clear List</button>
            </header>
            <div className="materials-plan-list">
              {entries.map((entry) => (
                <div className="materials-plan-row" key={entry.id}>
                  <header>
                    <span>
                      <strong>{entry.name}</strong>
                      <code>{entry.itemId}</code>
                    </span>
                    <span>RRR <strong>{number.format(entry.rrr)}%</strong></span>
                  </header>
                  <div className="materials-entry-resources">
                    {entry.result.resources.map((resource) => (
                      <span key={resource.itemId}>
                        {resource.name}
                        <strong>{wholeNumber.format(resource.required)}</strong>
                      </span>
                    ))}
                  </div>
                  <button className="icon-button danger action-icon" aria-label={`Remove ${entry.name}`} type="button" onClick={() => removeEntry(entry.id)}>x</button>
                </div>
              ))}
            </div>
          </section>
        )}
      </article>
      {pickerOpen && (
        <RrrPicker
          scenario={rrrScenario}
          onChangeScenario={(updates) => setRrrScenario((current) => ({ ...current, ...updates }))}
          onClose={() => setPickerOpen(false)}
          onUse={(value) => {
            setRrr(value.toFixed(1));
            setPickerOpen(false);
          }}
        />
      )}
      {bonusOpen && <CraftingBonusModal onClose={() => setBonusOpen(false)} />}
    </div>
  );
}
