import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Activity } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';
import './Charts.css';

const CHART_THEME = {
    gridColor: '#E1E8F0',
    textColor: '#94A3B8',
    brandColor: '#00CED1',
    competitorColors: ['rgba(0,119,204,0.4)', 'rgba(239,68,68,0.3)', '#64748B', '#CBD5E1']
};

// Custom tooltip
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="chart-tooltip">
            <p className="tooltip-label">{label}</p>
            {payload.map((item, i) => (
                <p key={i} className="tooltip-value" style={{ color: item.color }}>
                    {item.name}: <strong>{item.value?.toFixed(1)}</strong>
                </p>
            ))}
        </div>
    );
}

function lastDelta(data, brand, span = 7) {
    if (!data?.length || data.length < 2) return null;
    const latest = data[data.length - 1]?.[brand];
    const previousIndex = Math.max(0, data.length - 1 - Math.min(span, data.length - 1));
    const previous = data[previousIndex]?.[brand];
    if (typeof latest !== 'number' || typeof previous !== 'number') return null;
    return latest - previous;
}

function BrandDot({ cx, cy, index, total, stroke }) {
    if (cx == null || cy == null) return null;
    const isLast = index === total - 1;

    return (
        <g>
            {isLast ? <circle className="trend-live-ring" cx={cx} cy={cy} r={10} /> : null}
            <circle
                cx={cx}
                cy={cy}
                r={isLast ? 5 : 3.5}
                stroke={stroke}
                strokeWidth={2}
                fill="#f8fcff"
            />
            {isLast ? <circle cx={cx} cy={cy} r={2.6} fill={stroke} /> : null}
        </g>
    );
}

export default function TrendChart({ data, brand }) {
    if (!data || data.length === 0) return null;

    const daySpan = data.length;
    const dataKeys = Object.keys(data[0]).filter(k => k !== 'date' && k !== 'timestamp');
    const competitors = dataKeys.filter(k => k !== brand).slice(0, 4);
    const latestScore = data[data.length - 1]?.[brand];
    const delta7d = lastDelta(data, brand, 7);
    const latestDate = data[data.length - 1]?.date;

    if (daySpan < 2) {
        return (
            <div className="chart-container chart-full">
                <div className="chart-header">
                    <div className="chart-header-copy">
                        <h3>Evolution du score</h3>
                        <span>{brand} - historique en construction</span>
                    </div>
                    <span className="chart-badge">1 point</span>
                </div>
                <div className="chart-body">
                    <div className="trend-single-state">
                        <div className="trend-single-value">
                            <span>Dernier score</span>
                            <strong><AnimatedNumber value={latestScore ?? 0} decimals={1} /></strong>
                            <p>Une nouvelle analyse affichera la vraie trajectoire.</p>
                        </div>
                        <div className="trend-single-marker">
                            <div className="trend-single-axis" />
                            <div className="trend-single-point">
                                <span className="trend-single-glow" />
                                <span className="trend-single-dot" />
                            </div>
                            <div className="trend-single-date">{latestDate || 'maintenant'}</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="chart-container chart-full">
            <div className="chart-header">
                <div className="chart-header-copy">
                    <h3>Evolution du score</h3>
                    <span>{brand} - {daySpan} jours</span>
                </div>
                <div className="trend-header-stats">
                    <div className="trend-stat">
                        <span>Dernier score</span>
                        <strong>
                            <AnimatedNumber value={latestScore ?? 'n/a'} decimals={1} />
                        </strong>
                    </div>
                    <div className={`trend-live-chip ${typeof delta7d === 'number' && delta7d < 0 ? 'down' : 'up'}`}>
                        <Activity size={12} />
                        {typeof delta7d === 'number' ? (
                            <AnimatedNumber
                                value={delta7d}
                                decimals={1}
                                signed
                                suffix=" pts / 7j"
                            />
                        ) : (
                            <span>n/a</span>
                        )}
                    </div>
                </div>
            </div>
            <div className="chart-body">
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="2 6" stroke={CHART_THEME.gridColor} />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: CHART_THEME.textColor }}
                            axisLine={{ stroke: CHART_THEME.gridColor }}
                            tickLine={false}
                            padding={{ left: 10, right: 10 }}
                            angle={-45}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis
                            domain={[0, 100]}
                            tick={{ fontSize: 11, fill: CHART_THEME.textColor }}
                            axisLine={{ stroke: CHART_THEME.gridColor }}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                            iconType="circle" 
                            iconSize={10} 
                            formatter={(value) => <span style={{ color: value === brand ? CHART_THEME.brandColor : '#888', fontSize: 11, fontWeight: value === brand ? 'bold' : 'normal' }}>{value}</span>} 
                        />

                        {/* Target Brand Line */}
                        <Line
                            type="monotone"
                            dataKey={brand}
                            stroke={CHART_THEME.brandColor}
                            strokeWidth={3}
                            dot={(props) => (
                                <BrandDot
                                    {...props}
                                    total={data.length}
                                    stroke={CHART_THEME.brandColor}
                                />
                            )}
                            activeDot={{ r: 6 }}
                            isAnimationActive
                            animationDuration={900}
                            animationEasing="ease-out"
                        />

                        {/* Competitors Lines */}
                        {competitors.map((comp, i) => (
                            <Line
                                key={comp}
                                type="monotone"
                                dataKey={comp}
                                stroke={CHART_THEME.competitorColors[i % CHART_THEME.competitorColors.length]}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                isAnimationActive
                                animationDuration={700}
                                animationEasing="ease-out"
                            />
                        ))}

                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
