import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';


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

  async fetchWindData():Promise<WindData[]> {
    try {
      const response = await this.http.get<WindData[]>(this.getApiUrl('wind-data')).toPromise();
      return response || [];
    } catch (error) {
      console.error('Error fetching wind data:', error);
      return [];
    }
  }

  async getLatestWindData(): Promise<WindData | null> {
    try {
      const allData = await this.fetchWindData();
      if (allData.length > 0) {
        return allData[allData.length - 1]; // Return last entry
      }
      return null;
    } catch (error) {
      console.error('Error fetching latest wind data:', error);
      return null;
    }
  }
}
