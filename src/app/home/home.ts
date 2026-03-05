import { CommonModule } from '@angular/common';
import { Component, Input, input, OnChanges, OnInit, SimpleChanges, OnDestroy, AfterViewInit, Renderer2, ChangeDetectorRef } from '@angular/core';
import * as echarts from 'echarts';
import Plotly from 'plotly.js-dist-min';
import { HttpClientModule } from '@angular/common/http';
import { TabsModule } from 'primeng/tabs';
import { Homeservice } from './homeService/homeservice';
import { interval, Subscription } from 'rxjs';
import { Dashboard } from './dashboard/dashboard';
import { Report } from './report/report';
import { Analysis } from './analysis/analysis';
import { Settings } from './settings/settings';
import { Profile } from './profile/profile';
import { ShipSchedule } from './ship-schedule/ship-schedule';
import { ApiService, WindData } from '../apiService/api-service';

interface AnemometerData {
  uv: number;
  uy: number;
  uz: number;
  rain: number;
  temp: number;
  solar: number;
  lat: number;
  lon: number;
}

interface NavItem {
  id: string;
  icon: string;
  label: string;
}
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HttpClientModule, TabsModule, Dashboard, Report, Analysis, Settings, Profile, ShipSchedule],
  templateUrl: './home.html',
})
export class Home implements OnInit, OnDestroy, AfterViewInit {

  isDarkMode: boolean = true; // Start with light mode
  expandedSideBar: boolean = true;

 toggleTheme() {
    console.log('clicked');

  this.isDarkMode = !this.isDarkMode;

  if (this.isDarkMode) {
    this.renderer.addClass(document.documentElement, 'dark');
  } else {
    this.renderer.removeClass(document.documentElement, 'dark');
  }
}
  activeIndex: number = 0;
  selectedStation: string | null = null;
  scrollableTabs: any[] = [
    { title: 'Cam 1', content: 'Content of Tab 1' },
    { title: 'Cam 2', content: 'Content of Tab 2' },
    { title: 'Cam 3', content: 'Content of Tab 3' },
    { title: 'Cam 4', content: 'Content of Tab 4' },
  ];
  // startedDate: any;


  onChangeExpandSideBar() {
    this.expandedSideBar = !this.expandedSideBar;
  }

  constructor(private station: Homeservice, private renderer: Renderer2, private apiService: ApiService, private cdr:ChangeDetectorRef) {
    this.station.selectedStation$.subscribe(station => {
      this.selectedStation = station;
      this.activeIndex = 0; // reset tabs when station changes
    });
  }

  ngOnInit(): void {
    this.generateReportData();
    this.loadLatestWindData(); // Load latest wind data from API

    // Simulate live data updates every 3 seconds
    this.dataSubscription = interval(3000).subscribe(() => {
      this.loadLatestWindData(); // Refresh data from API
    });

    // Update time every second
    this.timeSubscription = interval(1000).subscribe(() => {
      this.currentDateTime = new Date();
    });
  }

  ngAfterViewInit() {
    // Charts are now in analysis component
  }

  ngOnDestroy() {
    if (this.dataSubscription) this.dataSubscription.unsubscribe();
    if (this.timeSubscription) this.timeSubscription.unsubscribe();
  }

  dataSubscription: Subscription | undefined;
  timeSubscription: Subscription | undefined;







  // expandedSideBar = true;
  // activeTab = 'home';
  // selectedStation: string | null = 'Pondi';

  anemometerData: AnemometerData = {
    uv: 12.4,
    uy: 8.7,
    uz: 3.2,
    rain: 2.5,
    temp: 24.3,
    solar: 856,
    lat: 13.0827,
    lon: 80.2707
  };

  // ...existing code...

  getHeatmapColor(cell: number): string {
    if (cell < 25) return '#dcfce7'; // Light Green
    if (cell < 50) return '#fef08a'; // Light Yellow
    if (cell < 75) return '#fed7aa'; // Light Orange
    return '#fecaca'; // Light Red
  }

  getHeatmapGlow(cell: number): string {
    return 'none';
  }

  // ...existing code...
  navItems: NavItem[] = [
    { id: 'home', icon: 'fa-house', label: 'Dashboard' },
    { id: 'report', icon: 'fa-file-lines', label: 'Reports' },
    { id: 'analysis', icon: 'fa-chart-line', label: 'Analysis' },
    { id: 'settings', icon: 'fa-gear', label: 'Settings' },
    { id: 'ship-schedule', icon: 'fa-ship', label: 'Ship Schedule' },
    { id: 'profile', icon: 'fa-user', label: 'Profile' },
  ];

  // Report Column Visibility
  reportColumns = [
    { label: 'Wind UV', key: 'uv', visible: true },
    { label: 'Wind UY', key: 'uy', visible: true },
    { label: 'Wind UZ', key: 'uz', visible: true },
    { label: 'Rain (mm)', key: 'rain', visible: true },
    { label: 'Temp (°C)', key: 'temp', visible: true },
    { label: 'Solar (W/m²)', key: 'solar', visible: true }
  ];

  // Settings Thresholds
  thresholds = [
    { label: 'Temp Upper Limit', value: 45, unit: '°C' },
    { label: 'Temp Lower Limit', value: 5, unit: '°C' },
    { label: 'Wind Speed Limit', value: 25, unit: 'm/s' },
    { label: 'Rainfall Alert', value: 10, unit: 'mm/h' }
  ];

  // Profile Data
  currentUser = {
    name: 'Admin User',
    role: 'Navigation Officer',
    email: 'admin@marinehq.com',
    vessel: 'MV AURORA',
    lastLogin: '24 DEC 2025 14:35 UTC'
  };

  reportData: any[] = [];
  currentDateTime = new Date();


  // onChangeExpandSideBar() {
  //   this.expandedSideBar = !this.expandedSideBar;
  // }

  // setActiveTab(tabId: string) {
  //   this.activeTab = tabId;
  // }

  async loadLatestWindData() {
    const latestData = await this.apiService.getLatestWindData();
    if (latestData) {
      this.anemometerData = {
        uv: latestData.wind_uv,
        uy: latestData.wind_uy,
        uz: latestData.wind_uz,
        rain: latestData.rain_fall,
        temp: latestData.temp,
        solar: latestData.solar_rad,
        lat: latestData.lat,
        lon: latestData.lon
      };
      this.cdr.markForCheck();
    }
  }

  updateAnemometerData() {
    this.anemometerData = {
      uv: parseFloat((this.anemometerData.uv + (Math.random() - 0.5) * 2).toFixed(1)),
      uy: parseFloat((this.anemometerData.uy + (Math.random() - 0.5) * 2).toFixed(1)),
      uz: parseFloat((this.anemometerData.uz + (Math.random() - 0.5) * 0.5).toFixed(1)),
      rain: parseFloat(Math.max(0, this.anemometerData.rain + (Math.random() - 0.5) * 0.5).toFixed(1)),
      temp: parseFloat((this.anemometerData.temp + (Math.random() - 0.5) * 0.3).toFixed(1)),
      solar: Math.floor(this.anemometerData.solar + (Math.random() - 0.5) * 50),
      lat: this.anemometerData.lat,
      lon: this.anemometerData.lon
    };
    this.cdr.markForCheck();
  }

  async generateReportData() {
    try {
      const allWindData = await this.apiService.fetchWindData();
      
      // Transform API data into report format
      this.reportData = allWindData.map(item => ({
        date: new Date(item.datetime).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        uv: item.wind_uv.toFixed(2),
        uy: item.wind_uy.toFixed(2),
        uz: item.wind_uz.toFixed(2),
        rain: item.rain_fall.toFixed(2),
        temp: item.temp.toFixed(2),
        solar: item.solar_rad.toFixed(2)
      }));
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error generating report data:', error);
    }
  }

  getChartPoints(offset: number): string {
    return Array.from({ length: 20 }, (_, i) =>
      `${i * 5},${40 + Math.sin(i * 0.5 + offset) * 15}`
    ).join(' ');
  }

  getTempChartPoints(): string {
    return Array.from({ length: 40 }, (_, i) =>
      `${i * 3},${60 + Math.sin(i * 0.3) * 20}`
    ).join(' ');
  }

  getHeatmapCells(): number[] {
    return Array.from({ length: 32 }, () => Math.random());
  }

  formatDateTime(): string {
    return this.currentDateTime.toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    }).toUpperCase();
  }



  activeTab: string = 'home';

  setActiveTab(id: string) {
    this.activeTab = id;
    this.cdr.markForCheck();
  }

  // Example shared data
  // anemometerData = {
  //   temp: 18.2,
  //   uv: 12.4,
  //   uy: 3.1,
  //   uz: 1.8,
  //   rain: 0.0,
  //   solar: 645,
  //   lat: 35.6895,
  //   lon: 139.6917
  // };

  toggleColumn(key: string) {
    const col = this.reportColumns.find(c => c.key === key);
    if (col) {
      col.visible = !col.visible;
      this.cdr.markForCheck();
    }
  }

  startedDate = '2025-11-15 09:42 UTC';

  // Widget data example
  get widgetData() {
    return [
      { icon: 'fa-wind', label: 'Wind UV', val: this.anemometerData.uv, unit: 'm/s', pct: 75, barColor: 'from-cyan-400 to-blue-500' },
      { icon: 'fa-wind', label: 'Wind UY', val: this.anemometerData.uy, unit: 'm/s', pct: 60, barColor: 'from-cyan-400 to-blue-500' },
      { icon: 'fa-wind', label: 'Wind UZ', val: this.anemometerData.uz, unit: 'm/s', pct: 85, barColor: 'from-cyan-400 to-blue-500' },
      { icon: 'fa-droplet', label: 'Rainfall', val: this.anemometerData.rain, unit: 'mm', pct: 0, barColor: 'from-blue-400 to-cyan-400' },
      { icon: 'fa-temperature-half', label: 'Temp', val: this.anemometerData.temp, unit: '°C', pct: 65, barColor: 'from-orange-400 to-red-500' },
      { icon: 'fa-sun', label: 'Solar Rad', val: this.anemometerData.solar, unit: 'W/m²', pct: 90, barColor: 'from-yellow-400 to-orange-500' },
      { icon: 'fa-map-pin', label: 'Latitude', val: this.anemometerData.lat, unit: '°N', pct: 50, barColor: 'from-green-400 to-cyan-400' },
      { icon: 'fa-map-pin', label: 'Longitude', val: this.anemometerData.lon, unit: '°E', pct: 45, barColor: 'from-green-400 to-cyan-400' },
    ];
  }
}
