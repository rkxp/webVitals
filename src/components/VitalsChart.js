'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { X } from 'lucide-react';
import { getVitalsData } from '@/lib/storage';

export default function VitalsChart({ urlId, urlName, onClose }) {
  const [chartData, setChartData] = useState([]);
  const [selectedMetrics, setSelectedMetrics] = useState(['performance', 'lcp', 'fcp']);
  const [timeRange, setTimeRange] = useState('all');

  const metrics = [
    { key: 'performance', name: 'Performance Score', color: '#8884d8', unit: '/100' },
    { key: 'lcp', name: 'LCP', color: '#82ca9d', unit: 's' },
    { key: 'fcp', name: 'FCP', color: '#ffc658', unit: 's' },
    { key: 'cls', name: 'CLS', color: '#ff7300', unit: '' },
    { key: 'ttfb', name: 'TTFB', color: '#00ff00', unit: 's' },
    { key: 'inp', name: 'INP', color: '#ff0000', unit: 'ms' },
  ];

  useEffect(() => {
    const allData = getVitalsData();
    const urlData = allData[urlId] || [];
    
    // Filter data based on time range
    let filteredData = urlData;
    const now = new Date();
    
    switch (timeRange) {
      case '24h':
        filteredData = urlData.filter(point => {
          const pointDate = new Date(point.timestamp);
          return now - pointDate < 24 * 60 * 60 * 1000;
        });
        break;
      case '7d':
        filteredData = urlData.filter(point => {
          const pointDate = new Date(point.timestamp);
          return now - pointDate < 7 * 24 * 60 * 60 * 1000;
        });
        break;
      case '30d':
        filteredData = urlData.filter(point => {
          const pointDate = new Date(point.timestamp);
          return now - pointDate < 30 * 24 * 60 * 60 * 1000;
        });
        break;
      default:
        // 'all' - use all data
        break;
    }
    
    // Format data for the chart
    const formattedData = filteredData.map(point => ({
      timestamp: new Date(point.timestamp).toLocaleDateString(),
      fullTimestamp: point.timestamp,
      performance: point.performance || 0,
      lcp: point.lcp || 0,
      fcp: point.fcp || 0,
      cls: point.cls ? point.cls * 100 : 0, // Scale CLS for better visibility
      ttfb: point.ttfb || 0,
      inp: point.inp ? point.inp / 1000 : 0, // Convert INP to seconds for consistency
    }));
    
    setChartData(formattedData);
  }, [urlId, timeRange]);

  const toggleMetric = (metricKey) => {
    setSelectedMetrics(prev => 
      prev.includes(metricKey) 
        ? prev.filter(m => m !== metricKey)
        : [...prev, metricKey]
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-popover-foreground mb-2">
            {new Date(data.fullTimestamp).toLocaleString()}
          </p>
          {payload.map((entry, index) => {
            const metric = metrics.find(m => m.key === entry.dataKey);
            let value = entry.value;
            
            // Format value based on metric type
            if (entry.dataKey === 'cls') {
              value = (value / 100).toFixed(3); // Convert back from scaled value
            } else if (entry.dataKey === 'inp') {
              value = (value * 1000).toFixed(0) + 'ms'; // Convert back to ms
            } else if (entry.dataKey === 'performance') {
              value = value + '/100';
            } else {
              value = value.toFixed(2) + 's';
            }
            
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {metric?.name}: {value}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[2147483648]">
      <div className="bg-card rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-card-foreground">Web Vitals Trends</h2>
            <p className="text-sm text-muted-foreground">{urlName}</p>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Controls */}
          <div className="flex flex-wrap gap-4 mb-6">
            {/* Time Range Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-muted-foreground">Time Range:</span>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="input-field text-sm"
              >
                <option value="all">All Time</option>
                <option value="30d">Last 30 Days</option>
                <option value="7d">Last 7 Days</option>
                <option value="24h">Last 24 Hours</option>
              </select>
            </div>

            {/* Metric Toggles */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-muted-foreground">Metrics:</span>
              <div className="flex flex-wrap gap-2">
                {metrics.map(metric => (
                  <button
                    key={metric.key}
                    onClick={() => toggleMetric(metric.key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedMetrics.includes(metric.key)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-accent'
                    }`}
                    style={selectedMetrics.includes(metric.key) ? { backgroundColor: metric.color } : {}}
                  >
                    {metric.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 ? (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  
                  {selectedMetrics.map(metricKey => {
                    const metric = metrics.find(m => m.key === metricKey);
                    return (
                      <Line
                        key={metricKey}
                        type="monotone"
                        dataKey={metricKey}
                        stroke={metric.color}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        name={metric.name}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground">No data available for the selected time range.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Refresh the data to see trends over time.
                </p>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 p-4 bg-secondary rounded-lg">
            <h4 className="text-sm font-medium text-foreground mb-2">Chart Notes:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• CLS values are scaled by 100 for better visibility</li>
              <li>• INP values are converted to seconds for consistency</li>
              <li>• Performance scores are out of 100</li>
              <li>• Time-based metrics (LCP, FCP, TTFB) are in seconds</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}