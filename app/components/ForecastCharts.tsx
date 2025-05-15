"use client";

import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { DateTime } from 'luxon';
import Image from 'next/image';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface HourlyPeriod {
  startTime: string;
  temperature: number;
  dewpoint?: { value: number | null };
  probabilityOfPrecipitation?: { value: number | null };
  relativeHumidity?: { value: number | null };
  windSpeed?: string;
}

interface HourlyForecast {
  properties?: {
    periods?: HourlyPeriod[];
  };
}

interface ForecastChartsProps {
  hourly: unknown;
  timeZone?: string;
}

export default function ForecastCharts({ hourly, timeZone }: ForecastChartsProps) {
  const [showTemp, setShowTemp] = useState(false);
  const [showPrecip, setShowPrecip] = useState(false);
  const [showWind, setShowWind] = useState(false);

  // Type guard for hourly
  const periods: HourlyPeriod[] = (hourly && typeof hourly === 'object' && 'properties' in hourly && (hourly as HourlyForecast).properties?.periods)
    ? (hourly as HourlyForecast).properties!.periods || []
    : [];

  // Prepare data for charts -> use AM/PM, without AM/PM
  const labels = periods.map((p) => {
    return DateTime.fromISO(p.startTime, { zone: 'utc' }).setZone(timeZone || 'utc').toFormat('EEE h a');
  });
  const tempData = periods.map((p) => p.temperature);

  //  Convert dewpoint to Fahrenheit
  const dewpointData = periods.map((p) => p.dewpoint?.value ? (p.dewpoint.value * 9/5) + 32 : null);
  const precipData = periods.map((p) => p.probabilityOfPrecipitation?.value);
  const humidityData = periods.map((p) => p.relativeHumidity?.value);
  const windData = periods.map((p) => parseInt((p.windSpeed || '0').split(' ')[0], 10));

  // Chart.js datasets
  const tempChart = {
    labels,
    datasets: [
      {
        label: 'Temperature (°F)',
        data: tempData,
        borderColor: '#B31942',
        backgroundColor: 'rgb(179, 25, 66, 0.2)',
        pointRadius: 0,
      },
      {
        label: 'Dewpoint (°F)',
        data: dewpointData,
        borderColor: '#FFFFFF',
        backgroundColor: 'rgb(255, 255, 255, 0.2)',
        pointRadius: 0,
      },
    ],
  };
  const tempOptions = {
    responsive: true,
    interaction: { mode: 'index' as const, intersect: false },
    stacked: false,
    plugins: { 
      legend: { position: 'top' as const, labels: {boxHeight: 1} }
    },
    scales: {
      y: { 
        type: 'linear' as const, 
        display: true, 
        position: 'left' as const, 
        title: { display: true, text: '°F' },
        grid: {
          color: 'rgb(255, 255, 255, 0.1)',
          drawOnChartArea: true,
        }
      },
      x: {
        grid: {
          drawOnChartArea: false,
        }
      }
    },
    maintainAspectRatio: false,
  };

  const precipChart = {
    labels,
    datasets: [
      {
        label: 'Precipitation (%)',
        data: precipData,
        borderColor: '#B31942',
        backgroundColor: 'rgb(179, 25, 66, 0.2)',
        pointRadius: 0,
      },
      {
        label: 'Humidity (%)',
        data: humidityData,
        borderColor: '#FFFFFF',
        backgroundColor: 'rgb(255, 255, 255, 0.1)',
        pointRadius: 0,
      },
    ],
  };
  const precipOptions = {
    responsive: true,
    plugins: { 
      legend: { position: 'top' as const, labels: {boxHeight: 1} },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: { 
      y: { 
        beginAtZero: true, 
        title: { display: true, text: '%' },
        grid: {
          color: 'rgb(255, 255, 255, 0.1)',
          drawOnChartArea: true,
        }
      },
      x: {
        grid: {
          drawOnChartArea: false,
        }
      }
    },
    maintainAspectRatio: false,
  };

  const windChart = {
    labels,
    datasets: [
      {
        label: 'Windspeed (mph)',
        data: windData,
        borderColor: '#B31942',
        backgroundColor: 'rgb(179, 25, 66, 0.2)',
        pointRadius: 0,
      },
    ],
  };
  const windOptions = {
    responsive: true,
    plugins: { 
      legend: { position: 'top' as const, labels: {boxHeight: 1} },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: { 
      y: { 
        beginAtZero: true, 
        title: { display: true, text: 'mph' },
        grid: {
          color: 'rgb(255, 255, 255, 0.2)',
          drawOnChartArea: true,
        }
      },
      x: {
        grid: {
          drawOnChartArea: false,
        }
      }
    },
    maintainAspectRatio: false,
  };

  return (
    <div className="">
      {/* Temperature & Dewpoint Chart (collapsible) */}
      <div className="midnight-sky-bg p-4 pt-6 shadow border-t border-l border-r us-white-border">
        <button 
          className="us-white-text mb-2 flex items-center justify-between w-full text-left" 
          onClick={() => setShowTemp((v) => !v)}
        >
          <span>{showTemp ? 'Hide' : 'Show'} Temperature & Dewpoint</span>
          <Image 
            src={showTemp ? '/icons/open-btn.svg' : '/icons/closed-btn.svg'} 
            alt={showTemp ? 'Open' : 'Closed'} 
            width={16} 
            height={16}
            className={`transition-transform duration-300 ${showTemp ? 'rotate-180' : ''}`}
          />
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showTemp ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="relative">
            <div className="overflow-x-auto w-full">
              <div className="min-w-[700px] w-[900px] relative" style={{ height: '400px' }}>
                <Line data={tempChart} options={tempOptions} />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Precipitation & Humidity Chart (collapsible) */}
      <div className="midnight-sky-bg p-4 pt-6 shadow border us-white-border">
        <button 
          className="us-white-text mb-2 flex items-center justify-between w-full text-left" 
          onClick={() => setShowPrecip((v) => !v)}
        >
          <span>{showPrecip ? 'Hide' : 'Show'} Precipitation Probability & Humidity</span>
          <Image 
            src={showPrecip ? '/icons/open-btn.svg' : '/icons/closed-btn.svg'} 
            alt={showPrecip ? 'Open' : 'Closed'} 
            width={16} 
            height={16}
            className={`transition-transform duration-300 ${showPrecip ? 'rotate-180' : ''}`}
          />
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showPrecip ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="relative">
            <div className="overflow-x-auto w-full">
              <div className="min-w-[700px] w-[900px] relative" style={{ height: '400px' }}>
                <Line data={precipChart} options={precipOptions} />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Windspeed Chart (collapsible) */}
      <div className="midnight-sky-bg p-4 pt-6 shadow border-l border-r border-b us-white-border">
        <button 
          className="us-white-text mb-2 flex items-center justify-between w-full text-left" 
          onClick={() => setShowWind((v) => !v)}
        >
          <span>{showWind ? 'Hide' : 'Show'} Windspeed</span>
          <Image 
            src={showWind ? '/icons/open-btn.svg' : '/icons/closed-btn.svg'} 
            alt={showWind ? 'Open' : 'Closed'} 
            width={16} 
            height={16}
            className={`transition-transform duration-300 ${showWind ? 'rotate-180' : ''}`}
          />
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showWind ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="relative">
            <div className="overflow-x-auto w-full">
              <div className="min-w-[700px] w-[900px] relative" style={{ height: '400px' }}>
                <Line data={windChart} options={windOptions} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 