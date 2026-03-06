import { CommonModule } from '@angular/common';
import { Component, Input, input, OnChanges, OnInit, SimpleChanges, OnDestroy, AfterViewInit, Renderer2, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import * as echarts from 'echarts';
import Plotly from 'plotly.js-dist-min';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { TabsModule } from 'primeng/tabs';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { Homeservice } from './homeService/homeservice';
import { interval, Subscription } from 'rxjs';
import { Dashboard } from './dashboard/dashboard';
import { Report } from './report/report';
import { Analysis } from './analysis/analysis';
import { Settings } from './settings/settings';
import { Profile } from './profile/profile';
import { ShipSchedule } from './ship-schedule/ship-schedule';

import { Users } from './users/users';
import { ApiService, WindData } from '../apiService/api-service';
import { SocketService } from '../apiService/socket-service';
import { UnitConversionService } from '../apiService/unit-conversion.service';
import { ThemeService } from '../theme.service';

interface AnemometerData {
  u: number;
  v: number;
  w: number;
  sos: number;
  rain: number;
  temp: number;
  solar: number;
  lat: number;
  lon: number;
  humidity?: number;
  pressure?: number;
  battery?: number;
  wind_speed?: number;
  wind_direction?: number;
}

interface NavItem {
  id: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule, TabsModule, SelectModule, Dashboard, Report, Analysis, Settings, Profile, Users, DialogModule, ButtonModule, ShipSchedule],
  templateUrl: './home.html',
})
export class Home implements OnInit, OnDestroy, AfterViewInit {
  // Dual-scale trend buffers
  fullDayTrends: { [key: string]: any[] } = {
    u: [],
    v: [],
    w: [],
    sos: []
  };

  isDarkMode: boolean = true; // Start with light mode
  expandedSideBar: boolean = true;
  lastDataTimestamp: number = 0;
  activeTab: string = 'dashboard';

  get systemStatus(): 'online' | 'partial' | 'offline' {
    const now = Date.now();
    if (this.lastDataTimestamp === 0) return 'offline';

    const timeDiff = now - this.lastDataTimestamp;
    if (timeDiff > 10000) return 'offline';

    // Logic for "partial": if data is fresh but battery/pressure are exactly 0 (sensor failure marker)
    // or if packet is slightly late (>5s)
    const isPackatStale = timeDiff > 5000;
    const isAnySensorFailing = (this.anemometerData?.battery === 0 || this.anemometerData?.pressure === 0);

    if (isPackatStale || isAnySensorFailing) return 'partial';

    return 'online';
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
  activeIndex: number = 1;
  selectedStation: string | null = 'Main Mast 01';
  stations = [
    { label: 'Main Mast 01', value: 'Main Mast 01' },
    { label: 'Front Bridge 02', value: 'Front Bridge 02' },
    { label: 'Port Side 03', value: 'Port Side 03' },
    { label: 'Starboard Side 04', value: 'Starboard Side 04' }
  ];
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

  isInitialized = false;

  constructor(
    private station: Homeservice,
    private renderer: Renderer2,
    private apiService: ApiService,
    private socketService: SocketService,
    private cdr: ChangeDetectorRef,
    private conversionService: UnitConversionService,
    public themeService: ThemeService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Listen for route changes to sync activeTab
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.syncActiveTabWithRoute();
    });

    this.themeService.isDarkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
      this.cdr.detectChanges();
    });
    this.station.selectedStation$.subscribe(station => {
      this.selectedStation = station;
      this.activeIndex = 1; // reset tabs when station changes
    });
  }

  showInitialUnitsDialog: boolean = false;
  showStationDialog: boolean = false;
  shipName: string = '';
  initialUnits: any[] = [];
  sensorConfigs: any[] = [];

  async ngOnInit(): Promise<void> {
    const userJson = localStorage.getItem('station_user');
    if (userJson) {
      this.currentUser = JSON.parse(userJson);
      // Filter navItems based on permissions (always show profile)
      this.navItems = this.navItems.filter(item => {
        let permKey = item.id;
        if (permKey === 'report') permKey = 'reports'; // Fix mismatch between nav ID and DB permission key

        return item.id === 'profile' ||
          (this.currentUser.permissions && this.currentUser.permissions[permKey]) ||
          (this.currentUser.role === 'Administrator' && item.id === 'users');
      });
    }

    this.syncActiveTabWithRoute();
    await this.checkStation();
    await this.checkInitialUnits();
    await this.fetchSensorConfigs();

    // Now that we have units, initialize the widgets correctly
    this.initializeWidgets();

    this.generateReportData();
    this.loadLatestWindData(); // Load latest wind data from API

    this.isInitialized = true;
    this.cdr.detectChanges();

    // Listen for live WebSocket updates
    const socketSub = this.socketService.onWindDataUpdate().subscribe((data) => {
      this.lastDataTimestamp = Date.now();
      this.cdr.detectChanges(); // Update status bar globally

      // Only reflect updates in dashboard page as requested
      if (this.activeTab === 'dashboard') {
        const dataDate = new Date(data.datetime);
        const today = new Date();
        const isToday = dataDate.getDate() === today.getDate() &&
          dataDate.getMonth() === today.getMonth() &&
          dataDate.getFullYear() === today.getFullYear();

        if (isToday) {
          // Update basic telemetry with converted values
          this.anemometerData = {
            u: this.applyConversion(data.wind_uv, 'wind_ux'),
            v: this.applyConversion(data.wind_uy, 'wind_uy'),
            w: this.applyConversion(data.wind_uz, 'wind_uz'),
            sos: data.sos || 0,
            rain: this.applyConversion(data.rain_fall, 'rain'),
            temp: this.applyConversion(data.temp, 'temp'),
            solar: this.applyConversion(data.solar_rad, 'solar'),
            lat: data.lat,
            lon: data.lon,
            humidity: this.applyConversion(data.humidity || 65, 'humidity'),
            pressure: this.applyConversion(data.pressure || 1013.2, 'pressure'),
            battery: this.applyConversion(data.battery || 92, 'battery'),
            wind_speed: this.applyConversion(data.wind_speed || 0, 'wind_speed'),
            wind_direction: data.wind_direction || 0
          };

          // Update persistent widgetData trends smoothly (10 MINUTE SLIDING WINDOW = 600 pts)
          this._widgetData.forEach(w => {
            if (w.id === 'u') w.val = this.anemometerData.u;
            else if (w.id === 'v') w.val = this.anemometerData.v;
            else if (w.id === 'w') w.val = this.anemometerData.w;
            else if (w.id === 'sos') w.val = this.anemometerData.sos;
            else if (w.id === 'humidity') w.val = this.anemometerData.humidity;
            else if (w.id === 'pressure') w.val = this.anemometerData.pressure;
            else if (w.id === 'solar') w.val = this.anemometerData.solar;
            else if (w.id === 'temp') w.val = this.anemometerData.temp;
            else if (w.id === 'rain') w.val = this.anemometerData.rain;
            else if (w.id === 'battery') w.val = this.anemometerData.battery;
            else if (w.id === 'wind_speed') w.val = this.anemometerData.wind_speed;
            else if (w.id === 'wind_direction') w.val = this.anemometerData.wind_direction;
            else if (w.id === 'gps') {
              w.val = data.lat;
              w.lat = data.lat;
              w.lon = data.lon;
            }

            // Push to trend and maintain last 1 MINUTE (60 points at 1s intervals)
            if (w.trend && w.id !== 'gps') {
              const currentTrend = [...(w.trend || [])];
              currentTrend.push(Number(w.val));
              while (currentTrend.length > 60) currentTrend.shift();
              w.trend = currentTrend;
            }
          });

          // Re-assign to trigger Angular change detection for child components
          this._widgetData = [...this._widgetData];

          // Update rolling window trends for trajectory charts with timestamps
          const timeMs = new Date(data.datetime).getTime();
          if (!this.fullDayTrends['u']) {
            this.fullDayTrends = { u: [], v: [], w: [], sos: [] };
          }
          this.fullDayTrends['u'].push([timeMs, this.anemometerData.u]);
          this.fullDayTrends['v'].push([timeMs, this.anemometerData.v]);
          this.fullDayTrends['w'].push([timeMs, this.anemometerData.w]);
          this.fullDayTrends['sos'].push([timeMs, this.anemometerData.sos]);

          // Keep strictly to 60 points (1 minute) for consistency
          if (this.fullDayTrends['u'].length > 60) {
            this.fullDayTrends['u'].shift();
            this.fullDayTrends['v'].shift();
            this.fullDayTrends['w'].shift();
            this.fullDayTrends['sos'].shift();
          }

          // RE-ASSIGN to trigger child ngOnChanges
          this.fullDayTrends = { ...this.fullDayTrends };

          // Trigger change detection for all subscribers
          this.cdr.markForCheck();
        }
      }
    });

    this.initializeWidgets();

    // Add to subscriptions for cleanup
    if (this.dataSubscription) {
      const originalUnsub = this.dataSubscription.unsubscribe.bind(this.dataSubscription);
      this.dataSubscription.unsubscribe = () => {
        originalUnsub();
        socketSub.unsubscribe();
      };
    } else {
      this.dataSubscription = socketSub;
    }

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

  // Mapping for parameter selections in dialog
  initialUnitsSelection: any = {
    'wind_ux': 'm/s',
    'wind_uy': 'm/s',
    'wind_uz': 'm/s',
    'rain': 'mm',
    'temp': '°C',
    'solar': 'W/m²',
    'humidity': '%RH',
    'pressure': 'hPa',
    'battery': 'V',
    'wind_speed': 'm/s',
    'wind_direction': '°'
  };

  unitOptionsMapping: { [key: string]: string[] } = {
    'wind_ux': ['m/s', 'km/h', 'mph', 'knots (kt)', 'ft/s', 'cm/s'],
    'wind_uy': ['m/s', 'km/h', 'mph', 'knots (kt)', 'ft/s', 'cm/s'],
    'wind_uz': ['m/s', 'km/h', 'mph', 'knots (kt)', 'ft/s', 'cm/s'],
    'rain': ['mm', 'cm', 'inch', 'mm/hr', 'inch/hr'],
    'temp': ['°C', '°F', 'K (Kelvin)', '°R (Rankine)'],
    'solar': ['W/m²', 'kW/m²', 'MJ/m²', 'cal/cm²/min', 'lux'],
    'humidity': ['%RH', 'g/m³', 'kg/kg', 'g/kg', 'Pa (vapor pressure)'],
    'pressure': ['hPa', 'mbar', 'Pa', 'kPa', 'atm', 'mmHg', 'inHg', 'bar'],
    'battery': ['V', 'mV', '%', 'Ah', 'mAh', 'W'],
    'wind_speed': ['m/s', 'km/h', 'mph', 'knots (kt)', 'ft/s', 'cm/s'],
    'wind_direction': ['°']
  };

  async checkInitialUnits() {
    try {
      const units = await this.apiService.getInitialUnits();
      if (units && units.length > 0) {
        this.initialUnits = units;
        // Map back to our selection object for potential editing later
        units.forEach(u => {
          this.initialUnitsSelection[u.parameter_id] = u.unit;
        });
      } else {
        this.showInitialUnitsDialog = true;
      }
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error checking initial units:', error);
    }
  }

  async checkStation() {
    try {
      const station = await this.apiService.getStation();
      if (station) {
        this.shipName = station.name;
        this.selectedStation = station.name;
        // Only show the registered station in the dropdown as requested
        this.stations = [{ label: station.name, value: station.name }];
        this.showStationDialog = false;
      } else {
        this.showStationDialog = true;
      }
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error checking station:', error);
    }
  }

  async saveStation() {
    if (!this.shipName.trim()) return;
    try {
      await this.apiService.updateStation(this.shipName);
      this.showStationDialog = false;
      this.selectedStation = this.shipName;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error saving station:', error);
    }
  }

  async fetchSensorConfigs() {
    try {
      const [configs] = await Promise.all([
        this.apiService.getSensorConfig(),
        this.checkStation()
      ]);
      this.sensorConfigs = configs;
      // Update widget units/labels
      this.initializeWidgets();
      // After configs changed, we need to refresh historical data to apply new units
      this.generateReportData();
      this.loadLatestWindData();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error fetching sensor configs:', error);
    }
  }

  async saveInitialUnits() {
    const unitsToSave = Object.keys(this.initialUnitsSelection).map(key => ({
      parameter_id: key,
      unit: this.initialUnitsSelection[key]
    }));

    try {
      await this.apiService.updateInitialUnits(unitsToSave);
      this.initialUnits = unitsToSave;
      this.showInitialUnitsDialog = false;
      this.fetchSensorConfigs(); // Refresh configs after saving units
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error saving initial units:', error);
    }
  }

  triggerInitialUnitsEdit() {
    this.showInitialUnitsDialog = true;
    this.cdr.detectChanges();
  }

  applyConversion(val: number, paramId: string): number {
    const idMap: { [key: string]: string } = { 'u': 'wind_ux', 'v': 'wind_uy', 'w': 'wind_uz' };
    const dbParamId = idMap[paramId] || paramId;

    const initialUnitObj = this.initialUnits.find(u => u.parameter_id === dbParamId);
    const targetConfig = this.sensorConfigs.find(c => c.parameter_id === dbParamId);

    if (!initialUnitObj || !targetConfig) return val;

    return this.conversionService.convert(val, paramId, initialUnitObj.unit, targetConfig.unit);
  }

  dataSubscription: Subscription | undefined;
  timeSubscription: Subscription | undefined;







  // expandedSideBar = true;
  // activeTab = 'home';
  // selectedStation: string | null = 'Pondi';

  anemometerData: AnemometerData = {
    u: 0,
    v: 0,
    w: 0,
    sos: 0,
    rain: 0,
    temp: 0,
    solar: 0,
    lat: 0,
    lon: 0,
    humidity: 0,
    pressure: 0,
    battery: 0,
    wind_speed: 0,
    wind_direction: 0
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
    { id: 'dashboard', icon: 'fa-house', label: 'Dashboard' },
    { id: 'report', icon: 'fa-file-lines', label: 'Reports' },
    { id: 'analysis', icon: 'fa-chart-line', label: 'Analysis' },
    { id: 'users', icon: 'fa-users-gear', label: 'User Management' },
    { id: 'settings', icon: 'fa-gear', label: 'Settings' },
    { id: 'ship-schedule', icon: 'fa-ship', label: 'Ship Schedule' },
    { id: 'profile', icon: 'fa-user', label: 'Profile' },
  ];

  // Report Column Visibility
  reportColumns = [
    { label: 'Wind U', key: 'uv', visible: true },
    { label: 'Wind V', key: 'uy', visible: true },
    { label: 'Wind W', key: 'uz', visible: true },
    { label: 'SOS', key: 'sos', visible: true },
    { label: 'Rainfall', key: 'rain', visible: true },
    { label: 'Temp', key: 'temp', visible: true },
    { label: 'Solar Rad', key: 'solar', visible: true },
    { label: 'Humidity', key: 'humidity', visible: true },
    { label: 'Pressure', key: 'pressure', visible: true },
    { label: 'Battery', key: 'battery', visible: true },
    { label: 'Wind Speed', key: 'wind_speed', visible: true },
    { label: 'Wind Direction', key: 'wind_direction', visible: true }
  ];

  getReportColumnLabel(key: string): string {
    const col = this.reportColumns.find(c => c.key === key);
    if (!col) return key;

    // Map key to parameter_id for lookup
    const paramIdMap: { [key: string]: string } = {
      'uv': 'wind_ux', 'uy': 'wind_uy', 'uz': 'wind_uz',
      'rain': 'rain', 'temp': 'temp', 'solar': 'solar',
      'humidity': 'humidity', 'pressure': 'pressure', 'battery': 'battery',
      'wind_speed': 'wind_speed', 'wind_direction': 'wind_direction'
    };

    const paramId = paramIdMap[key];
    const cfg = this.sensorConfigs.find(c => c.parameter_id === paramId);
    return cfg ? `${col.label} (${cfg.unit})` : col.label;
  }

  // Settings Thresholds
  // Profile Data
  currentUser: any = {};

  reportData: any[] = [];
  currentDateTime = new Date();


  // onChangeExpandSideBar() {
  //   this.expandedSideBar = !this.expandedSideBar;
  // }

  // setActiveTab(tabId: string) {
  //   this.activeTab = tabId;
  // }

  async loadLatestWindData() {
    // Fetch from high-performance RAM cache on backend
    const historicalData = await this.apiService.getLatestHourData();

    if (historicalData.length > 0) {
      // Data is ordered DESC, so index 0 is the latest
      const latestData = historicalData[0];

      this.anemometerData = {
        u: this.applyConversion(latestData.wind_uv, 'wind_ux'),
        v: this.applyConversion(latestData.wind_uy, 'wind_uy'),
        w: this.applyConversion(latestData.wind_uz, 'wind_uz'),
        sos: latestData.sos || 0,
        rain: this.applyConversion(latestData.rain_fall, 'rain'),
        temp: this.applyConversion(latestData.temp, 'temp'),
        solar: this.applyConversion(latestData.solar_rad, 'solar'),
        lat: latestData.lat,
        lon: latestData.lon,
        humidity: this.applyConversion(latestData.humidity || 65, 'humidity'),
        pressure: this.applyConversion(latestData.pressure || 1013.2, 'pressure'),
        battery: this.applyConversion(latestData.battery || 92, 'battery'),
        wind_speed: this.applyConversion(latestData.wind_speed || 0, 'wind_speed'),
        wind_direction: latestData.wind_direction || 0
      };

      // Populate widgets with actual historical trends from today
      this._widgetData.forEach(w => {
        if (w.id === 'u') w.val = this.anemometerData.u;
        else if (w.id === 'v') w.val = this.anemometerData.v;
        else if (w.id === 'w') w.val = this.anemometerData.w;
        else if (w.id === 'sos') w.val = this.anemometerData.sos;
        else if (w.id === 'humidity') w.val = this.anemometerData.humidity;
        else if (w.id === 'pressure') w.val = this.anemometerData.pressure;
        else if (w.id === 'solar') w.val = this.anemometerData.solar;
        else if (w.id === 'temp') w.val = this.anemometerData.temp;
        else if (w.id === 'rain') w.val = this.anemometerData.rain;
        else if (w.id === 'battery') w.val = this.anemometerData.battery;
        else if (w.id === 'wind_speed') w.val = this.anemometerData.wind_speed;
        else if (w.id === 'wind_direction') w.val = this.anemometerData.wind_direction;
        else if (w.id === 'gps') { w.val = latestData.lat; w.lat = latestData.lat; w.lon = latestData.lon; }

        if (w.trend && w.id !== 'gps') {
          // Small Cards: Last 1 minute (60 points) as requested
          const oneMinHistory = historicalData.slice(0, 60).reverse();
          w.trend = oneMinHistory.map(item => {
            if (w.id === 'u') return this.applyConversion(item.wind_uv, 'wind_ux');
            if (w.id === 'v') return this.applyConversion(item.wind_uy, 'wind_uy');
            if (w.id === 'w') return this.applyConversion(item.wind_uz, 'wind_uz');
            if (w.id === 'sos') return item.sos || 0;
            if (w.id === 'humidity') return this.applyConversion(item.humidity || 65, 'humidity');
            if (w.id === 'pressure') return this.applyConversion(item.pressure || 1013.2, 'pressure');
            if (w.id === 'solar') return this.applyConversion(item.solar_rad, 'solar');
            if (w.id === 'temp') return this.applyConversion(item.temp, 'temp');
            if (w.id === 'rain') return this.applyConversion(item.rain_fall, 'rain');
            if (w.id === 'battery') return this.applyConversion(item.battery || 92, 'battery');
            if (w.id === 'wind_speed') return this.applyConversion(item.wind_speed || 0, 'wind_speed');
            if (w.id === 'wind_direction') return item.wind_direction || 0;
            return 0;
          });

          // Padding for visual consistency if day just started
          while (w.trend.length < 20) {
            w.trend.unshift(w.trend[0] || Number(w.val));
          }
        }
      });

      // Trajectory Charts: Keep strictly to last 60 points (1 minute) to match cards
      const oneMinHistory = historicalData.slice(0, 60).reverse();
      this.fullDayTrends = {
        u: oneMinHistory.map(d => [new Date(d.datetime).getTime(), this.applyConversion(d.wind_uv, 'wind_ux')]),
        v: oneMinHistory.map(d => [new Date(d.datetime).getTime(), this.applyConversion(d.wind_uy, 'wind_uy')]),
        w: oneMinHistory.map(d => [new Date(d.datetime).getTime(), this.applyConversion(d.wind_uz, 'wind_uz')]),
        sos: oneMinHistory.map(d => [new Date(d.datetime).getTime(), d.sos || 0])
      };

      this.cdr.markForCheck();
    }
  }

  getWeatherInfo() {
    const data = this.anemometerData;
    const u = data.u || 0;
    const v = data.v || 0;
    const w = data.w || 0;
    const rain = data.rain || 0;
    const solar = data.solar || 0;
    const humidity = data.humidity || 0;
    const temp = data.temp || 0;

    const windSpeed = Math.sqrt(Math.pow(u, 2) + Math.pow(v, 2) + Math.pow(w, 2));

    let condition = "Fair";
    let icon = "fa-sun";
    let color = "text-yellow-400";
    let glow = "rgba(250,204,21,0.5)";

    // Priority based conditions
    if (rain > 0 && windSpeed > 10) {
      condition = "Stormy";
      icon = "fa-cloud-showers-heavy";
      color = "text-slate-600 dark:text-slate-400";
      glow = "rgba(100,116,139,0.5)";
    } else if (rain > 0) {
      condition = "Rainy";
      icon = "fa-cloud-rain";
      color = "text-blue-400 dark:text-blue-500";
      glow = "rgba(96,165,250,0.5)";
    } else if (solar > 600) {
      condition = "Clear";
      icon = "fa-sun";
      color = "text-yellow-400";
      glow = "rgba(250,204,21,0.5)";
    } else if (solar >= 250 && solar <= 600) {
      condition = "Partly Cloudy";
      icon = "fa-cloud-sun";
      color = "text-yellow-500";
      glow = "rgba(234,179,8,0.5)";
    } else if (solar < 250 && humidity > 70) {
      condition = "Cloudy";
      icon = "fa-cloud";
      color = "text-slate-400 dark:text-slate-300";
      glow = "rgba(148,163,184,0.5)";
    } else if (windSpeed > 8) {
      condition = "Windy";
      icon = "fa-wind";
      color = "text-cyan-400 dark:text-cyan-300";
      glow = "rgba(34,211,238,0.5)";
    }

    const tempUnit = this.sensorConfigs.find(c => c.parameter_id === 'temp')?.unit || '°C';
    const windUnit = this.sensorConfigs.find(c => c.parameter_id === 'wind_ux')?.unit || 'm/s';

    return {
      condition,
      temperature: temp,
      tempUnit,
      windSpeed: windSpeed.toFixed(1),
      windUnit,
      humidity: humidity,
      pressure: data.pressure || 1013.2,
      icon,
      color,
      glow
    };
  }

  updateAnemometerData() {
    this.anemometerData = {
      u: parseFloat((this.anemometerData.u + (Math.random() - 0.5) * 2).toFixed(1)),
      v: parseFloat((this.anemometerData.v + (Math.random() - 0.5) * 2).toFixed(1)),
      w: parseFloat((this.anemometerData.w + (Math.random() - 0.5) * 0.5).toFixed(1)),
      sos: parseFloat((this.anemometerData.sos + (Math.random() - 0.5) * 1).toFixed(1)),
      rain: parseFloat(Math.max(0, this.anemometerData.rain + (Math.random() - 0.5) * 0.5).toFixed(1)),
      temp: parseFloat((this.anemometerData.temp + (Math.random() - 0.5) * 0.3).toFixed(1)),
      solar: Math.floor(this.anemometerData.solar + (Math.random() - 0.5) * 50),
      lat: this.anemometerData.lat,
      lon: this.anemometerData.lon,
      humidity: parseFloat(((this.anemometerData.humidity || 65) + (Math.random() - 0.5) * 2).toFixed(1)),
      pressure: parseFloat(((this.anemometerData.pressure || 1013.2) + (Math.random() - 0.5) * 1).toFixed(1)),
      battery: this.anemometerData.battery || 92
    };
    this.cdr.markForCheck();
  }

  async generateReportData() {
    try {
      // Use high-performance RAM cache for initial load
      const allWindData = await this.apiService.getLatestHourData();

      // Transform API data into report format with unit conversion
      this.reportData = allWindData.map(item => ({
        date: new Date(item.datetime).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        u: Number(this.applyConversion(item.wind_uv || 0, 'wind_ux')).toFixed(2),
        v: Number(this.applyConversion(item.wind_uy || 0, 'wind_uy')).toFixed(2),
        w: Number(this.applyConversion(item.wind_uz || 0, 'wind_uz')).toFixed(2),
        sos: Number(item.sos || 0).toFixed(2),
        rain: Number(this.applyConversion(item.rain_fall || 0, 'rain')).toFixed(2),
        temp: Number(this.applyConversion(item.temp || 0, 'temp')).toFixed(2),
        solar: Number(this.applyConversion(item.solar_rad || 0, 'solar')).toFixed(2),
        humidity: Number(this.applyConversion(item.humidity || 0, 'humidity')).toFixed(2),
        pressure: Number(this.applyConversion(item.pressure || 0, 'pressure')).toFixed(2),
        battery: Number(this.applyConversion(item.battery || 0, 'battery')).toFixed(2),
        wind_speed: Number(this.applyConversion(item.wind_speed || 0, 'wind_speed')).toFixed(2),
        wind_direction: Number(item.wind_direction || 0).toFixed(2)
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



  syncActiveTabWithRoute() {
    const path = this.router.url.split('/').pop() || 'dashboard';
    this.activeTab = path === 'base' ? 'dashboard' : path;
    this.cdr.markForCheck();
  }

  setActiveTab(id: string) {
    this.activeTab = id;
    this.router.navigate(['/base', id]);
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

  private _widgetData: any[] = [];
  get widgetData() { return this._widgetData; }

  initializeWidgets() {
    const getUnit = (id: string) => this.sensorConfigs.find(c => c.parameter_id === id)?.unit || '';
    const getThreshold = (id: string) => {
      const cfg = this.sensorConfigs.find(c => c.parameter_id === id);
      return {
        has: cfg?.has_threshold ?? false,
        val: cfg?.threshold_value ?? 0
      };
    };

    this._widgetData = [
      { id: 'u', icon: 'fa-wind', label: 'Wind U', val: this.anemometerData.u, unit: getUnit('wind_ux'), threshold: getThreshold('wind_ux'), pct: 75, barColor: 'from-cyan-400 to-blue-500', trend: [] },
      { id: 'v', icon: 'fa-wind', label: 'Wind V', val: this.anemometerData.v, unit: getUnit('wind_uy'), threshold: getThreshold('wind_uy'), pct: 60, barColor: 'from-cyan-400 to-blue-500', trend: [] },
      { id: 'w', icon: 'fa-wind', label: 'Wind W', val: this.anemometerData.w, unit: getUnit('wind_uz'), threshold: getThreshold('wind_uz'), pct: 85, barColor: 'from-cyan-400 to-blue-500', trend: [] },
      { id: 'sos', icon: 'fa-bolt', label: 'SOS', val: this.anemometerData.sos, unit: 'm/s', threshold: { has: false, val: 0 }, pct: 100, barColor: 'from-blue-400 to-indigo-500', trend: [] },
      { id: 'humidity', icon: 'fa-droplet', label: 'Humidity', val: this.anemometerData.humidity, unit: getUnit('humidity'), threshold: getThreshold('humidity'), pct: 65, barColor: 'from-blue-400 to-cyan-400', trend: [] },
      { id: 'pressure', icon: 'fa-gauge-high', label: 'Pressure', val: this.anemometerData.pressure, unit: getUnit('pressure'), threshold: getThreshold('pressure'), pct: 80, barColor: 'from-indigo-400 to-blue-500', trend: [] },
      { id: 'solar', icon: 'fa-sun', label: 'Solar Rad', val: this.anemometerData.solar, unit: getUnit('solar'), threshold: getThreshold('solar'), pct: 90, barColor: 'from-yellow-400 to-orange-500', trend: [] },
      { id: 'temp', icon: 'fa-temperature-half', label: 'Temp', val: this.anemometerData.temp, unit: getUnit('temp'), threshold: getThreshold('temp'), pct: 65, barColor: 'from-orange-400 to-red-500', trend: [] },
      { id: 'rain', icon: 'fa-cloud-rain', label: 'Rainfall', val: this.anemometerData.rain, unit: getUnit('rain'), threshold: getThreshold('rain'), pct: 0, barColor: 'from-blue-400 to-cyan-400', trend: [] },
      { id: 'gps', icon: 'fa-location-dot', label: 'GPS Position', val: this.anemometerData.lat, lat: this.anemometerData.lat, lon: this.anemometerData.lon, threshold: { has: false, val: 0 }, unit: '', pct: 100, barColor: 'from-green-400 to-cyan-400', trend: [] },
      { id: 'battery', icon: 'fa-battery-full', label: 'Battery', val: this.anemometerData.battery, unit: getUnit('battery'), threshold: getThreshold('battery'), pct: 92, barColor: 'from-emerald-400 to-green-500', trend: [] },
      { id: 'wind_speed', icon: 'fa-gauge-high', label: 'Wind Speed', val: this.anemometerData.wind_speed, unit: getUnit('wind_speed'), threshold: getThreshold('wind_speed'), pct: 70, barColor: 'from-blue-400 to-cyan-400', trend: [] },
      { id: 'wind_direction', icon: 'fa-compass', label: 'Wind Direction', val: this.anemometerData.wind_direction, unit: getUnit('wind_direction'), threshold: { has: false, val: 0 }, pct: 100, barColor: 'from-indigo-400 to-blue-500', trend: [] },
    ];
  }
}
