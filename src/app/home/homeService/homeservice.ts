import { Injectable } from '@angular/core';
import { Layout } from '../../layout/layout';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Homeservice {
 private selectedStationSource = new BehaviorSubject<string | null>(null);

  // Observable (READ-ONLY)
  selectedStation$ = this.selectedStationSource.asObservable();

  // Setter (WRITE)
  setSelectedStation(station: string | null) {
    this.selectedStationSource.next(station);
  }
}
