import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from "../../map/map";
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts';

interface WidgetData {
  id: string;
  icon: string;
  label: string;
  val: number | undefined;
  unit: string;
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
export class Dashboard implements OnInit {
  @Input() anemometerData: any;
  @Input() selectedStation: string | null = null;
  @Input() widgetData: WidgetData[] = [];
  @Input() isDarkMode: boolean = true;

  getNormalCards() {
    return this.widgetData.filter(w => w.id !== 'gps');
  }

  getGpsCard() {
    return this.widgetData.find(w => w.id === 'gps');
  }

  getChartOption(trend: number[] | undefined, isDarkMode: boolean, colorClass: string, id: string): echarts.EChartsOption {
    if (!trend) trend = [];

    let color = '#3b82f6'; // default blue
    if (colorClass.includes('cyan')) color = '#22d3ee';
    else if (colorClass.includes('emerald') || colorClass.includes('green')) color = '#10b981';
    else if (colorClass.includes('orange') || colorClass.includes('yellow')) color = '#f97316';
    else if (colorClass.includes('indigo')) color = '#6366f1';

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
      series: [
        {
          data: trend,
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: color,
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
              { name: 'Current', coord: [trend.length - 1, trend[trend.length - 1]], symbol: 'circle', symbolSize: 6, itemStyle: { color: id === 'solar' ? '#fcd34d' : 'rgba(255,255,255,0.8)', shadowBlur: 8, shadowColor: id === 'solar' ? '#f59e0b' : 'white' } }
            ],
            label: { show: false }
          }
        }
      ]
    };
  }

  ngOnInit(): void {
      
  }
}
