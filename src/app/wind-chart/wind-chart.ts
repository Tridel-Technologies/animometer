import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { NGX_ECHARTS_CONFIG, NgxEchartsModule } from 'ngx-echarts';

@Component({
  selector: 'app-wind-chart',
  standalone: true,
  imports: [NgxEchartsModule],
  template: `<div
    echarts
    [options]="options"
    [style.height.px]="height"
    [style.width.px]="width"
  ></div>`,
  providers: [
    {
      provide: NGX_ECHARTS_CONFIG,
      useValue: { echarts: () => import('echarts') },
    },
  ],
})
export class WindChartComponent implements OnInit, OnChanges {
  options: any;
  chartInstance: any;
  @Input() cast!: string;
  @Input() height!: number;
  @Input() width!: number;
  @Input() windData!: any[];

  ngOnInit(): void {
    this.updateChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['windData'] || changes['width']) && this.windData) {
      this.updateChart();
    }
  }

  directionValue(degrees: number): string {
    degrees = degrees % 360;
    if (degrees < 0) degrees += 360;
    const dirs = [
      'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
    ];
    return dirs[Math.floor((degrees + 11.25) / 22.5) % 16];
  }

  updateChart() {
    if (!this.windData || this.windData.length === 0) return;

    // 1. Sort and Format Data efficiently
    const formatted = [...this.windData]
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
      .map(d => {
        const date = new Date(d.time);
        return {
          time: date,
          label: this.cast === 'now'
            ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : `${date.getDate().toString().padStart(2, '0')}/${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
          speed: Number(d.speed || 0),
          direction: Number(d.direction || 0)
        };
      });

    const times = formatted.map(d => d.label);
    const hasDirection = formatted.some(d => d.direction !== 0 && d.direction !== null);

    // 2. Prepare Series
    const series: any[] = [
      {
        name: 'Value',
        type: 'line',
        data: formatted.map(d => d.speed),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        z: 10,
        lineStyle: { width: 3 },
        itemStyle: { borderWidth: 2, borderColor: '#fff' }
      }
    ];

    if (hasDirection) {
      series.push({
        name: 'Direction',
        type: 'line',
        yAxisIndex: 1,
        data: formatted.map(d => d.direction),
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { width: 1.5, opacity: 0.5, color: '#10b981' },
        itemStyle: { color: '#10b981' }
      });
    }

    // 3. ECharts Options
    this.options = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: '#334155',
        borderWidth: 1,
        textStyle: { color: '#f8fafc', fontSize: 11 },
        padding: [10, 15],
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          const d = formatted[params[0].dataIndex];
          if (!d) return '';
          let tip = `<div class="font-black text-[10px] text-slate-400 uppercase mb-1">${d.time.toLocaleString()}</div>`;
          tip += `<div class="flex items-center justify-between gap-4">
                    <span class="text-xs font-bold text-slate-300 font-mono">VALUE</span>
                    <span class="text-sm font-black text-white">${d.speed.toFixed(2)}</span>
                  </div>`;
          if (hasDirection) {
            tip += `<div class="flex items-center justify-between gap-4 border-t border-slate-700 mt-1 pt-1">
                      <span class="text-xs font-bold text-slate-300 font-mono">DIR</span>
                      <span class="text-sm font-black text-emerald-400">${d.direction.toFixed(1)}° (${this.directionValue(d.direction)})</span>
                    </div>`;
          }
          return tip;
        }
      },
      visualMap: {
        show: false,
        dimension: 1,
        pieces: [
          { gt: 0, lte: 20, color: '#2563eb' },
          { gt: 20, lte: 25, color: '#f59e0b' },
          { gt: 25, color: '#ef4444' }
        ],
        outOfRange: { color: '#2563eb' }
      },
      grid: { top: 20, right: hasDirection ? 45 : 15, bottom: 20, left: 45, containLabel: true },
      xAxis: {
        type: 'category',
        data: times,
        boundaryGap: false,
        axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.1)' } },
        axisLabel: { color: '#94a3b8', fontSize: 9, interval: 'auto' }
      },
      yAxis: [
        {
          type: 'value',
          scale: true,
          axisLabel: { color: '#94a3b8', fontSize: 10 },
          splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.05)', type: 'dashed' } }
        },
        hasDirection ? {
          type: 'value',
          min: 0,
          max: 360,
          interval: 90,
          axisLabel: { color: '#10b981', fontSize: 9 },
          splitLine: { show: false }
        } : null
      ].filter(y => y !== null),
      series: series
    };
  }
}