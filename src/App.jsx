import { useEffect, useState } from 'react';
import SearchPanel from './components/SearchPanel';
import MarketCard from './components/MarketCard';
import RrrCalculator from './components/RrrCalculator';
import MeldingCalculator from './components/MeldingCalculator';
import MaterialsCalculator from './components/MaterialsCalculator';
import { STORAGE_KEY } from './config';
import { buildItemId, getItemName } from './utils/itemCatalog';

function getRoute() {
  if (window.location.hash === '#market') return 'market';
  if (window.location.hash === '#crafting-planner' || window.location.hash === '#materials-calculator') return 'crafting';
  if (window.location.hash === '#artifact-melding' || window.location.hash === '#melding-calculator') return 'melding';
  if (window.location.hash === '#rrr-calculator') return 'rrr';
  return 'landing';
}

function navigateTo(hash) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function LandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-card">
        <p className="eyebrow">Powered by Albion Data Project</p>
        <h1>Albion Profit Tools</h1>
        <p>Knowledge is power. Data is profit.</p>
        <div className="landing-actions">
          <button className="primary-button" type="button" onClick={() => navigateTo('#market')}>Log In</button>
        </div>
      </section>
    </main>
  );
}

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
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }, [cards]);

  useEffect(() => {
    const updateRoute = () => {
      setRoute(getRoute());
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

  let content = null;

  if (route === 'landing') {
    content = <LandingPage />;
  } else if (route === 'rrr') {
    content = <RrrCalculator standalone />;
  } else if (route === 'melding') {
    content = <MeldingCalculator standalone onOpenRrr={() => setCalculatorOpen(true)} />;
  } else if (route === 'crafting') {
    content = <MaterialsCalculator standalone onOpenRrr={() => setCalculatorOpen(true)} />;
  } else {
    content = (
      <>
        <header className="topbar">
          <div>
            <p className="eyebrow">Albion Online Data Project</p>
            <h1>Market History</h1>
          </div>
          <div className="topbar-actions">
            <button className="icon-button navigation-button" type="button" onClick={() => navigateTo('#crafting-planner')}>Crafting Planner</button>
            <button className="icon-button navigation-button" type="button" onClick={() => navigateTo('#artifact-melding')}>Artifact Melding</button>
            <button className="icon-button navigation-button" type="button" onClick={() => setCalculatorOpen(true)}>Compare RRR</button>
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
      </>
    );
  }

  return (
    <>
      {content}
      {calculatorOpen && <RrrCalculator onClose={() => setCalculatorOpen(false)} />}
    </>
  );
}
