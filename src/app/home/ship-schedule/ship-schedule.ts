import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MapComponent } from '../../map/map';
import { ShipScheduleService } from './ship-schedule.service';

export interface Station {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  activity: string;
}

export interface CruiseRoute {
  id: string;
  vessel: string;
  project: string;
  chiefScientist: string;
  startDate: string;
  endDate: string;
  departurePort: string;
  arrivalPort: string;
  studyArea: string;
  samplePlan: string;
  equipment: string;
  duration: number;
  status: 'Planned' | 'Proposed' | 'Tentative' | 'Completed';
  stations: Station[];
}

@Component({
  selector: 'app-ship-schedule',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MapComponent],
  templateUrl: './ship-schedule.html',
  styleUrl: './ship-schedule.css',
})
export class ShipSchedule implements OnInit {
  isFormView = false;
  cruiseForm!: FormGroup;
  scheduleService = inject(ShipScheduleService);

  savedCruises: CruiseRoute[] = [];
  selectedCruise: CruiseRoute | null = null;
  routeCoordinates: [number, number][] = [];
  
  statusFilter: string = 'All'; // Filter state

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.initForm();
    this.loadCruises();
  }

  getFilteredCruises(): CruiseRoute[] {
    if (this.statusFilter === 'All') {
      return this.savedCruises;
    }
    return this.savedCruises.filter(c => c.status === this.statusFilter);
  }

  loadCruises(): void {
    this.scheduleService.getCruises().subscribe({
      next: (data) => {
        this.savedCruises = data;
      },
      error: (err) => console.error('Failed to load cruises', err)
    });
  }

  initForm(): void {
    this.cruiseForm = this.fb.group({
      id: ['', Validators.required],
      vessel: ['', Validators.required],
      project: ['', Validators.required],
      chiefScientist: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      departurePort: ['', Validators.required],
      arrivalPort: ['', Validators.required],
      studyArea: ['', Validators.required],
      samplePlan: [''],
      equipment: [''],
      duration: [1, [Validators.required, Validators.min(1)]],
      status: ['Proposed', Validators.required],
      stations: this.fb.array([])
    });
    
    // Subscribe to form value changes to update the map route
    this.cruiseForm.get('stations')?.valueChanges.subscribe(() => {
      this.updateRouteCoordinates();
    });

    // Auto-calculate duration based on start and end dates
    this.cruiseForm.get('startDate')?.valueChanges.subscribe(() => this.calculateDuration());
    this.cruiseForm.get('endDate')?.valueChanges.subscribe(() => this.calculateDuration());
  }

  calculateDuration(): void {
    const start = this.cruiseForm.get('startDate')?.value;
    const end = this.cruiseForm.get('endDate')?.value;
    
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0) {
         // E.g., start 20th, end 28th = 8 days. 
         this.cruiseForm.patchValue({ duration: diffDays || 1 }, { emitEvent: false });
      } else {
         this.cruiseForm.patchValue({ duration: 1 }, { emitEvent: false });
      }
    }
  }

  get stations(): FormArray {
    return this.cruiseForm.get('stations') as FormArray;
  }

  createStationFormGroup(station?: Station): FormGroup {
    return this.fb.group({
      name: [station?.name || '', Validators.required],
      latitude: [station?.latitude || '', [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: [station?.longitude || '', [Validators.required, Validators.min(-180), Validators.max(180)]],
      activity: [station?.activity || '', Validators.required]
    });
  }

  addStation(): void {
    const stationNumber = this.stations.length + 1;
    this.stations.push(this.createStationFormGroup({
      name: `Station ${stationNumber}`,
      latitude: 0,
      longitude: 0,
      activity: ''
    }));
  }

  removeStation(index: number): void {
    this.stations.removeAt(index);
  }

  openNewForm(): void {
    this.isFormView = true;
    this.selectedCruise = null;
    this.cruiseForm.reset();
    this.stations.clear();
    this.cruiseForm.patchValue({ status: 'Proposed', duration: 1 });
    // Add one default station
    this.addStation();
    this.updateRouteCoordinates();
  }

  editCruise(cruise: CruiseRoute): void {
    this.isFormView = true;
    this.selectedCruise = cruise;
    
    // format dates if needed for value patching
    const formatDt = (dtStr: string) => dtStr ? new Date(dtStr).toISOString().split('T')[0] : '';

    this.cruiseForm.patchValue({
      id: cruise.id,
      vessel: cruise.vessel,
      project: cruise.project,
      chiefScientist: cruise.chiefScientist,
      startDate: formatDt(cruise.startDate),
      endDate: formatDt(cruise.endDate),
      departurePort: cruise.departurePort,
      arrivalPort: cruise.arrivalPort,
      studyArea: cruise.studyArea,
      samplePlan: cruise.samplePlan,
      equipment: cruise.equipment,
      duration: cruise.duration,
      status: cruise.status
    });

    this.stations.clear();
    if (cruise.stations && cruise.stations.length > 0) {
      cruise.stations.forEach(st => {
        this.stations.push(this.createStationFormGroup(st));
      });
    } else {
      this.addStation();
    }
    this.updateRouteCoordinates();
  }

  saveCruise(): void {
    if (this.cruiseForm.invalid) {
       this.cruiseForm.markAllAsTouched();
       return;
    }

    const formValue = this.cruiseForm.value as CruiseRoute;
    
    this.scheduleService.saveCruise(formValue).subscribe({
      next: () => {
        this.loadCruises(); // refresh data
        this.cancelForm();
      },
      error: (err) => {
        console.error('Failed to save cruise', err);
        alert('Error saving cruise details');
      }
    });
  }

  cancelForm(): void {
    this.isFormView = false;
    this.selectedCruise = null;
  }

  updateRouteCoordinates(): void {
    const stationsList = this.stations.value as Station[];
    const validStations = stationsList.filter(s => s.latitude && s.longitude);
    
    // We expect coordinates as [longitude, latitude] for Mapbox
    this.routeCoordinates = validStations.map(s => [s.longitude, s.latitude] as [number, number]);
  }

  getRouteSequenceString(): string {
     const departure = this.cruiseForm.get('departurePort')?.value || 'Departure';
     const arrival = this.cruiseForm.get('arrivalPort')?.value || 'Arrival';
     const stationsVal = this.stations.value as Station[];
     if(stationsVal.length === 0) return 'No route defined';
     
     const stationNames = stationsVal.map(s => s.name || 'Unnamed').join(' \u2192 ');
     return `${departure} \u2192 ${stationNames} \u2192 ${arrival}`;
  }

  exportToExcel(): void {
    if (this.savedCruises.length === 0) {
      alert('No data to export.');
      return;
    }
    
    // Basic CSV generation for dummy Export functionality
    const headers = ['Cruise ID', 'Vessel', 'Project', 'Chief Scientist', 'Start Date', 'End Date', 'Duration (Days)', 'Departure Port', 'Arrival Port', 'Study Area', 'Status', 'Route Sequence'];
    
    const rows = this.savedCruises.map(c => {
       const stationNames = c.stations?.map(s => s.name).join(' -> ') || 'None';
       const sequence = `${c.departurePort} -> ${stationNames} -> ${c.arrivalPort}`;
       const fmtDate = (str: string) => str ? str.split('T')[0] : '';

       return [
         c.id, c.vessel, c.project, c.chiefScientist, fmtDate(c.startDate), fmtDate(c.endDate), 
         c.duration?.toString(), c.departurePort, c.arrivalPort, c.studyArea, c.status, sequence
       ].map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + '\n' + rows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ship_cruise_schedules.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

