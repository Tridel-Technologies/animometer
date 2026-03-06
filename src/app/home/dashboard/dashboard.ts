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
export class Dashboard implements OnInit, OnDestroy, OnChanges {
  @Input() anemometerData: any;
  @Input() selectedStation: string | null = null;
  @Input() widgetData: WidgetData[] = [];
  @Input() fullDayTrends: { [key: string]: any[] } = {};
  @Input() isDarkMode: boolean = true;

  currentSlide: number = 1;
  private slideInterval: any;
  private extensions = ['webp', 'jpeg', 'jpg', 'png'];
  private currentExtIndex = 0;
  private lastDataTimestamp: number = Date.now();
  private watchdogInterval: any;

  // Stable options for 3D chart to prevent re-initialization on every update
  threeDOptions: any;
  threeDUpdate: any;

  constructor(private cdr: ChangeDetectorRef) { }

  get currentImagePath() {
    return `assets/${this.currentSlide}.${this.extensions[this.currentExtIndex]}`;
  }

  onImageError() {
    if (this.currentExtIndex < this.extensions.length - 1) {
      this.currentExtIndex++;
    } else {
      console.warn(`All extensions failed for slide ${this.currentSlide}`);
    }
  }

  getNormalCards() {
    return this.widgetData.filter(w => w.id !== 'gps' && w.id !== 'battery' && w.id !== 'wind_speed' && w.id !== 'wind_direction' && w.id !== 'sos');
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

  getWidgetById(id: string) {
    return this.widgetData.find(w => w.id === id);
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
    if (!w || !w.threshold?.has || w.val === undefined) return false;
    return Number(w.val) > w.threshold.val;
  }

  getChartOption(trend: number[] | undefined, isDarkMode: boolean, colorClass: string, id: string): echarts.EChartsOption {
    let rawTrend = trend || [];
    let displayTrend = rawTrend;

    let color = '#3b82f6';
    if (colorClass.includes('cyan')) color = '#22d3ee';
    else if (colorClass.includes('emerald') || colorClass.includes('green')) color = '#10b981';
    else if (colorClass.includes('orange') || colorClass.includes('yellow')) color = '#f97316';
    else if (colorClass.includes('indigo')) color = '#6366f1';

    const widget = this.widgetData.find(w => w.id === id);
    const threshold = widget?.threshold;

    return {
      grid: { top: 20, bottom: -5, left: -5, right: -5 },
      xAxis: { type: 'category', show: false, boundaryGap: false },
      yAxis: { type: 'value', show: false, min: 'dataMin', max: 'dataMax' },
      visualMap: threshold?.has ? {
        show: false,
        pieces: [{ gt: 0, lte: threshold.val, color: color }, { gt: threshold.val, color: '#ef4444' }],
        outOfRange: { color: color }
      } : undefined,
      series: [{
        data: displayTrend,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: threshold?.has ? undefined : color,
          width: 2,
          shadowColor: isDarkMode ? color : 'transparent',
          shadowOffsetY: 0
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: isDarkMode ? 'transparent' : `${color}30` },
            { offset: 1, color: isDarkMode ? 'transparent' : `${color}00` }
          ])
        }
      }]
    };
  }

  update3DChart(): void {
    const uTrend = this.fullDayTrends['u'] || [];
    const vTrend = this.fullDayTrends['v'] || [];
    const wTrend = this.fullDayTrends['w'] || [];

    const data3d = uTrend.map((uPoint, i) => {
      const vPoint = vTrend[i];
      const wPoint = wTrend[i];
      if (!uPoint || !vPoint || !wPoint) return null;
      return [uPoint[1], vPoint[1], wPoint[1]];
    }).filter(p => p !== null);

    this.threeDUpdate = {
      series: [{
        data: data3d
      }]
    };
    this.cdr.markForCheck();
  }

  get3DChartBaseOptions(isDarkMode: boolean): any {
    const textColor = isDarkMode ? '#f8fafc' : '#1e293b';
    const labelColor = isDarkMode ? '#94a3b8' : '#64748b';
    const gridColor = isDarkMode ? 'rgba(155, 155, 155, 0.1)' : 'rgba(0, 0, 0, 0.05)';

    return {
      tooltip: {
        backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        borderColor: '#22d3ee',
        textStyle: { color: textColor }
      },
      xAxis3D: {
        name: 'U', type: 'value',
        nameTextStyle: { color: '#22d3ee', fontSize: 13, fontWeight: 'bold' },
        axisLabel: { textStyle: { color: labelColor, fontSize: 10 } },
        splitLine: { lineStyle: { color: gridColor, width: 1 } },
        splitNumber: 2
      },
      yAxis3D: {
        name: 'V', type: 'value',
        nameTextStyle: { color: '#22d3ee', fontSize: 13, fontWeight: 'bold' },
        axisLabel: { textStyle: { color: labelColor, fontSize: 10 } },
        splitLine: { lineStyle: { color: gridColor, width: 1 } },
        splitNumber: 2
      },
      zAxis3D: {
        name: 'W', type: 'value',
        nameTextStyle: { color: '#fbbf24', fontSize: 13, fontWeight: 'bold' },
        axisLabel: { textStyle: { color: labelColor, fontSize: 10 } },
        splitLine: { lineStyle: { color: gridColor, width: 1 } },
        splitNumber: 2
      },
      grid3D: {
        viewControl: {
          autoRotate: false,
          beta: 25,
          alpha: 20,
          distance: 180,
          panSensitivity: 1,
          rotateSensitivity: 1,
          zoomSensitivity: 1
        },
        boxWidth: 100, boxDepth: 100, boxHeight: 80,
        axisPointer: { show: true, lineStyle: { color: '#22d3ee', width: 2 } },
        light: {
          main: { intensity: 1.5, shadow: false },
          ambient: { intensity: 1.0 } 
        }
      },
      series: [{
        type: 'scatter3D',
        data: [],
        symbolSize: 8,
        itemStyle: {
          opacity: 0.9,
          color: '#22d3ee',
          shadowBlur: 10,
          shadowColor: 'rgba(34, 211, 238, 0.5)'
        },
        shading: 'lambert',
        emphasis: {
          itemStyle: { color: '#ffffff', symbolSize: 12 }
        }
      }]
    };
  }

  getSensorStatuses() {
    const now = new Date();
    const isOnline = (id: string, group: string[]) => {
      const timeDiff = now.getTime() - this.lastDataTimestamp;
      if (timeDiff > 60000) return 'offline'; // 1 minute timeout

      // Check if any of the group parameters have valid data
      if (this.anemometerData && group.length > 0) {
        const hasData = group.some(key => {
          const val = this.anemometerData[key];
          return val !== null && val !== undefined && val !== 0; // Use 0 check if appropriate, but null/undefined is safer
        });
        if (!hasData) return 'offline';
      }
      return 'online';
    };

    const displayTime = (now.getTime() - this.lastDataTimestamp < 60000) ? now : new Date(this.lastDataTimestamp);
    const timestamp = displayTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + displayTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    return [
      { id: 'anemometer', label: 'Anemometer', icon: 'fa-wind', status: isOnline('anemometer', ['u', 'v', 'w', 'wind_speed', 'wind_direction']), time: timestamp },
      { id: 'precipitation', label: 'Precipitation', icon: 'fa-cloud-showers-heavy', status: isOnline('rain', ['rain']), time: timestamp },
      { id: 'pyranometer', label: 'Pyranometer', icon: 'fa-sun', status: isOnline('solar', ['solar']), time: timestamp },
      { id: 'barometric', label: 'Barometric', icon: 'fa-gauge-high', status: isOnline('pressure', ['pressure']), time: timestamp },
      { id: 'temphum', label: 'Temp & Humidity', icon: 'fa-temperature-half', status: isOnline('temp', ['temp', 'humidity']), time: timestamp },
    ];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['anemometerData'] && changes['anemometerData'].currentValue) {
      this.lastDataTimestamp = Date.now();
    }
    if (changes['fullDayTrends'] || changes['isDarkMode']) {
      if (!this.threeDOptions || changes['isDarkMode']) {
        this.threeDOptions = this.get3DChartBaseOptions(this.isDarkMode);
      }
      this.update3DChart();
    }
  }

  ngOnInit(): void {
    // Initial 3D chart setup
    this.threeDOptions = this.get3DChartBaseOptions(this.isDarkMode);
    this.update3DChart();

    this.slideInterval = setInterval(() => {
      this.currentSlide = this.currentSlide === 3 ? 1 : this.currentSlide + 1;
      this.currentExtIndex = 0;
    }, 3000);

    this.watchdogInterval = setInterval(() => {
      this.cdr.markForCheck();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.slideInterval) clearInterval(this.slideInterval);
    if (this.watchdogInterval) clearInterval(this.watchdogInterval);
  }
}
