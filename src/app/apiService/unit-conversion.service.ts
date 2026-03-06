import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UnitConversionService {

  // Speed: Base is m/s
  private speedFactors: { [key: string]: number } = {
    'm/s': 1,
    'km/h': 3.6,
    'mph': 2.23694,
    'knots (kt)': 1.94384,
    'ft/s': 3.28084,
    'cm/s': 100
  };

  // Temperature
  private toCelsius(val: number, unit: string): number {
    switch (unit) {
      case '°C': return val;
      case '°F': return (val - 32) * 5 / 9;
      case 'K (Kelvin)': return val - 273.15;
      case '°R (Rankine)': return (val - 491.67) * 5 / 9;
      default: return val;
    }
  }

  private fromCelsius(val: number, unit: string): number {
    switch (unit) {
      case '°C': return val;
      case '°F': return (val * 9 / 5) + 32;
      case 'K (Kelvin)': return val + 273.15;
      case '°R (Rankine)': return (val * 9 / 5) + 491.67;
      default: return val;
    }
  }

  // Rainfall / Length: Base is mm
  private lengthFactors: { [key: string]: number } = {
    'mm': 1,
    'cm': 0.1,
    'inch': 0.0393701,
    'mm/hr': 1,
    'inch/hr': 0.0393701
  };

  // Pressure: Base is hPa (mbar)
  private pressureFactors: { [key: string]: number } = {
    'hPa': 1,
    'mbar': 1,
    'Pa': 100,
    'kPa': 0.1,
    'atm': 0.000986923,
    'mmHg': 0.750062,
    'inHg': 0.02953,
    'bar': 0.001
  };

  // Solar: Base is W/m²
  private solarFactors: { [key: string]: number } = {
    'W/m²': 1,
    'kW/m²': 0.001,
    'lux': 1, // Not a direct energy conversion but often used as proxy
    'MJ/m²': 0.0036, // W = J/s. This is complex without time. Using 1W for 1 hour = 0.0036 MJ.
    'cal/cm²/min': 0.001433
  };

  // Battery: Base is V
  private batteryFactors: { [key: string]: number } = {
    'V': 1,
    'mV': 1000,
    '%': 1, // Assume 1V = 1%? Usually voltage is translated. I'll keep 1 if %
    'Ah': 1,
    'mAh': 1000,
    'W': 1
  };

  convert(value: number, paramId: string, fromUnit: string, toUnit: string): number {
    if (fromUnit === toUnit) return value;
    if (value === null || value === undefined) return value;

    // Wind Parameters (Speed)
    if (paramId === 'wind_ux' || paramId === 'wind_uy' || paramId === 'wind_uz' || paramId === 'wind_speed') {
      const base = value / (this.speedFactors[fromUnit] || 1);
      return base * (this.speedFactors[toUnit] || 1);
    }

    // Temperature
    if (paramId === 'temp') {
      const celsius = this.toCelsius(value, fromUnit);
      return this.fromCelsius(celsius, toUnit);
    }

    // Rainfall
    if (paramId === 'rain') {
      const base = value / (this.lengthFactors[fromUnit] || 1);
      return base * (this.lengthFactors[toUnit] || 1);
    }

    // Pressure
    if (paramId === 'pressure') {
      const base = value / (this.pressureFactors[fromUnit] || 1);
      return base * (this.pressureFactors[toUnit] || 1);
    }

    // Solar
    if (paramId === 'solar') {
      const base = value / (this.solarFactors[fromUnit] || 1);
      return base * (this.solarFactors[toUnit] || 1);
    }

    // Battery
    if (paramId === 'battery') {
      const volts = value / (this.batteryFactors[fromUnit] || 1); // Get to V
      if (toUnit === '%') {
        // 12.4V = 100%
        return Math.min(100, (volts / 12.4) * 100);
      }
      return volts * (this.batteryFactors[toUnit] || 1);
    }

    return value; // Default no conversion (e.g. Humidity % or unknown)
  }
}
