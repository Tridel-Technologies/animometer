import { Component, OnInit, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../apiService/api-service';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ThemeService } from '../../theme.service';

interface SensorConfig {
  parameter_id: string;
  parameter_name: string;
  unit: string;
  threshold_value: number | null;
  has_threshold: boolean;
  unitOptions: string[];
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, SelectModule, InputNumberModule, ToggleSwitchModule, ButtonModule, ToastModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  providers: [MessageService]
})
export class Settings implements OnInit {
  @Input() initialUnits: any[] = [];
  @Output() onEditInitialUnits = new EventEmitter<void>();
  @Output() onConfigSaved = new EventEmitter<void>();
  configs: SensorConfig[] = [];
  isLoading: boolean = true;
  stationName: string = '';
  activeSection: 'station' | 'sensors' | 'appearance' = 'station';

  // Unit Options mapping
  private unitMap: { [key: string]: string[] } = {
    'wind_ux': ['m/s', 'km/h', 'mph', 'knots (kt)', 'ft/s', 'cm/s'],
    'wind_uy': ['m/s', 'km/h', 'mph', 'knots (kt)', 'ft/s', 'cm/s'],
    'wind_uz': ['m/s', 'km/h', 'mph', 'knots (kt)', 'ft/s', 'cm/s'],
    'rain': ['mm', 'cm', 'inch', 'mm/hr', 'inch/hr'],
    'temp': ['°C', '°F', 'K (Kelvin)', '°R (Rankine)'],
    'solar': ['W/m²', 'kW/m²', 'MJ/m²', 'cal/cm²/min', 'lux'],
    'humidity': ['%RH', 'g/m³', 'kg/kg', 'g/kg', 'Pa (vapor pressure)'],
    'pressure': ['hPa', 'mbar', 'Pa', 'kPa', 'atm', 'mmHg', 'inHg', 'bar'],
    'battery': ['V', 'mV', '%', 'Ah', 'mAh', 'W']
  };

  constructor(
    private apiService: ApiService,
    private messageService: MessageService,
    public themeService: ThemeService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.fetchConfigs();
  }

  async fetchConfigs() {
    this.isLoading = true;
    try {
      const [configData, stationData] = await Promise.all([
        this.apiService.getSensorConfig(),
        this.apiService.getStation()
      ]);

      this.configs = configData.map(cfg => ({
        ...cfg,
        unitOptions: this.unitMap[cfg.parameter_id] || [cfg.unit]
      }));

      if (stationData) {
        this.stationName = stationData.name;
      }

      this.cdr.detectChanges();
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load sensor configurations' });
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async saveConfiguration() {
    try {
      await Promise.all([
        this.apiService.updateSensorConfig(this.configs),
        this.apiService.updateStation(this.stationName)
      ]);
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Configuration saved successfully' });
      this.onConfigSaved.emit();
    } catch (error) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save configuration' });
    }
  }
}
