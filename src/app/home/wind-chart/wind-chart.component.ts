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
    if (changes['windData'] && this.windData) {
      this.updateChart();
    }
  }

  directionValue(degrees: number): string {
    degrees = degrees % 360;
    if (degrees < 0) degrees += 360;
    const dirs = [
      'N',
      'NNE',
      'NE',
      'ENE',
      'E',
      'ESE',
      'SE',
      'SSE',
      'S',
      'SSW',
      'SW',
      'WSW',
      'W',
      'WNW',
      'NW',
      'NNW',
    ];
    return dirs[Math.floor((degrees + 11.25) / 22.5) % 16];
  }

  updateChart() {
    if (!this.windData || this.windData.length === 0) return;

    const sorted = [...this.windData].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    const formatted = sorted.map((d) => {
      const date = new Date(d.time);
      const label =
        this.cast === 'now'
          ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : `${date.getDate().toString().padStart(2, '0')}/${date
              .getHours()
              .toString()
              .padStart(2, '0')}:${date
              .getMinutes()
              .toString()
              .padStart(2, '0')}`;

      return {
        time: date,
        label,
        speed: d.speed,
        direction: d.direction,
      };
    });

    const times = formatted.map((d) => d.label);

    // ---------------- SPEED COLORS ----------------
    const speedColors = formatted.map((d) => {
      if (d.speed >= 25) return 'red';
      if (d.speed >= 20) return 'orange';
      return '#2563eb';
    });
    const now = new Date().getTime();
    let nearestIdx = 0;
    let smallestDiff = Infinity;

    formatted.forEach((d, i) => {
      const diff = Math.abs(new Date(d.time).getTime() - now);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        nearestIdx = i;
      }
    });

    const glowColor = speedColors[nearestIdx];
    const glowingPointSeries = {
      name: 'Current Time',
      type: 'effectScatter',
      coordinateSystem: 'cartesian2d',
      zlevel: 3,
      rippleEffect: {
        brushType: 'stroke',
        scale: 6,
        period: 3,
      },
      symbolSize: 15,
      itemStyle: { color: glowColor },
      data: [[times[nearestIdx], formatted[nearestIdx].speed]],
    };

    // ---------------- DIRECTION COLORS ----------------
    const directionColors = formatted.map((d) => {
      if (d.direction >= 315 || d.direction < 45) return '#10b981'; // north → green
      if (d.direction >= 45 && d.direction < 135) return '#3b82f6'; // east → blue
      if (d.direction >= 135 && d.direction < 225) return '#eab308'; // south → yellow
      return '#ec4899'; // west → pink
    });

    // ---------------- SPEED SERIES SPLIT ----------------
    const windSpeedSeries: any[] = [];
    for (let i = 0; i < formatted.length - 1; i++) {
      windSpeedSeries.push({
        name: 'Wind Speed',
        type: 'line',
        yAxisIndex: 0,
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: {
          width: 2,
          color: speedColors[i],
        },
        itemStyle: {
          color: speedColors[i],
        },
        data: [
          { value: [formatted[i].label, formatted[i].speed], idx: i },
          {
            value: [formatted[i + 1].label, formatted[i + 1].speed],
            idx: i + 1,
          },
        ],
      });
    }

    // ---------------- DIRECTION SERIES SPLIT ----------------
    const windDirectionSeries: any[] = [];
    for (let i = 0; i < formatted.length - 1; i++) {
      windDirectionSeries.push({
        name: 'Direction',
        type: 'line',
        yAxisIndex: 1,
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: {
          width: 2,
          color: 'green',
        },
        itemStyle: {
          color: 'green',
        },
        data: [
          { value: [formatted[i].label, formatted[i].direction], idx: i },
          {
            value: [formatted[i + 1].label, formatted[i + 1].direction],
            idx: i + 1,
          },
        ],
      });
    }

    // ---------------- TOOLTIP FIX ----------------
    this.options = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const realIdx = params[0].data.idx;
          const d = formatted[realIdx];
          return `
            ${d.time.toLocaleString()}<br>
            <b>Speed:</b> ${d.speed.toFixed(2)} kts<br>
            <b>Direction:</b> ${d.direction.toFixed(1)}° (${this.directionValue(
            d.direction
          )})
          `;
        },
      },

      grid: { top: 10, right: 30, bottom: 30, left: 30, containLabel: true },

      xAxis: {
        type: 'category',
        data: times,
        boundaryGap: false,
      },

      yAxis: [
        {
          type: 'value',
          name: 'Speed (kts)',
          nameLocation: 'middle',
          nameGap: 30,
        },
        {
          type: 'value',
          name: 'Direction (°)',
          nameLocation: 'middle',
          nameGap: 35,
          splitLine: {
            show: false,
          },
          min: 0,
          max: 360,
          interval: 90,
        },
      ],

      series: [...windSpeedSeries, glowingPointSeries, ...windDirectionSeries],
    };
  }
}
