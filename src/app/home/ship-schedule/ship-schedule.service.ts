import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CruiseRoute } from './ship-schedule';

@Injectable({
  providedIn: 'root'
})
export class ShipScheduleService {
  private apiUrl = 'http://localhost:3000/api/ship-schedules';

  constructor(private http: HttpClient) {}

  getCruises(): Observable<CruiseRoute[]> {
    return this.http.get<CruiseRoute[]>(this.apiUrl);
  }

  saveCruise(cruise: CruiseRoute): Observable<any> {
    return this.http.post(this.apiUrl, cruise);
  }
}
