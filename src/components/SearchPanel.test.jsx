import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SearchPanel from './SearchPanel';

describe('SearchPanel', () => {
  it('adds a correctly enchanted raw resource', () => {
    const onAdd = vi.fn();
    render(<SearchPanel onAdd={onAdd} />);

    fireEvent.change(screen.getByLabelText('Item'), { target: { value: 'Iron Ore' } });
    fireEvent.click(screen.getByRole('option', { name: /Iron OreT4_ORE$/ }));
    fireEvent.change(screen.getByLabelText('Enchantment'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add chart' }));

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      item: expect.objectContaining({ itemId: 'T4_ORE' }),
      enchantment: '2',
      tier: '4',
    }));
  });

  it('disables enchantment below tier four', () => {
    render(<SearchPanel onAdd={() => {}} />);

    fireEvent.change(screen.getByLabelText('Item'), { target: { value: "Novice's Broadsword" } });
    fireEvent.click(screen.getByRole('option', { name: /Novice's BroadswordT2_MAIN_SWORD$/ }));

    expect(screen.getByLabelText('Enchantment')).toBeDisabled();
  });

  it('updates the selected item name and ID when tier changes', () => {
    const onAdd = vi.fn();
    render(<SearchPanel onAdd={onAdd} />);

    fireEvent.change(screen.getByLabelText('Item'), { target: { value: "Adept's Broadsword" } });
    fireEvent.click(screen.getByRole('option', { name: /Adept's BroadswordT4_MAIN_SWORD$/ }));
    fireEvent.change(screen.getByLabelText('Tier'), { target: { value: '6' } });

    expect(screen.getByLabelText('Item')).toHaveValue("Master's Broadsword");
    fireEvent.click(screen.getByRole('button', { name: 'Add chart' }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      item: expect.objectContaining({ itemId: 'T6_MAIN_SWORD' }),
      tier: '6',
    }));
  });

  it('selects tier and enchantment from notation before or after the item query', () => {
    const onAdd = vi.fn();
    render(<SearchPanel onAdd={onAdd} />);

    fireEvent.change(screen.getByLabelText('Item'), { target: { value: 'blazing 5.3' } });
    fireEvent.click(screen.getByRole('option', { name: /Expert's Blazing StaffT5_2H_INFERNOSTAFF_MORGANA@3$/ }));

    expect(screen.getByLabelText('Tier')).toHaveValue('5');
    expect(screen.getByLabelText('Enchantment')).toHaveValue('3');

    fireEvent.click(screen.getByRole('button', { name: 'Add chart' }));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      item: expect.objectContaining({ itemId: 'T5_2H_INFERNOSTAFF_MORGANA@3' }),
      enchantment: '3',
      tier: '5',
    }));
  });

  it('closes suggestions on outside click or Escape', () => {
    render(<SearchPanel onAdd={() => {}} />);
    const input = screen.getByLabelText('Item');

    fireEvent.change(input, { target: { value: 'Iron Ore' } });
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
