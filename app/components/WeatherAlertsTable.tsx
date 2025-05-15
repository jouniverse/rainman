"use client";

import React, { useState, useEffect } from "react";
import Image from 'next/image';

interface Alert {
  headline: string;
  description: string;
  severity: string;
  certainty: string;
  urgency: string;
  event: string;
  instruction?: string | null;
  effective: string;
  expires: string;
}

interface AlertFeature {
  properties: Alert;
}

interface AlertsApiResponse {
  features: AlertFeature[];
  title?: string;
}

interface WeatherAlertsTableProps {
  countyUrl: string; // e.g. https://api.weather.gov/zones/county/CAC037
}

export default function WeatherAlertsTable({ countyUrl }: WeatherAlertsTableProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [title, setTitle] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Extract county code from countyUrl
  const countyCode = countyUrl.split("/").pop() || "";

  useEffect(() => {
    if (!countyCode) return;
    setLoading(true);
    setError(null);
    fetch(`https://api.weather.gov/alerts/active/zone/${countyCode}`, {
      headers: { "User-Agent": "rainman.com,jouni.dev@gmail.com" },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch alerts");
        return res.json();
      })
      .then((data: AlertsApiResponse) => {
        setTitle(data.title);
        if (Array.isArray(data.features)) {
          setAlerts(
            (data.features as AlertFeature[]).map((f) => ({
              headline: f.properties.headline,
              description: f.properties.description,
              severity: f.properties.severity,
              certainty: f.properties.certainty,
              urgency: f.properties.urgency,
              event: f.properties.event,
              instruction: f.properties.instruction,
              effective: f.properties.effective,
              expires: f.properties.expires,
            }))
          );
        } else {
          setAlerts([]);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [countyCode]);

  return (
    <div className="midnight-sky-bg p-4 pt-6 shadow border us-white-border">
      <button
        className="us-white-text mb-2 flex items-center justify-between w-full"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{open ? "Hide" : "Show"} Weather Alerts</span>
        <Image 
          src={open ? '/icons/open-btn.svg' : '/icons/closed-btn.svg'} 
          alt={open ? 'Open' : 'Closed'} 
          width={16} 
          height={16}
          className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {title && <div className="text-lg font-bold text-gray-200 mb-2">{title}</div>}
        {loading && <div className="text-gray-400">Loading alerts...</div>}
        {error && <div className="text-red-400">{error}</div>}
        {!loading && !error && alerts.length === 0 && (
          <div className="pistachio-text">No active alerts for this county.</div>
        )}
        {alerts.length > 0 && (
          <div className="space-y-6">
            {alerts.map((a, i) => (
              <div key={i} className="bg-gray-700 rounded-lg p-4 shadow">
                <table className="w-full text-sm text-left text-gray-300">
                  <tbody>
                    <tr>
                      <th className="pr-4 align-top text-red-300">Headline</th>
                      <td className="font-semibold text-red-200">{a.headline}</td>
                    </tr>
                    <tr>
                      <th className="pr-4 align-top">Event</th>
                      <td>{a.event}</td>
                    </tr>
                    <tr>
                      <th className="pr-4 align-top">Severity</th>
                      <td>{a.severity}</td>
                    </tr>
                    <tr>
                      <th className="pr-4 align-top">Certainty</th>
                      <td>{a.certainty}</td>
                    </tr>
                    <tr>
                      <th className="pr-4 align-top">Urgency</th>
                      <td>{a.urgency}</td>
                    </tr>
                    <tr>
                      <th className="pr-4 align-top">Effective</th>
                      <td>{new Date(a.effective).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                    </tr>
                    <tr>
                      <th className="pr-4 align-top">Expires</th>
                      <td>{new Date(a.expires).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</td>
                    </tr>
                    <tr>
                      <th className="pr-4 align-top">Description</th>
                      <td>{a.description}</td>
                    </tr>
                    {a.instruction && (
                      <tr>
                        <th className="pr-4 align-top">Instruction</th>
                        <td>{a.instruction}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 