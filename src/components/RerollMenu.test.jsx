import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RerollMenu, { getDropdownPosition } from './RerollMenu';

describe('RerollMenu', () => {
  it('shows every source-to-target plan and its expected verdict', () => {
    render(
      <RerollMenu
        currentQuality={2}
        itemValue={512}
        qualityAverages={{ 1: 100, 2: 10000, 3: 15000, 4: 25000, 5: 4000000 }}
      />,
    );

    expect(screen.getByText('Reroll?')).toBeInTheDocument();
    expect(screen.getByText('Reroll until target quality')).toBeInTheDocument();
    expect(screen.getByText('9,815.8')).toBeInTheDocument();
    expect(screen.getAllByText('Worth it').length).toBeGreaterThan(0);
    expect(screen.getByRole('table', { name: 'Reroll quality comparison' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(11);
  });

  it('keeps the dropdown inset from every viewport edge', () => {
    const position = getDropdownPosition({
      dropdownHeight: 700,
      triggerRect: {
        bottom: 80,
        right: 778,
        top: 46,
      },
      viewportHeight: 714,
      viewportWidth: 943,
    });

    expect(position.left).toBe(16);
    expect(position.left + position.width).toBeLessThanOrEqual(943 - 16);
    expect(position.top).toBeGreaterThanOrEqual(16);
    expect(position.top + position.maxHeight).toBeLessThanOrEqual(714 - 16);
  });

  it('closes when the user clicks outside or presses Escape', () => {
    const { container } = render(
      <RerollMenu
        currentQuality={2}
        itemValue={512}
        qualityAverages={{ 2: 10000, 3: 15000 }}
      />,
    );
    const details = container.querySelector('details');
    const dropdown = container.querySelector('.reroll-dropdown');

    details.open = true;
    fireEvent.pointerDown(dropdown);
    expect(details.open).toBe(true);

    fireEvent.pointerDown(document.body);
    expect(details.open).toBe(false);

    details.open = true;
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(details.open).toBe(false);
  });

  it('alternates row backgrounds by starting-quality group', () => {
    const { container } = render(
      <RerollMenu
        currentQuality={1}
        itemValue={512}
        qualityAverages={{}}
      />,
    );
    const rows = [...container.querySelectorAll('.reroll-table-row')];

    expect(rows.filter((row) => row.classList.contains('source-group-tinted'))).toHaveLength(6);
    expect(rows.filter((row) => row.classList.contains('source-group-plain'))).toHaveLength(4);
    expect(rows.filter((row) => row.classList.contains('source-group-start'))).toHaveLength(4);
  });
});
