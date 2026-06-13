import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./components/PriceChart', () => ({
  default: () => <div>Rendered market chart</div>,
}));

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders the item search and empty state', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Market History' })).toBeInTheDocument();
    expect(screen.getByLabelText('Item')).toBeInTheDocument();
    expect(screen.getByText('Add an item to begin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compare RRR' })).toHaveClass('navigation-button');
    expect(screen.getByRole('button', { name: 'Artifact Melding' })).toHaveClass('navigation-button');
  });

  it('opens the artifact melding and salvage profitability calculator with city filtering', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Artifact Melding' }));

    expect(screen.getByRole('dialog', { name: 'Artifact Melding Profitability' })).toBeInTheDocument();
    expect(screen.getByLabelText('Market')).toHaveDisplayValue('All cities');
    expect(screen.getByLabelText('Market')).toHaveTextContent("Arthur's Rest");
    expect(screen.getByLabelText('Market')).toHaveTextContent("Merlyn's Rest");
    expect(screen.getByLabelText('Market')).toHaveTextContent("Morgana's Rest");
    expect(screen.queryByLabelText('Any-tree cost')).not.toBeInTheDocument();
    expect(screen.getByText(/Any-tree melding costs 35 fragments/)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Profitable Artifact Salvage' })).toBeInTheDocument();
    expect(screen.getByText(/returns exactly 10 Tier 4 rune fragments/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByLabelText('Market').closest('label')).toHaveAttribute(
      'data-tooltip',
      expect.stringContaining('Rest'),
    );

    fireEvent.change(screen.getByLabelText('Market'), {
      target: { value: 'Arthurs Rest Smugglers Network' },
    });
    await waitFor(() => expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('locations=Arthurs%20Rest%20Smugglers%20Network'),
      expect.objectContaining({ signal: expect.anything() }),
    ));
    expect(screen.getByText(/Every price uses Arthur's Rest history only/)).toBeInTheDocument();

    const callsBeforeRefresh = fetch.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(fetch.mock.calls.length).toBeGreaterThan(callsBeforeRefresh));
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('locations=Arthurs%20Rest%20Smugglers%20Network'),
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it('opens the RRR comparison calculator', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Compare RRR' }));

    expect(screen.getByRole('dialog', { name: 'Resource Return Rate Calculator' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Scenario A' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Scenario B' })).toBeInTheDocument();
    expect(screen.getAllByText('Base bonus')[0].closest('span')).toHaveAttribute(
      'data-tooltip',
      expect.stringContaining('Production bonus'),
    );
  });

  it('adds a chart, fetches live data, and saves only chart preferences', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{
        location: 'Brecilien',
        quality: 1,
        data: [{ timestamp: new Date().toISOString(), avg_price: 100, item_count: 2 }],
      }],
    }));

    render(<App />);
    fireEvent.change(screen.getByLabelText('Item'), { target: { value: "Adept's Broadsword" } });
    fireEvent.click(screen.getByRole('option', { name: /Adept's BroadswordT4_MAIN_SWORD$/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Add chart' }));

    expect(await screen.findByText('Rendered market chart')).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem('albion-market-history:cards:v2')).toContain('T4_MAIN_SWORD'));
    expect(localStorage.getItem('albion-market-history:cards:v2')).not.toContain('timestamp');
  });

  it('restores searched items and their settings after the app is closed and reopened', async () => {
    localStorage.setItem('albion-market-history:cards:v2', JSON.stringify([
      {
        id: 'americas:T4_MAIN_SWORD',
        itemId: 'T4_MAIN_SWORD',
        name: "Adept's Broadsword",
        region: 'americas',
        quality: 4,
        metric: 'item_count',
        days: 14,
        averageQualities: false,
        locations: ['Caerleon'],
      },
      {
        id: 'europe:T5_ORE_LEVEL2@2',
        itemId: 'T5_ORE_LEVEL2@2',
        name: 'Rare Titanium Ore',
        region: 'europe',
        quality: 1,
        metric: 'avg_price',
        days: 28,
        averageQualities: true,
        locations: ['Bridgewatch'],
      },
    ]));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }));

    const firstSession = render(<App />);
    expect(screen.getByRole('heading', { name: "Adept's Broadsword" })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rare Titanium Ore' })).toBeInTheDocument();
    firstSession.unmount();

    render(<App />);
    expect(screen.getByRole('heading', { name: "Adept's Broadsword" })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Rare Titanium Ore' })).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('2 weeks')).toHaveLength(1);
    expect(screen.getAllByDisplayValue('Volume')).toHaveLength(1);
    expect(screen.getAllByText('Show Averages')[1].closest('label').querySelector('input')).toBeChecked();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(12));
  });

  it('reorders saved item cards by dragging them', () => {
    localStorage.setItem('albion-market-history:cards:v2', JSON.stringify([
      {
        id: 'americas:T4_MAIN_SWORD',
        itemId: 'T4_MAIN_SWORD',
        name: "Adept's Broadsword",
        region: 'americas',
        quality: 1,
        metric: 'avg_price',
        days: 28,
        locations: [],
      },
      {
        id: 'americas:T4_BAG',
        itemId: 'T4_BAG',
        name: "Adept's Bag",
        region: 'americas',
        quality: 1,
        metric: 'avg_price',
        days: 28,
        locations: [],
      },
    ]));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    render(<App />);
    const swordCard = screen.getByRole('heading', { name: "Adept's Broadsword" }).closest('article');
    const bagCard = screen.getByRole('heading', { name: "Adept's Bag" }).closest('article');
    fireEvent.dragStart(bagCard);
    fireEvent.dragEnter(swordCard);
    fireEvent.dragEnd(bagCard);

    const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    expect(headings).toEqual(["Adept's Bag", "Adept's Broadsword"]);
  });
});
