import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PriceChart from './PriceChart';

const resize = vi.fn();
let chartRender;

vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options, ref }) => {
    chartRender = { data, options };
    ref.current = { resize };
    return <canvas />;
  },
}));

afterEach(() => {
  chartRender = null;
  resize.mockClear();
  vi.unstubAllGlobals();
});

describe('PriceChart', () => {
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

  it('greys ignored points and toggles only directly clicked points', () => {
    const onTogglePoint = vi.fn();
    const timestamp = '2026-06-01T00:00:00';

    render(
      <PriceChart
        history={[{
          location: 'Caerleon',
          quality: 1,
          data: [
            { timestamp, avg_price: 100, item_count: 1 },
            { timestamp: '2026-06-02T00:00:00', avg_price: 200, item_count: 2 },
          ],
        }]}
        ignoredPointKeys={new Set([`Caerleon|${timestamp}`])}
        locations={['Caerleon']}
        locationsWithData={['Caerleon']}
        metric="avg_price"
        onTogglePoint={onTogglePoint}
        recommendedLocation="Caerleon"
        selectedLocations={['Caerleon']}
      />,
    );

    const dataset = chartRender.data.datasets[0];
    expect(dataset.data[0].ignored).toBe(true);
    expect(dataset.data[1].ignored).toBe(false);
    expect(dataset.pointBackgroundColor({ raw: dataset.data[0] })).toBe('#94a3b8');
    expect(dataset.pointBackgroundColor({ raw: dataset.data[1] })).toBe('#f43f5e');
    expect(dataset.pointHitRadius).toBe(8);

    const hoverChart = {
      canvas: { style: {} },
      getElementsAtEventForMode: () => [{ datasetIndex: 0, index: 0 }],
    };
    chartRender.options.onHover({}, [], hoverChart);
    expect(hoverChart.canvas.style.cursor).toBe('pointer');
    hoverChart.getElementsAtEventForMode = () => [];
    chartRender.options.onHover({}, [], hoverChart);
    expect(hoverChart.canvas.style.cursor).toBe('crosshair');

    chartRender.options.onClick({}, [], {
      data: chartRender.data,
      getElementsAtEventForMode: () => [{ datasetIndex: 0, index: 0 }],
    });
    expect(onTogglePoint).toHaveBeenCalledWith(`Caerleon|${timestamp}`);

    chartRender.options.onClick({}, [], {
      data: chartRender.data,
      getElementsAtEventForMode: () => [],
    });
    expect(onTogglePoint).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Click a plotted point to include or ignore it.')).toBeInTheDocument();
  });
});
