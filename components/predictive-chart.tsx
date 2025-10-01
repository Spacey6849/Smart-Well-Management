"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { WellData, forecastWaterLevel, PredictionPoint } from '@/lib/well-data';

interface PredictiveChartProps { well: WellData; futureHours?: number }

interface ChartDatum { time: string; waterLevel: number; projected: boolean }

export function PredictiveChart({ well, futureHours = 12 }: PredictiveChartProps) {
  const data: ChartDatum[] = forecastWaterLevel(well.history, futureHours).map(p => ({
    time: p.timestamp.getHours().toString().padStart(2,'0') + ':00',
    waterLevel: Number(p.waterLevel.toFixed(2)),
    projected: p.projected
  }));

  const lastReal = data.filter(d=>!d.projected).slice(-1)[0];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 8, right: 4, top: 8, bottom: 4 }}>
          <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(data.length/8))} />
          <YAxis tick={{ fontSize: 10 }} domain={['dataMin - 2', 'dataMax + 2']} />
          <Tooltip contentStyle={{ fontSize: '12px' }} formatter={(v: any, n: any, p: any)=>[v + ' m', p.payload.projected ? 'Projected' : 'Water Level']} />
          <Line type="monotone" dataKey="waterLevel" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
          {/* Overlay projected segment using dashed style by drawing second line over projected points */}
          <Line type="monotone" data={data.filter(d=>d.projected)} dataKey="waterLevel" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
          {lastReal && <ReferenceLine x={lastReal.time} stroke="#9ca3af" strokeDasharray="2 2" label={{ value: 'Now', position: 'top', fontSize: 10 }} />}
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Solid line: historical last 24h. Dashed: next {futureHours}h linear forecast.</p>
    </div>
  );
}
