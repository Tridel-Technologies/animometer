import { Component, AfterViewInit, ElementRef, ViewChild, OnInit, OnDestroy, HostListener, Input, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WindChartComponent } from '../../wind-chart/wind-chart';
import { ApiService } from '../../apiService/api-service';
import { UnitConversionService } from '../../apiService/unit-conversion.service';

// PrimeNG v21 Module Imports
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    WindChartComponent,
    DatePickerModule,
    SelectModule,
    ButtonModule,
    SelectButtonModule
  ],
  templateUrl: './analysis.html',
  styleUrl: './analysis.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Analysis implements OnInit, OnDestroy, AfterViewInit {
  @Input() reportData: any[] = [];
  @Input() anemometerData: any;
  @Input() initialUnits: any[] = [];
  @Input() sensorConfigs: any[] = [];
  @Input() selectedStation: string | null = null;
  @Input() stations: any[] = [];
  @ViewChild('chartContainer') chartContainer!: ElementRef;

  chartWidth: number = 1000;
  private resizeObserver: ResizeObserver | null = null;

  timeScales = [
    { label: 'Day', value: 'Day' },
    { label: 'Week', value: 'Week' },
    { label: 'Month', value: 'Month' },
    { label: 'Year', value: 'Year' }
  ];

  selectedTimeScale: string = 'Day';
  selectedDate: Date = new Date();

  parameters = [
    { label: 'Wind UX', key: 'uv', selected: true, color: '#22d3ee' },
    { label: 'Wind UY', key: 'uy', selected: true, color: '#10b981' },
    { label: 'Wind UZ', key: 'uz', selected: true, color: '#f59e0b' },
    { label: 'Rainfall', key: 'rain', selected: true, color: '#3b82f6' },
    { label: 'Temp', key: 'temp', selected: true, color: '#ef4444' },
    { label: 'Solar', key: 'solar', selected: true, color: '#facc15' },
    { label: 'Humidity', key: 'humidity', selected: true, color: '#8b5cf6' },
    { label: 'Pressure', key: 'pressure', selected: true, color: '#6366f1' },
    { label: 'Battery', key: 'battery', selected: true, color: '#10b981' },
    { label: 'Wind Speed', key: 'wind_speed', selected: true, color: '#22d3ee' },
    { label: 'Wind Direction', key: 'wind_direction', selected: true, color: '#6366f1' }
  ];

  // Active analysis data
  analysisData: any[] = [];
  isLoading = false;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef, private conversionService: UnitConversionService) { }

  ngOnInit() {
    this.fetchAnalysisData();
  }

  ngAfterViewInit() {
    this.setupResizeObserver();
  }

  private setupResizeObserver() {
    if (this.chartContainer) {
      this.resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          const newWidth = entry.contentRect.width;
          if (Math.abs(this.chartWidth - newWidth) > 20) {
            this.chartWidth = newWidth - 48; // Adjust for padding
            this.cdr.markForCheck();
          }
        }
      });
      this.resizeObserver.observe(this.chartContainer.nativeElement);
    }
  }

  applyConversion(val: number, paramId: string): number {
    const initialUnitObj = this.initialUnits.find(u => u.parameter_id === paramId);
    const targetConfig = this.sensorConfigs.find(c => c.parameter_id === paramId);

    if (!initialUnitObj || !targetConfig) return val;

    return this.conversionService.convert(val, paramId, initialUnitObj.unit, targetConfig.unit);
  }

  getParameterLabel(param: any): string {
    const paramIdMap: { [key: string]: string } = {
      'uv': 'wind_ux', 'uy': 'wind_uy', 'uz': 'wind_uz',
      'rain': 'rain', 'temp': 'temp', 'solar': 'solar',
      'humidity': 'humidity', 'pressure': 'pressure', 'battery': 'battery',
      'wind_speed': 'wind_speed', 'wind_direction': 'wind_direction'
    };
    const paramId = paramIdMap[param.key];
    const cfg = this.sensorConfigs.find(c => c.parameter_id === paramId);
    return cfg ? `${param.label} (${cfg.unit})` : param.label;
  }

  async fetchAnalysisData() {
    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      const { start, end } = this.getDateRange();
      const rawData = await this.api.getFilteredWindData(start, end);

      // Intelligent Downsampling for performance
      const maxPoints = 500;
      let processedData = rawData || [];
      if (processedData.length > maxPoints) {
        const step = Math.ceil(processedData.length / maxPoints);
        processedData = processedData.filter((_, i) => i % step === 0);
      }

      this.analysisData = processedData.map(item => ({
        time: item.datetime,
        uv: this.applyConversion(Number(item.wind_uv || 0), 'wind_ux'),
        uy: this.applyConversion(Number(item.wind_uy || 0), 'wind_uy'),
        uz: this.applyConversion(Number(item.wind_uz || 0), 'wind_uz'),
        rain: this.applyConversion(Number(item.rain_fall || 0), 'rain'),
        temp: this.applyConversion(Number(item.temp || 0), 'temp'),
        solar: this.applyConversion(Number(item.solar_rad || 0), 'solar'),
        humidity: this.applyConversion(Number(item.humidity || 0), 'humidity'),
        pressure: this.applyConversion(Number(item.pressure || 0), 'pressure'),
        battery: this.applyConversion(Number(item.battery || 0), 'battery'),
        wind_speed: this.applyConversion(Number(item.wind_speed || 0), 'wind_speed'),
        wind_direction: Number(item.wind_direction || 0)
      }));

    } catch (error) {
      console.error('Error fetching analysis data:', error);
      this.analysisData = [];
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges(); // Use detectChanges to ensure UI reflects state immediately
    }
  }

  getDateRange() {
    const selected = this.selectedDate || new Date();
    const y = selected.getFullYear();
    const m = selected.getMonth();
    const d = selected.getDate();

    let start = new Date(y, m, d, 0, 0, 0, 0);
    let end = new Date(y, m, d, 23, 59, 59, 999);

    if (this.selectedTimeScale === 'Week') {
      end.setDate(start.getDate() + 7);
    } else if (this.selectedTimeScale === 'Month') {
      start.setDate(1);
      end = new Date(y, m + 1, 0, 23, 59, 59, 999);
    } else if (this.selectedTimeScale === 'Year') {
      start = new Date(y, 0, 1, 0, 0, 0, 0);
      end = new Date(y, 11, 31, 23, 59, 59, 999);
    }

    return {
      start: this.api.formatDateForQuery(start),
      end: this.api.formatDateForQuery(end)
    };
  }

  getChartData(key: string): any[] {
    return this.analysisData.map(d => ({
      time: d.time,
      speed: d[key]
    }));
  }


  onTimeScaleChange() { this.fetchAnalysisData(); }
  onDateChange() { this.fetchAnalysisData(); }
  onStationChange() { this.fetchAnalysisData(); }

  toggleParameter(param: any): void {
    param.selected = !param.selected;
    this.cdr.detectChanges();
  }

  getSelectedParameters() {
    return this.parameters.filter(p => p.selected);
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}
