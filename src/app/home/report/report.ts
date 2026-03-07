import { Component, OnInit, ChangeDetectorRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../apiService/api-service';
import { UnitConversionService } from '../../apiService/unit-conversion.service';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// PrimeNG v21 Module Imports
import { DatePickerModule } from 'primeng/datepicker';
import { SelectButtonModule } from 'primeng/selectbutton';
import { HighlightPipe } from './highlight.pipe';

interface ReportColumn {
  label: string;
  key: string;
  visible: boolean;
}

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePickerModule, SelectButtonModule, HighlightPipe],
  templateUrl: './report.html',
  styleUrl: './report.css'
})
export class Report implements OnInit {
  @Input() initialUnits: any[] = [];
  @Input() sensorConfigs: any[] = [];
  reportData: any[] = [];
  reportColumns: ReportColumn[] = [
    { label: 'Wind U', key: 'uv', visible: true },
    { label: 'Wind V', key: 'uy', visible: true },
    { label: 'Wind W', key: 'uz', visible: true },
    { label: 'SOS', key: 'sos', visible: true },
    { label: 'Rainfall', key: 'rain', visible: true },
    { label: 'Temp', key: 'temp', visible: true },
    { label: 'Solar', key: 'solar', visible: true },
    { label: 'Humidity', key: 'humidity', visible: true },
    { label: 'Pressure', key: 'pressure', visible: true },
    { label: 'Battery', key: 'battery', visible: true },
    { label: 'Wind Speed', key: 'wind_speed', visible: true },
    { label: 'Wind Direction', key: 'wind_direction', visible: true },
    { label: 'Altitude', key: 'altitude', visible: true }
  ];

  selectedTimeScale: string = 'Hour';
  selectedDate: Date = new Date();
  timeScales = [
    { label: 'Hour', value: 'Hour' },
    { label: 'Day', value: 'Day' },
    { label: 'Week', value: 'Week' },
    { label: 'Month', value: 'Month' },
    { label: 'Year', value: 'Year' }
  ];

  isLoading = false;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  itemsPerPageOptions: number[] = [10, 15, 20];
  searchTerm: string = '';

  constructor(private api: ApiService, private cdr: ChangeDetectorRef, private conversionService: UnitConversionService) { }

  ngOnInit(): void {
    this.fetchData();
  }

  get filteredData(): any[] {
    if (!this.searchTerm.trim()) return this.reportData;
    const term = this.searchTerm.trim().toLowerCase();

    return this.reportData.filter(row => {
      // Check visible columns and timestamps
      const visibleKeys = this.reportColumns.filter(c => c.visible).map(c => c.key);
      const keysToSearch = ['date', 'time', ...visibleKeys];

      return keysToSearch.some(key => {
        const val = row[key];
        return val !== null && val !== undefined && String(val).toLowerCase().includes(term);
      });
    });
  }

  get paginatedData(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredData.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredData.length / this.itemsPerPage));
  }

  get pageNumbers(): number[] {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - 2);
    let end = Math.min(this.totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  onDateChange() {
    this.currentPage = 1;
    this.fetchData();
  }

  onSearchChange() {
    this.currentPage = 1;
    this.cdr.markForCheck();
  }

  applyConversion(val: number, paramId: string): number {
    const initialUnitObj = this.initialUnits.find(u => u.parameter_id === paramId);
    const targetConfig = this.sensorConfigs.find(c => c.parameter_id === paramId);

    if (!initialUnitObj || !targetConfig) return val;

    return this.conversionService.convert(val, paramId, initialUnitObj.unit, targetConfig.unit);
  }

  getColumnLabel(col: ReportColumn): string {
    const paramIdMap: { [key: string]: string } = {
      'uv': 'wind_ux', 'uy': 'wind_uy', 'uz': 'wind_uz',
      'rain': 'rain', 'temp': 'temp', 'solar': 'solar',
      'humidity': 'humidity', 'pressure': 'pressure', 'battery': 'battery',
      'wind_speed': 'wind_speed', 'wind_direction': 'wind_direction',
      'altitude': 'altitude'
    };
    const paramId = paramIdMap[col.key];
    const cfg = this.sensorConfigs.find(c => c.parameter_id === paramId);
    return cfg ? `${col.label} (${cfg.unit})` : col.label;
  }

  async fetchData() {
    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      const { start, end } = this.getDateRange();
      let step = 1;
      let limit = 5000;

      if (this.selectedTimeScale === 'Day') step = 10; // Every 10th record (6 records/min) for 24h = 8640 records
      else if (this.selectedTimeScale !== 'Hour') step = 60; // Every 60th record (1 record/min) for larger ranges

      const data = await this.api.getFilteredWindData(start, end, limit, step);

      this.reportData = data.map(item => ({
        date: new Date(item.datetime).toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        }),
        time: new Date(item.datetime).toLocaleTimeString('en-US', {
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }),
        uv: Number(this.applyConversion(item.wind_uv || 0, 'wind_ux')).toFixed(2),
        uy: Number(this.applyConversion(item.wind_uy || 0, 'wind_uy')).toFixed(2),
        uz: Number(this.applyConversion(item.wind_uz || 0, 'wind_uz')).toFixed(2),
        sos: Number(item.sos || 0).toFixed(2),
        rain: Number(this.applyConversion(item.rain_fall || 0, 'rain')).toFixed(2),
        temp: Number(this.applyConversion(item.temp || 0, 'temp')).toFixed(2),
        solar: Number(this.applyConversion(item.solar_rad || 0, 'solar')).toFixed(2),
        humidity: Number(this.applyConversion(item.humidity || 0, 'humidity')).toFixed(2),
        pressure: Number(this.applyConversion(item.pressure || 0, 'pressure')).toFixed(2),
        battery: Number(this.applyConversion(item.battery || 0, 'battery')).toFixed(2),
        wind_speed: Number(this.applyConversion(item.wind_speed || 0, 'wind_speed')).toFixed(2),
        wind_direction: Number(item.wind_direction || 0).toFixed(2),
        altitude: Number(item.altitude || 0).toFixed(2)
      }));

    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  getDateRange() {
    const selected = this.selectedDate || new Date();
    const y = selected.getFullYear();
    const m = selected.getMonth();
    const d = selected.getDate();

    let start = new Date(y, m, d, 0, 0, 0, 0);
    let end = new Date(y, m, d, 23, 59, 59, 999);

    if (this.selectedTimeScale === 'Hour') {
      start = new Date(selected.getTime() - (60 * 60 * 1000));
      end = selected;
    } else if (this.selectedTimeScale === 'Week') {
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

  exportExcel() {
    const visibleCols = this.reportColumns.filter(c => c.visible);
    const exportData = this.reportData.map(row => {
      const obj: any = { 'Timestamp': `${row.date} ${row.time}` };
      visibleCols.forEach(c => obj[this.getColumnLabel(c)] = row[c.key]);
      return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Marine Report');
    XLSX.writeFile(workbook, `marine_report_${this.selectedDate}.xlsx`);
  }

  exportPDF() {
    const doc = new jsPDF('l', 'mm', 'a4');
    const visibleCols = this.reportColumns.filter(c => c.visible);

    doc.setFontSize(18);
    doc.text('Marine Environmental Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Scale: ${this.selectedTimeScale} | Date: ${this.selectedDate}`, 14, 22);

    const headers = ['Timestamp', ...visibleCols.map(c => this.getColumnLabel(c))];
    const data = this.reportData.map(row => [`${row.date} ${row.time}`, ...visibleCols.map(c => row[c.key])]);

    autoTable(doc, {
      startY: 30,
      head: [headers],
      body: data,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { top: 30 }
    });

    doc.save(`marine_report_${this.selectedDate}.pdf`);
  }

  exportCSV() {
    const visibleCols = this.reportColumns.filter(c => c.visible);
    const headers = ['Timestamp', ...visibleCols.map(c => this.getColumnLabel(c))].join(',');
    const rows = this.reportData.map(row => 
      [`"${row.date} ${row.time}"`, ...visibleCols.map(c => row[c.key])].join(',')
    ).join('\n');

    const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marine_report_${this.selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  toggleColumn(key: string) {
    const col = this.reportColumns.find(c => c.key === key);
    if (col) {
      col.visible = !col.visible;
      this.cdr.markForCheck();
    }
  }

  setItemsPerPage(n: number) {
    this.itemsPerPage = n;
    this.currentPage = 1;
    this.cdr.markForCheck();
  }

  goToPage(p: number) {
    this.currentPage = p;
    this.cdr.markForCheck();
  }

  prevPage() { if (this.currentPage > 1) this.currentPage--; }
  nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }
}
