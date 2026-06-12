import { useEffect, useState } from 'react';
import SearchPanel from './components/SearchPanel';
import MarketCard from './components/MarketCard';
import RrrCalculator from './components/RrrCalculator';
import MeldingCalculator from './components/MeldingCalculator';
import { STORAGE_KEY } from './config';
import { buildItemId, getItemName } from './utils/itemCatalog';

function loadCards() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved)) return [];

    return saved
      .filter((card) => card && typeof card.itemId === 'string')
      .map((card) => ({
        id: card.id || `${card.region || 'americas'}:${card.itemId}`,
        itemId: card.itemId,
        name: card.name || getItemName(card.itemId),
        region: card.region || 'americas',
        quality: Number(card.quality) || 1,
        metric: card.metric === 'item_count' ? 'item_count' : 'avg_price',
        days: [7, 14, 28].includes(Number(card.days)) ? Number(card.days) : 28,
        averageQualities: Boolean(card.averageQualities),
        locations: Array.isArray(card.locations) ? card.locations : [],
        collapsed: Boolean(card.collapsed),
      }));
  } catch {
    return [];
  }
}

export default function App() {
  const [cards, setCards] = useState(loadCards);
  const [draggingCardId, setDraggingCardId] = useState(null);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [meldingOpen, setMeldingOpen] = useState(false);
  const [standaloneCalculator, setStandaloneCalculator] = useState(
    () => window.location.hash === '#rrr-calculator',
  );
  const [standaloneMelding, setStandaloneMelding] = useState(
    () => window.location.hash === '#melding-calculator',
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    const updateRoute = () => {
      setStandaloneCalculator(window.location.hash === '#rrr-calculator');
      setStandaloneMelding(window.location.hash === '#melding-calculator');
    };
    window.addEventListener('hashchange', updateRoute);
    return () => window.removeEventListener('hashchange', updateRoute);
  }, []);

  function addCard({ item, region, tier, enchantment }) {
    const itemId = buildItemId(item.itemId, tier, enchantment);
    const id = `${region}:${itemId}`;
    const newCard = {
      id,
      itemId,
      name: getItemName(itemId, item.name),
      region,
      quality: 1,
      metric: 'avg_price',
      days: 28,
      averageQualities: false,
      locations: [],
      collapsed: false,
    };

    setCards((current) => [newCard, ...current.filter((card) => card.id !== id)]);
  }

  function updateCard(id, updates) {
    setCards((current) => current.map((card) => (card.id === id ? { ...card, ...updates } : card)));
  }

  function removeCard(id) {
    setCards((current) => current.filter((card) => card.id !== id));
  }

  function moveCard(targetId) {
    if (!draggingCardId || draggingCardId === targetId) return;
    setCards((current) => {
      const fromIndex = current.findIndex((card) => card.id === draggingCardId);
      const toIndex = current.findIndex((card) => card.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const next = [...current];
      const [moving] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moving);
      return next;
    });
  }

  if (standaloneCalculator) return <RrrCalculator standalone />;
  if (standaloneMelding) return <MeldingCalculator standalone />;

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Albion Online Data Project</p>
          <h1>Market History</h1>
        </div>
        <div className="topbar-actions">
          <button className="icon-button" type="button" onClick={() => setMeldingOpen(true)}>Artifact melding</button>
          <button className="primary-button" type="button" onClick={() => setCalculatorOpen(true)}>Compare RRR</button>
        </div>
      </header>

      <main className="app-shell">
        <SearchPanel onAdd={addCard} />

        {cards.length === 0 ? (
          <section className="empty-state">
            <h2>Add an item to begin</h2>
            <p>Search for an Albion item, choose a server region, and compare its historical market activity.</p>
          </section>
        ) : (
          <section className="cards-grid" aria-label="Saved market charts">
            {cards.map((card) => (
              <MarketCard
                key={card.id}
                card={card}
                dragging={draggingCardId === card.id}
                onChange={(updates) => updateCard(card.id, updates)}
                onDragEnd={() => setDraggingCardId(null)}
                onDragEnter={() => moveCard(card.id)}
                onDragStart={() => setDraggingCardId(card.id)}
                onRemove={() => removeCard(card.id)}
              />
            ))}
          </section>
        )}
      </main>

      <footer>
        Market information is community-reported and may be delayed or incomplete.
      </footer>

      {calculatorOpen && <RrrCalculator onClose={() => setCalculatorOpen(false)} />}
      {meldingOpen && <MeldingCalculator onClose={() => setMeldingOpen(false)} />}
    </>
  );
}
