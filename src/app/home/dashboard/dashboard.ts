import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from "../../map/map";
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts';
import 'echarts-gl';

interface WidgetData {
  id: string;
  icon: string;
  label: string;
  val: number | undefined;
  unit: string;
  threshold?: { has: boolean; val: number };
  pct: number;
  barColor: string;
  trend?: number[];
  lat?: number;
  lon?: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MapComponent, NgxEchartsDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  providers: [
    provideEchartsCore({ echarts })
  ]
})
export class Dashboard implements OnInit, OnDestroy {
  @Input() anemometerData: any;
  @Input() selectedStation: string | null = null;
  @Input() widgetData: WidgetData[] = [];
  @Input() fullDayTrends: { [key: string]: any[] } = {};
  @Input() isDarkMode: boolean = true;

  currentSlide: number = 1;
  private slideInterval: any;
  // Possible extensions to try in order
  private extensions = ['webp', 'jpeg', 'jpg', 'png'];
  private currentExtIndex = 0;
  private lastDataTimestamp: number = Date.now();
  private watchdogInterval: any;

  constructor(private cdr: ChangeDetectorRef) { }

  get currentImagePath() {
    return `assets/${this.currentSlide}.${this.extensions[this.currentExtIndex]}`;
  }

  onImageError() {
    if (this.currentExtIndex < this.extensions.length - 1) {
      this.currentExtIndex++;
    } else {
      // If all failed, we stop trying for this specific slide
      console.warn(`All extensions failed for slide ${this.currentSlide}`);
    }
  }

  getNormalCards() {
    // Filter out GPS, Battery, and the new Speed/Direction cards as they have special homes. 
    return this.widgetData.filter(w => w.id !== 'gps' && w.id !== 'battery' && w.id !== 'wind_speed' && w.id !== 'wind_direction');
  }

  getGpsCard() {
    return this.widgetData.find(w => w.id === 'gps');
  }

  getBatteryCard() {
    return this.widgetData.find(w => w.id === 'battery');
  }

  getWindSpeedCard() {
    return this.widgetData.find(w => w.id === 'wind_speed');
  }

  getWindDirectionCard() {
    return this.widgetData.find(w => w.id === 'wind_direction');
  }

  getMin(trend: number[] | undefined): number {
    if (!trend || trend.length === 0) return 0;
    return Math.min(...trend);
  }

  getMax(trend: number[] | undefined): number {
    if (!trend || trend.length === 0) return 0;
    return Math.max(...trend);
  }

  isExceedingThreshold(w: WidgetData): boolean {
    if (!w.threshold?.has || w.val === undefined) return false;
    return w.val > w.threshold.val;
  }

  getChartOption(trend: number[] | undefined, isDarkMode: boolean, colorClass: string, id: string): echarts.EChartsOption {
    let rawTrend = trend || [];

    // Optimization: Downsample 5-minute trend (300 pts) for display in small sparklines
    let displayTrend = rawTrend;
    if (rawTrend.length > 150) {
      const step = Math.ceil(rawTrend.length / 150);
      displayTrend = rawTrend.filter((_, i) => i % step === 0 || i === rawTrend.length - 1);
    }

    let color = '#3b82f6'; // default blue
    if (colorClass.includes('cyan')) color = '#22d3ee';
    else if (colorClass.includes('emerald') || colorClass.includes('green')) color = '#10b981';
    else if (colorClass.includes('orange') || colorClass.includes('yellow')) color = '#f97316';
    else if (colorClass.includes('indigo')) color = '#6366f1';

    const widget = this.widgetData.find(w => w.id === id);
    const threshold = widget?.threshold;

    return {
      grid: {
        top: 20,
        bottom: -5,
        left: -5,
        right: -5
      },
      xAxis: {
        type: 'category',
        show: false,
        boundaryGap: false
      },
      yAxis: {
        type: 'value',
        show: false,
        min: 'dataMin',
        max: 'dataMax'
      },
      visualMap: threshold?.has ? {
        show: false,
        pieces: [
          { gt: 0, lte: threshold.val, color: color },
          { gt: threshold.val, color: '#ef4444' } // Red
        ],
        outOfRange: { color: color }
      } : undefined,
      series: [
        {
          data: displayTrend,
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: {
            // color will be handled by visualMap if threshold exists
            color: threshold?.has ? undefined : color,
            width: 2,
            shadowColor: isDarkMode ? color : 'transparent',
            // shadowBlur: isDarkMode ? 5 : 0,
            shadowOffsetY: isDarkMode ? 0 : 0
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: isDarkMode ? 'transparent' : `${color}30` },
              { offset: 1, color: isDarkMode ? 'transparent' : `${color}00` }
            ])
          },
          markPoint: {
            data: [
              { name: 'Max', type: 'max', symbol: 'circle', symbolSize: 6, itemStyle: { color: id === 'solar' ? '#fcd34d' : 'rgba(255,255,255,0.8)', shadowBlur: 8, shadowColor: id === 'solar' ? '#f59e0b' : 'white' } },
              { name: 'Min', type: 'min', symbol: 'circle', symbolSize: 6, itemStyle: { color: id === 'solar' ? '#fcd34d' : 'rgba(255,255,255,0.8)', shadowBlur: 8, shadowColor: id === 'solar' ? '#f59e0b' : 'white' } },
              { name: 'Current', coord: [displayTrend.length - 1, displayTrend[displayTrend.length - 1]], symbol: 'circle', symbolSize: 6, itemStyle: { color: id === 'solar' ? '#fcd34d' : 'rgba(255,255,255,0.8)', shadowBlur: 8, shadowColor: id === 'solar' ? '#f59e0b' : 'white' } }
            ],
            label: { show: false }
          }
        }
      ]
    };
  }

  getLineChartOption(id: string, isDarkMode: boolean): any {
    let data = this.fullDayTrends[id] || [];

    // Downsample if data is large to keep charts crisp
    if (data.length > 500) {
      const step = Math.ceil(data.length / 500);
      data = data.filter((_, i) => i % step === 0);
    }

    const widget = this.widgetData.find(w => w.id === id);
    const label = widget?.label || id;

    let color = '#3b82f6';
    if (id === 'wind_ux') color = '#22d3ee'; // cyan
    else if (id === 'wind_uy') color = '#10b981'; // emerald
    else if (id === 'wind_uz') color = '#f59e0b'; // amber

    const textColor = isDarkMode ? '#cbd5e1' : '#475569';
    const splitLineColor = isDarkMode ? 'rgba(51, 65, 85, 0.2)' : 'rgba(226, 232, 240, 0.5)';

    // Extract values for min/max calculation from the 2D array [time, val]
    const values = data.map(d => d[1]);
    const minVal = values.length > 0 ? Math.min(...values) : 0;
    const maxVal = values.length > 0 ? Math.max(...values) : 0;

    return {
      grid: {
        top: 20,
        bottom: 20,
        left: 45,
        right: 15
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        borderColor: isDarkMode ? '#334155' : '#e2e8f0',
        textStyle: { color: textColor, fontSize: 10 },
        formatter: (params: any) => {
          const p = params[0];
          const time = new Date(p.value[0]).toLocaleTimeString('en-US', { hour12: false });
          const val = p.value[1];
          const unit = widget?.unit || '';
          return `
            <div class="flex flex-col gap-1">
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">${time}</span>
              <div class="flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span class="font-bold text-xs text-slate-800 dark:text-white">${label}: ${val.toFixed(2)} ${unit}</span>
              </div>
            </div>`;
        }
      },
      xAxis: {
        type: 'category',
        show: true,
        axisLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { show: false },
        axisTick: { show: false },
        boundaryGap: false
      },
      yAxis: {
        type: 'value',
        name: label,
        nameTextStyle: { color: textColor, fontSize: 9, fontWeight: 'bold', align: 'left' },
        min: minVal,
        max: maxVal,
        axisLabel: {
          color: textColor,
          fontSize: 9,
          formatter: (value: number) => {
            // Only show labels for Min, Max, and Zero
            if (value === minVal || value === maxVal || value === 0) {
              return value.toFixed(1);
            }
            return '';
          }
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: { color: splitLineColor, type: 'dashed' },
          // Only show lines for our key values
          interval: (index: number, value: number) => {
            return value === minVal || value === maxVal || value === 0;
          }
        }
      },
      visualMap: widget?.threshold?.has ? {
        show: false,
        pieces: [
          { gt: 0, lte: widget.threshold.val, color: color },
          { gt: widget.threshold.val, color: '#ef4444' }
        ],
        outOfRange: { color: color }
      } : undefined,
      series: [{
        data: data,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: widget?.threshold?.has ? undefined : color,
          width: 2
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `${color}30` },
            { offset: 1, color: 'transparent' }
          ])
        }
      }]
    };
  }

  getSensorStatuses() {
    const battery = this.widgetData.find(w => w.id === 'battery')?.val || 0;
    const now = new Date();
    const timeDiff = now.getTime() - this.lastDataTimestamp;
    const isOnline = timeDiff < 5000;

    // We'll use the last data timestamp for the 'time' display if offline, or 'now' if online
    const displayTime = isOnline ? now : new Date(this.lastDataTimestamp);

    const formattedDate = displayTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = displayTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const timestamp = `${formattedDate} ${formattedTime}`;

    const statusValue = isOnline ? 'online' : 'offline';
    const pressure = this.widgetData.find(w => w.id === 'pressure');
    const pressureVal = pressure?.val || '1013.2';
    const pressureUnit = pressure?.unit || 'hPa';
    const batteryUnit = this.widgetData.find(w => w.id === 'battery')?.unit || 'V';

    const anemometerStatus = isOnline ? 'online' : 'offline';
    const pressureStatus = (isOnline && Number(pressureVal) !== 0) ? 'online' : 'offline';
    const batteryStatus = (isOnline && Number(battery) !== 0) ? 'online' : 'offline';
    const baroStatus = isOnline ? 'online' : 'offline';

    return [
      { id: 'anemometer', label: 'Anemometer', icon: 'fa-wind', val: anemometerStatus === 'online' ? 'Active' : 'Offline', unit: '', status: anemometerStatus, time: timestamp },
      { id: 'pressure', label: 'Pressure', icon: 'fa-gauge-high', val: `${Number(pressureVal).toFixed(2)}`, unit: pressureUnit, status: pressureStatus, time: timestamp },
      { id: 'battery', label: 'Battery Unit', icon: 'fa-battery-three-quarters', val: `${Number(battery).toFixed(2)}`, unit: batteryUnit, status: batteryStatus, time: timestamp },
      { id: 'barometric', label: 'Barometric', icon: 'fa-cloud', val: baroStatus === 'online' ? 'Normal' : 'Standby', unit: '', status: baroStatus, time: timestamp },
    ];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['anemometerData'] && changes['anemometerData'].currentValue) {
      this.lastDataTimestamp = Date.now();
    }
  }

  ngOnInit(): void {
    this.slideInterval = setInterval(() => {
      this.currentSlide = this.currentSlide === 3 ? 1 : this.currentSlide + 1;
      this.currentExtIndex = 0; // Reset extension search for new slide
    }, 3000);

    // Watchdog trigger for sensor status
    this.watchdogInterval = setInterval(() => {
      this.cdr.markForCheck(); // Ensure template is updated even if no data comes in
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
    }
  }
}
