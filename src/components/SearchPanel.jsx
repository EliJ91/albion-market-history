import { useEffect, useMemo, useRef, useState } from 'react';
import { REGIONS } from '../config';
import {
  canChangeTier,
  getAvailableTiers,
  getEnchantment,
  getEquivalentItem,
  getTier,
  searchItems,
} from '../utils/itemCatalog';

export default function SearchPanel({ onAdd }) {
  const searchFieldRef = useRef(null);
  const [query, setQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [region, setRegion] = useState('americas');
  const [tier, setTier] = useState('');
  const [enchantment, setEnchantment] = useState('0');

  const suggestions = useMemo(() => searchItems(query), [query]);
  const availableTiers = selectedItem ? getAvailableTiers(selectedItem.itemId) : [];

  useEffect(() => {
    function dismissSuggestions(event) {
      if (event.type === 'keydown' && event.key !== 'Escape') return;
      if (event.type === 'pointerdown' && searchFieldRef.current?.contains(event.target)) return;
      setSuggestionsOpen(false);
    }

    document.addEventListener('keydown', dismissSuggestions);
    document.addEventListener('pointerdown', dismissSuggestions);
    return () => {
      document.removeEventListener('keydown', dismissSuggestions);
      document.removeEventListener('pointerdown', dismissSuggestions);
    };
  }, []);

  function selectItem(item) {
    setSelectedItem(item);
    setSuggestionsOpen(false);
    setQuery(item.name);
    setTier(String(getTier(item.itemId) || ''));
    setEnchantment(String(getEnchantment(item.itemId)));
    setActiveSuggestion(0);
  }

  function submit() {
    if (!selectedItem) return;
    onAdd({ item: selectedItem, region, tier, enchantment });
  }

  function changeTier(nextTier) {
    const nextEnchantment = Number(nextTier) < 4 ? '0' : enchantment;
    const equivalentItem = getEquivalentItem(selectedItem.itemId, nextTier, nextEnchantment);
    setTier(nextTier);
    setEnchantment(nextEnchantment);

    if (equivalentItem) {
      setSelectedItem(equivalentItem);
      setQuery(equivalentItem.name);
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestion((current) => Math.min(current + 1, suggestions.length - 1));
    } else if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault();
      setSuggestionsOpen(true);
      setActiveSuggestion((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (suggestionsOpen && !selectedItem && suggestions[activeSuggestion]) selectItem(suggestions[activeSuggestion]);
      else submit();
    } else if (event.key === 'Escape') {
      setSuggestionsOpen(false);
    }
  }

  return (
    <section className="search-panel" aria-label="Add market chart">
      <div className="search-field" ref={searchFieldRef}>
        <label htmlFor="item-search">Item</label>
        <input
          id="item-search"
          autoComplete="off"
          placeholder="Search item, ID, or 5.3 staff"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedItem(null);
            setSuggestionsOpen(true);
            setActiveSuggestion(0);
          }}
          onFocus={() => setSuggestionsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {suggestionsOpen && !selectedItem && suggestions.length > 0 && (
          <div className="suggestions" role="listbox">
            {suggestions.map((item, index) => (
              <button
                className={index === activeSuggestion ? 'active' : ''}
                key={`${item.name}:${item.itemId}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectItem(item)}
                role="option"
                aria-selected={index === activeSuggestion}
                type="button"
              >
                <span>{item.name}</span>
                <code>{item.itemId}</code>
              </button>
            ))}
          </div>
        )}
      </div>

      <label>
        Region
        <select value={region} onChange={(event) => setRegion(event.target.value)}>
          {Object.entries(REGIONS).map(([value, option]) => (
            <option key={value} value={value}>{option.label}</option>
          ))}
        </select>
      </label>

      <label>
        Tier
        <select
          disabled={!selectedItem || !canChangeTier(selectedItem.itemId)}
          value={tier}
          onChange={(event) => changeTier(event.target.value)}
        >
          {availableTiers.map((value) => (
            <option key={value} value={value}>T{value}</option>
          ))}
        </select>
      </label>

      <label>
        Enchantment
        <select
          disabled={!selectedItem || Number(tier) < 4}
          value={enchantment}
          onChange={(event) => setEnchantment(event.target.value)}
        >
          {[0, 1, 2, 3, 4].map((value) => (
            <option key={value} value={value}>.{value}</option>
          ))}
        </select>
      </label>

      <button className="primary-button" disabled={!selectedItem} onClick={submit} type="button">
        Add chart
      </button>
    </section>
  );
}
