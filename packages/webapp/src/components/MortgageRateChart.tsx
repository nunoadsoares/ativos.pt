import { useEffect, useState } from 'react';
import ApexChart from 'react-apexcharts';

interface Point { date: string; share: number }

export default function MortgageRateChart() {
  const [data, setData] = useState<Point[]>([]);

  useEffect(() => {
    fetch('/data/mortgage_rate.csv')
      .then(r => r.text())
      .then(text => {
        const rows = text.trim().split('\n').slice(1);
        setData(
          rows
            .map(l => l.split(','))
            .filter(([, v]) => v)                       // ignora vazios
            .map(([date, share]) => ({ date, share: +share }))
        );
      });
  }, []);

  if (!data.length) return <p>Carregar…</p>;

  return (
    <ApexChart
      type="line"
      height={420}
      series={[{
        name: '% de novos créditos indexados à Euribor 6M',
        data: data.map(p => [p.date, p.share])
      }]}
      options={{
        chart:  { id: 'share', zoom: { enabled: true } },
        stroke: { width: 2, curve: 'smooth' },
        xaxis:  { type: 'datetime' },
        yaxis:  {
          labels: { formatter: (v: number) => v.toFixed(1) + '%' },
          min: 0, max: 100
        },
        tooltip: { x: { format: 'yyyy-MM' } }
      }}
    />
  );
}
