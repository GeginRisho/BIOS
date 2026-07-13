'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface SimulationChartsProps {
  scenario: string;
  horizon: string;
  businessName: string;
  simulationData?: {
    timeline: Array<{
      period: number;
      date: string;
      revenue: number;
      operating_cost: number;
      profit_margin: number;
      cash_reserve: number;
    }>;
  } | null;
}

export default function SimulationCharts({ scenario, horizon, businessName, simulationData }: SimulationChartsProps) {
  const steps = parseInt(horizon) || 12;

  // Generate mock chart data points dynamically based on parameters
  const generateData = () => {
    if (simulationData && simulationData.timeline && simulationData.timeline.length > 0) {
      return simulationData.timeline.map((item) => {
        const scaledRevenue = Math.round((item.revenue / 4000) * 10) / 10;
        const variance = item.period * (scenario === "recession" ? 2.5 : 1.5);
        return {
          name: `Month ${String(item.period).padStart(2, '0')}`,
          Revenue: Math.max(10, scaledRevenue),
          Risk: Math.min(100, Math.max(0, Math.round((100 - item.profit_margin) * 10) / 10)),
          'Confidence Upper': Math.round((scaledRevenue + variance) * 10) / 10,
          'Confidence Lower': Math.max(0, Math.round((scaledRevenue - variance) * 10) / 10)
        };
      });
    }

    const data = [];
    let baseRevenue = 100;
    let baseRisk = 15;

    for (let i = 0; i <= steps; i++) {
      const monthLabel = `Month ${String(i).padStart(2, '0')}`;
      let multiplier = 1;
      let riskMultiplier = 1;

      if (scenario === "inflation") {
        multiplier = 1 - (i * 0.008); // flat/downward costs pressure
        riskMultiplier = 1 + (i * 0.03); // higher risk
      } else if (scenario === "recession") {
        multiplier = 1 - (i * 0.02); // rapid revenue decrease
        riskMultiplier = 1 + (i * 0.05); // high distress Z-score risk
      } else if (scenario === "supply_shortage") {
        multiplier = 1 + (Math.sin(i / 1.5) * 0.04) - (i * 0.003); // volatile flat supply shocks
        riskMultiplier = 1 + (i * 0.02) + (Math.cos(i) * 0.05);
      } else {
        // Base Case (healthy growth)
        multiplier = 1 + (i * 0.015); // +1.5% growth monthly
        riskMultiplier = 1 - (i * 0.01); // lower risk Z-score
      }

      const revenue = Math.max(10, Math.round(baseRevenue * multiplier * 10) / 10);
      const risk = Math.min(100, Math.max(0, Math.round(baseRisk * riskMultiplier * 10) / 10));

      // Forecast Cone margins (confidence interval)
      const variance = i * (scenario === "recession" ? 2.5 : 1.5);
      const upperRev = Math.round((revenue + variance) * 10) / 10;
      const lowerRev = Math.max(0, Math.round((revenue - variance) * 10) / 10);

      data.push({
        name: monthLabel,
        Revenue: revenue,
        Risk: risk,
        'Confidence Upper': upperRev,
        'Confidence Lower': lowerRev
      });
    }
    return data;
  };

  const chartData = generateData();

  // Explain in child-friendly words what the simulation is showing
  const getExplanation = () => {
    switch (scenario) {
      case "inflation":
        return "Everything becomes more expensive! Because buying raw materials and shipping costs more money, the company's profit flattens and its Risk score rises slowly.";
      case "recession":
        return "People stop buying as many things because of an economic slowdown! The company's sales drop quickly, and its financial Risk index jumps up significantly.";
      case "supply_shortage":
        return "Ships and trucks are delayed! The company cannot get parts on time, so its revenue goes up and down randomly, and risk becomes unstable.";
      default:
        return "Normal happy days! The economy is stable, the company is selling more goods every month, its revenue grows steadily, and its financial risk decreases.";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Visual Chart Plot Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* REVENUE FORECAST CONE (AreaChart) */}
        <div className="glass-card bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue Forecast Horizon</h4>
            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-mono font-bold">Est ($ Millions)</span>
          </div>

          <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.01}/>
                  </linearGradient>
                  <linearGradient id="colorCone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.001}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} />
                <YAxis stroke="#94A3B8" fontSize={9} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                
                {/* Forecast confidence interval cone */}
                <Area 
                  type="monotone" 
                  dataKey="Confidence Upper" 
                  stroke="none" 
                  fill="url(#colorCone)" 
                  name="Confidence Range" 
                />
                <Area 
                  type="monotone" 
                  dataKey="Confidence Lower" 
                  stroke="none" 
                  fill="#FFFFFF" 
                  name="" 
                />
                
                {/* Main Projected Line */}
                <Area 
                  type="monotone" 
                  dataKey="Revenue" 
                  stroke="#10B981" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                  name="Projected Revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RISK DISTRESS CHART (LineChart) */}
        <div className="glass-card bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Distress & Risk Timeline</h4>
            <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded font-mono font-bold">Z-Score Risk %</span>
          </div>

          <div className="w-full h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} />
                <YAxis stroke="#94A3B8" fontSize={9} domain={[0, 100]} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                
                <Line 
                  type="monotone" 
                  dataKey="Risk" 
                  stroke={scenario === "base" ? "#10B981" : "#EF4444"} 
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                  name="Risk Index"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Child-friendly explanation overlay */}
      <div className="bg-teal-50/60 border border-teal-100 rounded-2xl p-5 flex items-start space-x-3.5 shadow-sm">
        <div className="text-xl">💡</div>
        <div>
          <h4 className="font-bold text-slate-800 text-sm mb-1">Simple Explanation: &ldquo;{scenario.replace('_', ' ').toUpperCase()}&rdquo;</h4>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            {getExplanation()}
          </p>
        </div>
      </div>

    </div>
  );
}
