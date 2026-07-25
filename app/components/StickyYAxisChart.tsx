'use client';

import { useEffect, useRef, useState } from 'react';
import { Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  LineController,
  BarController,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// The generic `Chart` component (unlike react-chartjs-2's dedicated `Line`/`Bar`
// components) does not auto-register a controller for its chart type, so both
// controllers must be registered explicitly here.
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, LineController, BarController, Title, Tooltip, Legend);

interface AxisTick {
  pixel: number;
  label: string;
}

interface StickyYAxisChartProps {
  /** Underlying Chart.js chart type to render inside the scrollable area. */
  chartType: 'line' | 'bar';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any;
  height?: number;
  axisWidth?: number;
  minWidth?: number;
  width?: number;
}

/**
 * Renders a Chart.js chart inside a horizontally-scrollable container, while
 * keeping the y-axis labels fixed in place (not scrolling with the data).
 *
 * The native y-axis is hidden on the underlying chart and its computed tick
 * pixel positions are mirrored into a plain HTML overlay that sits outside
 * the scrolling element, so the axis stays visible regardless of how far the
 * user has scrolled horizontally.
 */
export default function StickyYAxisChart({
  chartType,
  data,
  options,
  height = 400,
  axisWidth = 48,
  minWidth = 700,
  width = 900,
}: StickyYAxisChartProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const [ticks, setTicks] = useState<AxisTick[]>([]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const chart = chartRef.current;
      const scale = chart?.scales?.y;
      if (!chart || !scale) return;
      setTicks(
        scale.ticks.map((t: { value: number }) => ({
          pixel: scale.getPixelForValue(t.value),
          label: scale.getLabelForValue(t.value),
        }))
      );
    });
    return () => cancelAnimationFrame(id);
  }, [data, options, height]);

  const mergedOptions = {
    ...options,
    scales: {
      ...options.scales,
      y: {
        ...(options.scales?.y || {}),
        display: false,
      },
    },
  };

  return (
    <div className="relative">
      {/* Fixed y-axis overlay: stays in place while the chart below scrolls horizontally */}
      <div
        className="absolute left-0 top-0 z-10 pointer-events-none midnight-sky-bg"
        style={{ width: axisWidth, height }}
      >
        {ticks.map((t, i) => (
          <div
            key={`${t.label}-${i}`}
            className="absolute right-1 text-xs text-gray-300 font-mono"
            style={{ top: t.pixel - 7 }}
          >
            {t.label}
          </div>
        ))}
      </div>
      <div className="overflow-x-auto w-full" style={{ paddingLeft: axisWidth }}>
        <div className="relative" style={{ minWidth, width, height }}>
          <Chart ref={chartRef} type={chartType} data={data} options={mergedOptions} />
        </div>
      </div>
    </div>
  );
}
