import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./components/PriceChart', () => ({
  default: () => <div>Rendered market chart</div>,
}));

describe('App', () => {
  beforeEach(() => {
    window.history.pushState(null, '', '/');
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders a landing page and enters the market through Log In', () => {
    render(<App />);

    expect(screen.getByText('Powered by Albion Data Project')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Albion Profit Tools' })).toBeInTheDocument();
    expect(screen.getByText('Knowledge is power. Data is profit.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue to Market' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Log In' }));

    expect(screen.getByRole('heading', { name: 'Market History' })).toBeInTheDocument();
    expect(screen.getByLabelText('Item')).toBeInTheDocument();
    expect(screen.getByText('Add an item to begin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compare RRR' })).toHaveClass('navigation-button');
    expect(screen.getByRole('button', { name: 'Artifact Melding' })).toHaveClass('navigation-button');
    expect(screen.getByRole('button', { name: 'Crafting Planner' })).toHaveClass('navigation-button');
  });

  it('opens the artifact melding and salvage profitability calculator with city filtering', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    window.history.pushState(null, '', '/#artifact-melding');
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Artifact Melding Profitability' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Market History' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crafting Planner' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compare RRR' })).toBeInTheDocument();
    expect(screen.getByLabelText('Market')).toHaveDisplayValue('All cities');
    expect(screen.getByLabelText('Market')).toHaveTextContent("Arthur's Rest");
    expect(screen.getByLabelText('Market')).toHaveTextContent("Merlyn's Rest");
    expect(screen.getByLabelText('Market')).toHaveTextContent("Morgana's Rest");
    expect(screen.queryByLabelText('Any-tree cost')).not.toBeInTheDocument();
    expect(screen.getByText(/Any-tree melding costs 35 fragments/)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Profitable Artifact Salvage' })).toBeInTheDocument();
    expect(screen.getByText(/returns exactly 10 Tier 4 rune fragments/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Missing Price Data 29' })).toBeInTheDocument();
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
    window.history.pushState(null, '', '/#market');
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

  it('opens the crafting planner, calculates RRR, and manages craft entries', () => {
    window.history.pushState(null, '', '/#crafting-planner');
    render(<App />);

    const dialog = screen.getByRole('main', { name: 'Crafting Planner' });
    expect(screen.getByRole('heading', { name: 'Crafting Planner' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Market History' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Artifact Melding' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Compare RRR' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Calculate' }));
    const picker = screen.getByRole('dialog', { name: 'Choose RRR' });
    expect(within(picker).getByRole('heading', { name: 'Scenario A' })).toBeInTheDocument();
    fireEvent.click(within(picker).getByRole('button', { name: 'Use 1.0% RRR' }));
    expect(within(dialog).getByLabelText('RRR %')).toHaveValue(1);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Calculate' }));
    const changedPicker = screen.getByRole('dialog', { name: 'Choose RRR' });
    fireEvent.change(within(changedPicker).getByLabelText('Hideout power level'), { target: { value: '9' } });
    fireEvent.change(within(changedPicker).getByLabelText('Zone quality'), { target: { value: '6' } });
    fireEvent.click(within(changedPicker).getByRole('button', { name: 'Close' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Calculate' }));
    const reopenedPicker = screen.getByRole('dialog', { name: 'Choose RRR' });
    expect(within(reopenedPicker).getByLabelText('Hideout power level')).toHaveDisplayValue('Level 9');
    expect(within(reopenedPicker).getByLabelText('Zone quality')).toHaveDisplayValue('Quality 6');
    fireEvent.click(within(reopenedPicker).getByRole('button', { name: 'Close' }));

    fireEvent.change(within(dialog).getByLabelText('Item'), { target: { value: "Adept's Broadsword" } });
    fireEvent.click(within(dialog).getByRole('option', { name: /Adept's BroadswordT4_MAIN_SWORD$/ }));
    fireEvent.change(within(dialog).getByLabelText('Amount to craft'), { target: { value: '3' } });
    fireEvent.change(within(dialog).getByLabelText('RRR %'), { target: { value: '25' } });
    expect(within(dialog).getByRole('heading', { name: 'Current craft breakdown' })).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Current craft material breakdown')).toBeInTheDocument();
    expect(within(dialog).queryByText('Silver cost')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }));

    expect(within(dialog).getByRole('heading', { name: 'Items to bring' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('heading', { name: 'Total required materials' })).not.toBeInTheDocument();
    expect(within(dialog).getByText('Steel Bar')).toBeInTheDocument();
    expect(within(dialog).getByText('Worked Leather')).toBeInTheDocument();
    expect(within(dialog).getAllByText('40').length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText('20').length).toBeGreaterThan(0);
    expect(within(dialog).queryByText(/Silver:/)).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Silver cost')).not.toBeInTheDocument();
    expect(localStorage.getItem('albion-market-history:crafting-planner:v1')).toContain('T4_MAIN_SWORD');

    window.history.pushState(null, '', '/#market');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    window.history.pushState(null, '', '/#crafting-planner');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    const reopenedDialog = screen.getByRole('main', { name: 'Crafting Planner' });
    expect(within(reopenedDialog).getByRole('heading', { name: 'Items to bring' })).toBeInTheDocument();
    expect(within(reopenedDialog).getByText("Adept's Broadsword")).toBeInTheDocument();

    fireEvent.click(within(reopenedDialog).getByRole('button', { name: 'Clear List' }));
    expect(within(reopenedDialog).queryByRole('heading', { name: 'Items to bring' })).not.toBeInTheDocument();
    expect(localStorage.getItem('albion-market-history:crafting-planner:v1')).toBe('[]');
  });

  it('adds a chart, fetches live data, and saves only chart preferences', async () => {
    window.history.pushState(null, '', '/#market');
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
    window.history.pushState(null, '', '/#market');
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
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(8));
  });

  it('reorders saved item cards by dragging them', () => {
    window.history.pushState(null, '', '/#market');
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
