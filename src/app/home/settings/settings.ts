import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Threshold {
  label: string;
  value: number;
  unit: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  @Input() thresholds: Threshold[] = [];
}
