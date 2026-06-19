import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchHistory } from '../services/albionApi';
import MarketCard from './MarketCard';

vi.mock('../services/albionApi', () => ({
  fetchHistory: vi.fn(),
  fetchMultiHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock('./PriceChart', () => ({
  default: ({
    history,
    ignoredPointKeys,
    locations,
    locationsWithData,
    recommendedLocation,
    onToggleLocation,
    onTogglePoint,
    selectedLocations,
  }) => (
    <div>
      <span>Recommended: {recommendedLocation}</span>
      <span>All cities: {locations.join(', ')}</span>
      <span>Data cities: {locationsWithData.join(', ')}</span>
      <span>Visible cities: {selectedLocations.join(', ')}</span>
      <span>Ignored points: {ignoredPointKeys.size}</span>
      <button onClick={() => onToggleLocation(recommendedLocation)} type="button">
        Hide recommended city
      </button>
      {history.flatMap((entry) => entry.data.map((point) => (
        <button
          key={`${entry.location}|${point.timestamp}`}
          onClick={() => onTogglePoint(`${entry.location}|${point.timestamp}`)}
          type="button"
        >
          Toggle {entry.location} point
        </button>
      )))}
    </div>
  ),
}));

const baseCard = {
  id: 'americas:T4_MAIN_SWORD',
  itemId: 'T4_MAIN_SWORD',
  name: "Adept's Broadsword",
  region: 'americas',
  quality: 1,
  metric: 'avg_price',
  days: 28,
  averageQualities: false,
  locations: [],
};

function StatefulCard() {
  const [card, setCard] = useState(baseCard);
  return <MarketCard card={card} onChange={(updates) => setCard((current) => ({ ...current, ...updates }))} onRemove={() => {}} />;
}

describe('MarketCard', () => {
  beforeEach(() => {
    fetchHistory.mockResolvedValue([
      {
        location: 'Caerleon',
        quality: 1,
        data: [{ timestamp: new Date().toISOString(), avg_price: 300, item_count: 10 }],
      },
      {
        location: 'Bridgewatch',
        quality: 1,
        data: [{ timestamp: new Date().toISOString(), avg_price: 200, item_count: 20 }],
      },
      {
        location: 'Lymhurst',
        quality: 2,
        data: [{ timestamp: new Date().toISOString(), avg_price: 500, item_count: 30 }],
      },
    ]);
  });

  it('recommends the next-best visible city when the current recommendation is hidden', async () => {
    render(<StatefulCard />);

    expect(await screen.findByText('Recommended: Caerleon')).toBeInTheDocument();
    expect(screen.getByText('EMV 233')).toHaveAttribute(
      'data-tooltip',
      expect.stringContaining('Estimated Market Value'),
    );
    expect(screen.getByText('Reroll?')).toBeInTheDocument();
    expect(screen.getByText(/Min\. RRR:/)).toHaveAttribute(
      'data-tooltip',
      expect.stringContaining('Break-even RRR'),
    );
    expect(screen.queryByText('Break-even minimum RRR')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Minimize card' }));
    expect(screen.queryByText('Reroll?')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Expand card' }));
    expect(screen.getByText('Reroll?')).toBeInTheDocument();
    expect(screen.getByText(
      'All cities: Black Market, Bridgewatch, Caerleon, Lymhurst, Arthurs Rest Smugglers Network, Merlyns Rest Smugglers Network, Morganas Rest Smugglers Network',
    )).toBeInTheDocument();
    expect(screen.getByText('Data cities: Caerleon, Bridgewatch')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide recommended city' }));

    expect(await screen.findByText('Recommended: Bridgewatch')).toBeInTheDocument();
    expect(screen.getByText(
      'All cities: Black Market, Bridgewatch, Caerleon, Lymhurst, Arthurs Rest Smugglers Network, Merlyns Rest Smugglers Network, Morganas Rest Smugglers Network',
    )).toBeInTheDocument();
    expect(screen.getByText(
      'Visible cities: Black Market, Bridgewatch, Lymhurst, Arthurs Rest Smugglers Network, Merlyns Rest Smugglers Network, Morganas Rest Smugglers Network',
    )).toBeInTheDocument();
  });

  it('keeps point toggles independent and updates the recommendation', async () => {
    render(<StatefulCard />);

    expect(await screen.findByText('Recommended: Caerleon')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Caerleon point' }));
    expect(screen.getByText('Ignored points: 1')).toBeInTheDocument();
    expect(screen.getByText('Recommended: Bridgewatch')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Bridgewatch point' }));
    expect(screen.getByText('Ignored points: 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Caerleon point' }));
    expect(screen.getByText('Ignored points: 1')).toBeInTheDocument();
    expect(screen.getByText('Recommended: Caerleon')).toBeInTheDocument();
  });

  it('resets ignored points when display, city visibility, or averages change', async () => {
    render(<StatefulCard />);

    await screen.findByText('Recommended: Caerleon');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Caerleon point' }));
    expect(screen.getByText('Ignored points: 1')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Display'), { target: { value: 'item_count' } });
    expect(screen.getByText('Ignored points: 0')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Caerleon point' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide recommended city' }));
    expect(screen.getByText('Ignored points: 0')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle Caerleon point' }));
    fireEvent.click(screen.getByLabelText('Show Averages'));
    expect(screen.getByText('Ignored points: 0')).toBeInTheDocument();
  });
});
