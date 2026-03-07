import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';


export interface WindData {
  id: number;
  wind_uv: number;
  wind_uy: number;
  wind_uz: number;
  rain_fall: number;
  temp: number;
  solar_rad: number;
  lat: number;
  lon: number;
  datetime: string; // ISO timestamp from backend
  humidity?: number;
  pressure?: number;
  battery?: number;
  wind_speed?: number;
  wind_direction?: number;
  sos?: number;
  altitude?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  baseUrl: string = 'http://localhost:3000/api';

  constructor(private http:HttpClient) {}

  getApiUrl(endpoint: string): string {
    return `${this.baseUrl}/${endpoint}`;
  }

  formatDateForQuery(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
  }

  async fetchWindData(): Promise<WindData[]> {
    try {
      const response = await lastValueFrom(this.http.get<WindData[]>(this.getApiUrl('wind-data')));
      return response || [];
    } catch (error) {
      console.error('Error fetching wind data:', error);
      return [];
    }
  }

  async getFilteredWindData(startDate: string, endDate: string, limit?: number, step?: number): Promise<WindData[]> {
    try {
      let url = `${this.getApiUrl('wind-data')}?startDate=${startDate}&endDate=${endDate}`;
      if (limit) url += `&limit=${limit}`;
      if (step) url += `&step=${step}`;
      const response = await lastValueFrom(this.http.get<WindData[]>(url));
      return response || [];
    } catch (error) {
      console.error('Error fetching filtered wind data:', error);
      return [];
    }
  }

  async getLatestHourData(): Promise<WindData[]> {
    try {
      const response = await lastValueFrom(this.http.get<WindData[]>(this.getApiUrl('latest-hour')));
      return response || [];
    } catch (error) {
      console.error('Error fetching latest hour data:', error);
      return [];
    }
  }

  async getLatestWindData(): Promise<WindData | null> {
    try {
      const response = await lastValueFrom(this.http.get<WindData[]>(this.getApiUrl('wind-data?limit=1')));
      if (response && response.length > 0) {
        return response[0];
      }
      return null;
    } catch (error) {
      console.error('Error fetching latest wind data:', error);
      return null;
    }
  }

  // User Management
  getUsers(): Promise<any[]> {
    return lastValueFrom(this.http.get<any[]>(this.getApiUrl('users'))).then(res => res || []);
  }

  createUser(user: any): Promise<any> {
    return lastValueFrom(this.http.post<any>(this.getApiUrl('users'), user));
  }

  updateUser(id: number, user: any): Promise<any> {
    return lastValueFrom(this.http.put<any>(this.getApiUrl('users/' + id), user));
  }

  deleteUser(id: number): Promise<any> {
    return lastValueFrom(this.http.delete<any>(this.getApiUrl('users/' + id)));
  }

  // Roles
  getRoles(): Promise<any[]> {
    return lastValueFrom(this.http.get<any[]>(this.getApiUrl('roles'))).then(res => res || []);
  }

  createRole(role: any): Promise<any> {
    return lastValueFrom(this.http.post<any>(this.getApiUrl('roles'), role));
  }

  updateRole(id: number, role: any): Promise<any> {
    return lastValueFrom(this.http.put<any>(this.getApiUrl('roles/' + id), role));
  }

  deleteRole(id: number): Promise<any> {
    return lastValueFrom(this.http.delete<any>(this.getApiUrl('roles/' + id)));
  }

  // Designations
  getDesignations(): Promise<any[]> {
    return lastValueFrom(this.http.get<any[]>(this.getApiUrl('designations'))).then(res => res || []);
  }

  createDesignation(designation: any): Promise<any> {
    return lastValueFrom(this.http.post<any>(this.getApiUrl('designations'), designation));
  }

  updateDesignation(id: number, designation: any): Promise<any> {
    return lastValueFrom(this.http.put<any>(this.getApiUrl('designations/' + id), designation));
  }

  deleteDesignation(id: number): Promise<any> {
    return lastValueFrom(this.http.delete<any>(this.getApiUrl('designations/' + id)));
  }

  // Sensor Config
  getSensorConfig(): Promise<any[]> {
    return lastValueFrom(this.http.get<any[]>(this.getApiUrl('sensor-config'))).then(res => res || []);
  }

  updateSensorConfig(configs: any[]): Promise<any> {
    return lastValueFrom(this.http.post<any>(this.getApiUrl('sensor-config'), { configs }));
  }

  // Initial Units
  getInitialUnits(): Promise<any[]> {
    return lastValueFrom(this.http.get<any[]>(this.getApiUrl('initial-units'))).then(res => res || []);
  }

  updateInitialUnits(units: any[]): Promise<any> {
    return lastValueFrom(this.http.post<any>(this.getApiUrl('initial-units'), { units }));
  }

  // Station Management
  getStation(): Promise<any> {
    return lastValueFrom(this.http.get<any>(this.getApiUrl('station'))).then(res => res || null);
  }

  updateStation(name: string, parameters_list: any[] = []): Promise<any> {
    return lastValueFrom(this.http.post<any>(this.getApiUrl('station'), { name, parameters_list }));
  }

  // Authentication
  login(credentials: any): Promise<any> {
    return lastValueFrom(this.http.post<any>(this.getApiUrl('login'), credentials));
  }

  checkEmail(email: string): Promise<any> {
    return lastValueFrom(this.http.post<any>(this.getApiUrl('check-email'), { email }));
  }

  resetPassword(data: any): Promise<any> {
    return lastValueFrom(this.http.post<any>(this.getApiUrl('reset-password'), data));
  }
}
