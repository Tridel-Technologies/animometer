import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from "../../map/map";

interface WidgetData {
  icon: string;
  label: string;
  val: number;
  unit: string;
  pct: number;
  barColor: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MapComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit{
  @Input() anemometerData: any;
  @Input() selectedStation: string | null = null;
  @Input() widgetData: WidgetData[] = [];

  ngOnInit(): void {
      
  }
}
