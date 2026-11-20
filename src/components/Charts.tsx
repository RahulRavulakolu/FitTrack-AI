import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts';
export function TrendChart({
  data,
  dataKey = 'weight',
  color = '#baf06c',
  height = 190,
  unit = 'kg',
  bars = false,
  target,
}: {
  data: any[];
  dataKey?: string;
  color?: string;
  height?: number;
  unit?: string;
  bars?: boolean;
  target?: number;
}) {
  const body = (
    <>
      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
      <XAxis
        dataKey="date"
        tickFormatter={(d) => `${d.slice(8)}/${d.slice(5, 7)}`}
        tick={{ fill: 'var(--muted)', fontSize: 11 }}
        axisLine={false}
        tickLine={false}
        minTickGap={24}
      />
      <YAxis
        width={40}
        tick={{ fill: 'var(--muted)', fontSize: 11 }}
        axisLine={false}
        tickLine={false}
        domain={bars ? [0, 'auto'] : ['auto', 'auto']}
      />
      <Tooltip
        contentStyle={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          color: 'var(--text)',
        }}
        formatter={(value: any) => [`${Math.round(Number(value) * 10) / 10} ${unit}`, dataKey]}
        labelStyle={{ color: 'var(--muted)' }}
      />
      {target && (
        <ReferenceLine
          y={target}
          stroke="var(--muted)"
          strokeDasharray="4 4"
          ifOverflow="extendDomain"
        />
      )}
      {bars ? (
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} />
      ) : (
        <Area
          dataKey={dataKey}
          type="monotone"
          stroke={color}
          strokeWidth={2.5}
          fill={color}
          fillOpacity={0.08}
          dot={{ r: 3, fill: color }}
        />
      )}
    </>
  );
  return (
    <div className="chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {bars ? (
          <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            {body}
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            {body}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
