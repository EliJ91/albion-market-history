import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PriceChart from './PriceChart';

const resize = vi.fn();

vi.mock('react-chartjs-2', () => ({
  Line: ({ ref }) => {
    ref.current = { resize };
    return <canvas />;
  },
}));

afterEach(() => {
  resize.mockClear();
  vi.unstubAllGlobals();
});

describe('PriceChart resizing', () => {
  it('distinguishes hidden cities with data from cities without data', () => {
    render(
      <PriceChart
        history={[]}
        locations={['Caerleon', 'Lymhurst']}
        locationsWithData={['Caerleon']}
        metric="avg_price"
        recommendedLocation=""
        selectedLocations={[]}
      />,
    );

    expect(screen.getByRole('button', { name: 'Caerleon' })).toHaveClass('hidden');
    expect(screen.getByRole('button', { name: 'Lymhurst' })).toHaveClass('no-data');
  });

  it('resizes an existing chart when its card width changes', () => {
    let resizeCallback;
    const observe = vi.fn();
    const disconnect = vi.fn();

    vi.stubGlobal('requestAnimationFrame', (callback) => {
      callback();
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback) {
        resizeCallback = callback;
      }

      observe = observe;

      disconnect = disconnect;
    });

    render(
      <PriceChart
        history={[{
          location: 'Caerleon',
          quality: 1,
          data: [{ timestamp: '2026-06-01T00:00:00', avg_price: 100, item_count: 1 }],
        }]}
        locations={['Caerleon']}
        locationsWithData={['Caerleon']}
        metric="avg_price"
        recommendedLocation="Caerleon"
        selectedLocations={['Caerleon']}
      />,
    );

    expect(observe).toHaveBeenCalledTimes(1);
    resizeCallback();
    expect(resize).toHaveBeenCalled();
  });
});
