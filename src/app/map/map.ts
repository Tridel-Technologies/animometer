import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import mapboxgl, { Marker } from 'mapbox-gl';
import { Homeservice } from '../home/homeService/homeservice';

@Component({
  selector: 'app-map', 
  standalone: true,
  templateUrl: './map.html',
  styleUrls: ['./map.css']
})
export class MapComponent implements OnInit, OnDestroy {
  @Input() selectedStation!: string;

  constructor( private station:Homeservice){}

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  map: any;
  private platformId = inject(PLATFORM_ID);

  // pondi 11.936086, 79.836348
  // isro 13.743292, 80.242799

tracklines:[number, number][] = [[79.791239,11.736941 ],[79.862166,11.822636 ],[80.710416,12.399832], [80.390569,12.985124 ], [80.426436,13.082963,], [ 80.458716,13.412881], [ 80.349323,13.606432]]
trackline2: [number, number][] = [
  // Thailand (Gulf of Thailand)
  [100.5018, 13.7563],   // Bangkok Port area
  [100.0000, 12.5000],
  [99.0000, 11.5000],

  // Andaman Sea
  [97.0000, 10.5000],
  [95.5000, 9.5000],
  [94.0000, 8.5000],

  // Bay of Bengal
  [92.0000, 7.5000],
  [90.0000, 6.5000],
  [88.0000, 5.5000],

  // South of Sri Lanka
  [85.5000, 5.0000],
  [82.5000, 4.5000],
  [80.0000, 5.0000],

  // Arabian Sea
  [76.0000, 8.0000],
  [72.0000, 12.0000],
  [68.0000, 16.0000],
  [64.0000, 18.5000],

  // Oman coast
  [60.0000, 20.0000],
  [58.0000, 21.5000],
  [56.0000, 23.6000]    // Muscat, Oman
];
  async ngOnInit() {
  if (!isPlatformBrowser(this.platformId)) return;

  const mapboxgl = (await import('mapbox-gl')).default;

  this.map = new mapboxgl.Map({
    accessToken: 'pk.eyJ1IjoiZ2FuYTg2MDIiLCJhIjoiY2xzdmJtOHoyMW4yODJsczA1MHVjdWY3ZSJ9.vdG-cAO4j-E7_-wnQNPW7w',
    container: this.mapContainer.nativeElement,
    // style: 'mapbox://styles/mapbox/dark-v11', // ✅ REQUIRED
    center: [80.263522, 12.749564],
    zoom: 3,
    pitch: 45,
    bearing: -17.6,
  });

  this.map.on('load', () => {
    // this.addMarker([79.836348, 11.936086], 'Pondi', 'assets/cam.png');
    // this.addMarker([80.242799, 13.743292], 'ISRO', 'assets/cam.png');
    this.addMarker(this.trackline2[4], 'Ship 1', 'assets/ship.png');
    this.addTrackPath(this.trackline2);
  });

  // ✅ click AFTER map init
  this.map.on('click', () => {
    this.station.setSelectedStation(null);
  });
}


  addTrackPath(coordinates: [number, number][]) {
  if (!this.map) return;

  // Remove existing path if reloading
  if (this.map.getLayer('track-line')) {
    this.map.removeLayer('track-line');
  }
  if (this.map.getSource('track-source')) {
    this.map.removeSource('track-source');
  }

  this.map.addSource('track-source', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coordinates
      }
    }
  });

  this.map.addLayer({
    id: 'track-line',
    type: 'line',
    source: 'track-source',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': 'red',
      'line-width': 4,
      'line-dasharray': [1, 2] // 🔹 dotted/dashed effect
    }
  });
}


addMarker(coordinates: [number, number], stationName:string, icon:string) {
  const markerEl = this.getCustomMarkerElement(icon);
  markerEl.addEventListener('click', () => {
    this.focusMarker(coordinates);
   this.station.setSelectedStation(stationName); 
  });
  new  mapboxgl.Marker({ element: markerEl, anchor: 'bottom' })
    .setLngLat(coordinates) 
    .addTo(this.map); 
}

focusMarker(coordinates: [number, number]) {
  this.map.flyTo({
    center: coordinates,
    zoom: 12,          // adjust zoom level if needed
    speed: 1.2,        // animation speed
    curve: 1.4,   
    pitch:200, 
    bearing:20,    // smoothness
    offset: [0, 200],  // ⬇️ pushes map down
    essential: true
  });
}


getCustomMarkerElement(icon:string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'custom-marker';
  // Style it using CSS (e.g., set a background image)
  el.style.backgroundImage = `url(${icon})`;
  el.style.width = '50px';
  el.style.height = '50px';
  // el.style.marginLeft = '15px';
  el.style.backgroundSize = '100%';
  el.style.cursor = 'pointer';
  return el;
}

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}