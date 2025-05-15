"use client";

import React, { useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import Image from 'next/image';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

interface ClimateStation {
  id: string;
  name: string;
  mindate: string;
  maxdate: string;
  latitude: number;
  longitude: number;
  distance?: number;
}

interface ClimateData {
  station: ClimateStation;
  data: Record<string, unknown>[];
  warning?: string;
}

interface ClimateChartsProps {
  climate: ClimateData | null;
  loading: boolean;
  error: string | null;
}

export default function ClimateCharts({ climate, loading, error }: ClimateChartsProps & { error?: { code?: string; error?: string; status?: number } | string }) {
  const [showTemp, setShowTemp] = useState(false);
  const [showPrecip, setShowPrecip] = useState(false);

  if (loading) return <div className="loader-bar"></div>;
  
  // Handle specific HTTP status codes
  if (typeof error === 'object' && error !== null) {
    const status = (error as Record<string, unknown>).status;
    if (status === 500) {
      return <div className="bg-red-900 text-red-200 border-l-4 border-red-400 p-3 mb-2 rounded">NOAA Climate Data service encountered an internal error. Please try again later.</div>;
    }
    if (status === 502 || status === 503) {
      return <div className="bg-yellow-900 text-yellow-200 border-l-4 border-yellow-400 p-3 mb-2 rounded">NOAA Climate Data service is temporarily unavailable. Please try again in a few minutes.</div>;
    }
    if (status === 429) {
      return <div className="bg-yellow-900 text-yellow-200 border-l-4 border-yellow-400 p-3 mb-2 rounded">Too many requests to NOAA Climate Data service. Please try again in a few minutes.</div>;
    }
    if ('code' in (error as Record<string, unknown>) && (error as Record<string, unknown>).code === 'service_unavailable') {
      return <div className="bg-yellow-900 text-yellow-200 border-l-4 border-yellow-400 p-3 mb-2 rounded">NOAA Climate Data service is temporarily unavailable. Please try again later.</div>;
    }
    if ('error' in (error as Record<string, unknown>)) {
      return <div className="text-red-400 p-4">{(error as Record<string, unknown>).error as string}</div>;
    }
  }
  if (error) return <div className="text-red-400 p-4">{error as string}</div>;
  if (!climate || !climate.data || !climate.data.length) return <div className="text-gray-400 p-4">No climate data available close to the selected location.</div>;

  // Prepare data for charting
  // Group by month, get TAVG, TMIN, TMAX, PRCP for each month
  // values have to be converted to Fahrenheit
  const months = Array.from(new Set(climate.data.map((d) => (d.date as string).slice(0, 7))));
  const tavg: (number | null)[] = months.map((m) => {
    const entry = climate.data.find((d) => (d.date as string).startsWith(m) && d.datatype === "TAVG");
    return typeof entry?.value === "number" ? (entry.value * 9/5 + 32) : null;
  });
  const tmin: (number | null)[] = months.map((m) => {
    const entry = climate.data.find((d) => (d.date as string).startsWith(m) && d.datatype === "TMIN");
    return typeof entry?.value === "number" ? (entry.value * 9/5 + 32) : null;
  });
  const tmax: (number | null)[] = months.map((m) => {
    const entry = climate.data.find((d) => (d.date as string).startsWith(m) && d.datatype === "TMAX");
    return typeof entry?.value === "number" ? (entry.value * 9/5 + 32) : null;
  });
  const prcp: (number | null)[] = months.map((m) => {
    const entry = climate.data.find((d) => (d.date as string).startsWith(m) && d.datatype === "PRCP");
    return typeof entry?.value === "number" ? entry.value : null;
  });

  // X-axis labels: year + ' + month abbreviation -> example: Apr 15' -> add ' to the end of the label
  const labels = months.map((m) => {
    const [year, month] = m.split("-") ;
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString("en-US", { year: "2-digit", month: "short" }) + "'";
  });

  // Temperature chart config
  const tempChart = {
    labels,
    datasets: [
      {
        label: "TAVG (°F)",
        data: tavg,
        borderColor: "#B31942",
        backgroundColor: "rgb(179, 25, 66, 0.2)",
        pointRadius: 0,
        yAxisID: "y",
      },
      {
        label: "TMIN (°F)",
        data: tmin,
        borderColor: "#0A3161",
        backgroundColor: "rgb(10, 49, 97, 0.8)",
        pointRadius: 0,
        yAxisID: "y",
      },
      {
        label: "TMAX (°F)",
        data: tmax,
        borderColor: "#FFFFFF",
        backgroundColor: "rgb(255, 255, 255, 0.2)",
        pointRadius: 0,
        yAxisID: "y",
      },
    ],
  };
  const tempOptions = {
    responsive: true,
    interaction: { mode: "index" as const, intersect: false },
    stacked: false,
    plugins: { 
      legend: { position: "top" as const, labels: {boxHeight: 1} },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      y: { 
        type: "linear" as const, 
        display: true, 
        position: "left" as const, 
        title: { display: true, text: "°F" },
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

  // Precipitation chart config
  const prcpChart = {
    labels,
    datasets: [
      {
        label: "PRCP (mm)",
        data: prcp,
        borderColor: "#FFFFFF",
        backgroundColor: "rgb(255, 255, 255, 0.8)",
        type: "bar" as const,
      },
    ],
  };
  const prcpOptions = {
    responsive: true,
    plugins: { 
      legend: { position: "top" as const, labels: {boxHeight: 5} },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: { 
      y: { 
        beginAtZero: true, 
        title: { display: true, text: "mm" },
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

  return (
    <div className="">
      {climate.warning && (
        <div className="red-inferno-bg us-white-text border-l-4 orange-border p-3 mb-2 rounded">
          {climate.warning}
        </div>
      )}
      <div className="text-gray-200 font-mono mt-5 mb-2">
        Climate Data Station: <span className="font-semibold">{climate.station.name}</span>
        {typeof climate.station.distance === 'number' && (
          <span className="ml-2 text-gray-400">({climate.station.distance.toFixed(1)} km away)</span>
        )}
      </div>
      {/* Temperature Chart (collapsible) */}
      <div className="midnight-sky-bg p-4 pt-6 shadow border us-white-border">
        <button 
          className="us-white-text mb-2 flex items-center justify-between w-full text-left" 
          onClick={() => setShowTemp((v) => !v)}
        >
          <span>{showTemp ? "Hide" : "Show"} Temperature (TAVG, TMIN, TMAX)</span>
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
      {/* Precipitation Chart (collapsible) */}
      <div className="midnight-sky-bg p-4 pt-6 shadow border-r border-l border-b us-white-border">
        <button 
          className="us-white-text mb-2 flex items-center justify-between w-full text-left" 
          onClick={() => setShowPrecip((v) => !v)}
        >
          <span>{showPrecip ? "Hide" : "Show"} Precipitation (PRCP)</span>
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
                <Bar data={prcpChart} options={prcpOptions} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 