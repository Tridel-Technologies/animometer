import { Component, AfterViewInit, ElementRef, ViewChild, OnInit, OnDestroy, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WindChartComponent } from '../../wind-chart/wind-chart';
import { PolarChartComponent, PolarAxis } from '../../polar-chart/polar-chart';

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [CommonModule, WindChartComponent, PolarChartComponent],
  templateUrl: './analysis.html',
  styleUrl: './analysis.css',
})
export class Analysis implements OnInit, AfterViewInit, OnDestroy {
  @Input() reportData: any[] = [];
  @Input() anemometerData: any;
  @ViewChild('leftChartContainer', { static: false }) leftChartContainer!: ElementRef;
  @ViewChild('rightChartContainer', { static: false }) rightChartContainer!: ElementRef;
  @ViewChild('polarChartContainer', { static: false }) polarChartContainer!: ElementRef;

  // Chart dimensions
  leftChartWidth: number = 400;
  leftChartHeight: number = 200;
  polarChartWidth: number = 400;
  polarChartHeight: number = 400;

  // Filter options
  timeScales = [
    { label: 'Day', value: 'day' },
    { label: 'Week', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Year', value: 'year' }
  ];

  selectedTimeScale: string = 'day';
  selectedDate: string = new Date().toISOString().split('T')[0];
  selectedStation: string = 'Main Mast 01';

  stations = [
    'Main Mast 01',
    'Front Bridge 02',
    'Port Side 03',
    'Starboard Side 04'
  ];

  parameters = [
    { label: 'Wind Speed', key: 'windSpeed', selected: true },
    { label: 'Wind Direction', key: 'windDirection', selected: true },
    { label: 'Temperature', key: 'temperature', selected: false },
    { label: 'Humidity', key: 'humidity', selected: false },
    { label: 'Pressure', key: 'pressure', selected: false }
  ];

  // Sample data for one day with 30-minute intervals (48 data points)
  windData: any[] = [];
  polarData: PolarAxis[] = [];

  ngOnInit() {
    this.generateSampleData();
    setTimeout(() => {
      this.updateChartDimensions();
    }, 1000);
  }

 @ViewChild('chartContainer') chartContainer!: ElementRef<HTMLDivElement>;
chartWidth!:number;
chartHeight!:number;
  ngAfterViewInit() {
    const el = this.chartContainer.nativeElement;

    const width = el.offsetWidth;
    const height = el.offsetHeight ;
    this.chartWidth = width;
    this.chartHeight = height -10;

    console.log('Width:', width);
    console.log('Height:', height);
  }

  generateSampleData() {
    // Use reportData if available, otherwise use anemometerData
    if (this.reportData && this.reportData.length > 0) {
      this.windData = this.reportData.map((item: any) => ({
        time: item.date,
        speed: parseFloat(item.uv),
        direction: (Math.random() * 360) // Calculate direction from UV and UY components
      }));

      this.polarData = this.reportData.map((item: any) => ({
        name: 'wind',
        speed: item.uv,
        direction: ((Math.atan2(parseFloat(item.uy), parseFloat(item.uv)) * 180 / Math.PI + 360) % 360).toString()
      }));
    } else if (this.anemometerData) {
      // Use current anemometer data as fallback
      const time = new Date();
      const speed = Math.sqrt(
        this.anemometerData.uv ** 2 + 
        this.anemometerData.uy ** 2 + 
        this.anemometerData.uz ** 2
      );
      const direction = (Math.atan2(this.anemometerData.uy, this.anemometerData.uv) * 180 / Math.PI + 360) % 360;

      this.windData = [{
        time: time.toISOString(),
        speed: speed,
        direction: direction
      }];

      this.polarData = [{
        name: 'wind',
        speed: speed.toString(),
        direction: direction.toString()
      }];
    } else {
      // Fallback to sample data
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      this.windData = [];
      this.polarData = [];

      for (let i = 0; i < 48; i++) {
        const time = new Date(startDate.getTime() + i * 30 * 60 * 1000);
        const baseSpeed = 8 + Math.sin(i / 4) * 3 + Math.random() * 2;
        const speed = Math.max(0, baseSpeed);
        const direction = (180 + Math.sin(i / 6) * 45 + Math.random() * 30) % 360;

        this.windData.push({
          time: time.toISOString(),
          speed: speed,
          direction: direction
        });

        this.polarData.push({
          name: 'wind',
          speed: speed.toString(),
          direction: direction.toString()
        });
      }
    }
  }

  updateChartDimensions() {
    if (this.leftChartContainer) {
      const rect = this.leftChartContainer.nativeElement.getBoundingClientRect();
      this.leftChartWidth = 1300;
      this.leftChartHeight = 300; // Split height for two charts
    }

    if (this.polarChartContainer) {
      const rect = this.polarChartContainer.nativeElement.getBoundingClientRect();
      this.polarChartWidth = 1300;
      this.polarChartHeight = 300;
    }
  }

  onTimeScaleChange(scale: string) {
    this.selectedTimeScale = scale;
    // In a real app, you would fetch data based on the selected time scale
    console.log('Time scale changed to:', scale);
    this.updateChartDimensions();
  }

  onDateChange(date: string) {
    this.selectedDate = date;
    // In a real app, you would fetch data for the selected date
    console.log('Date changed to:', date);
    this.updateChartDimensions();
  }

  onStationChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedStation = target.value;
    // In a real app, you would fetch data for the selected station
    console.log('Station changed to:', this.selectedStation);
    this.updateChartDimensions();
  }
   toggleParameter(param: any): void {
    param.selected = !param.selected;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.updateChartDimensions();
  }
ngOnDestroy(): void {
    
}
}
