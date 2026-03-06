import { Component, ElementRef, Input, OnDestroy, OnInit, OnChanges, SimpleChanges, ViewChild, inject } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import mapboxgl, { Marker } from 'mapbox-gl';
import { Homeservice } from '../home/homeService/homeservice';

@Component({
  selector: 'app-map', 
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.html',
  styleUrls: ['./map.css']
})
export class MapComponent implements OnInit, OnDestroy, OnChanges {
  @Input() selectedStation!: string;
  @Input() routeCoordinates!: [number, number][];
  @Input() actualPath: [number, number][] = [];
  @Input() scheduleStartDate: string = '';
  @Input() currentDatetime: string = '';

  constructor( private station:Homeservice){}

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  map: any;
  private platformId = inject(PLATFORM_ID);
  private currentMarkers: mapboxgl.Marker[] = [];

  // Animation State
  isAnimating = false;
  animationProgress = 0;
  private animationMarker: mapboxgl.Marker | null = null;
  private animationFrameId: any;
  private totalDuration = 20000; // Increased to 20s for smoother movement
  private staticShipMarker: mapboxgl.Marker | null = null;

  async ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    const mapboxgl = (await import('mapbox-gl')).default;

    this.map = new mapboxgl.Map({
      accessToken: 'pk.eyJ1IjoiZ2FuYTg2MDIiLCJhIjoiY2xzdmJtOHoyMW4yODJsczA1MHVjdWY3ZSJ9.vdG-cAO4j-E7_-wnQNPW7w',
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [80.263522, 12.749564],
      zoom: 3,
      pitch: 45,
    });

    this.map.on('load', () => {
      this.drawDynamicRoute();
    });

    this.map.on('click', () => {
      this.station.setSelectedStation(null);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['routeCoordinates'] || changes['actualPath']) && this.map && this.map.isStyleLoaded()) {
      this.drawDynamicRoute();
    }
  }

  drawDynamicRoute() {
    if (!this.map) return;

    this.currentMarkers.forEach(marker => marker.remove());
    this.currentMarkers = [];

    if (this.map.getLayer('track-line')) this.map.removeLayer('track-line');
    if (this.map.getSource('track-source')) this.map.removeSource('track-source');
    if (this.map.getLayer('actual-line')) this.map.removeLayer('actual-line');
    if (this.map.getSource('actual-source')) this.map.removeSource('actual-source');

    const hasRoute = this.routeCoordinates && this.routeCoordinates.length > 0;
    let hasActual = this.actualPath && this.actualPath.length > 0;

    // Ensure actualPath is chronological (if newest is at index 0, reverse it)
    // We check if the last point's datetime (if available) or simply assume DESC and reverse
    // The most robust way is to check the data source, but here we can force chronological

    let shipLocation: [number, number] | null = null;
    if (hasActual) {
      shipLocation = this.actualPath[this.actualPath.length - 1];
    } else if (hasRoute) {
      shipLocation = this.routeCoordinates[0];
    }

    if (shipLocation) {
      this.staticShipMarker = this.addMarker(shipLocation, 'Current Location', 'assets/ship.png');

      const popupHtml = `
          <div style="padding: 10px; font-family: 'Inter', sans-serif; text-align: left; min-width: 180px; border-radius: 12px; background: rgba(15, 23, 42, 0.95); color: white;">
            <div style="display: flex; flex-direction: column; gap: 8px;">
               <div>
                  <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Schedule Start</div>
                  <div style="font-size: 11px; font-weight: 600; color: #38bdf8;">${this.scheduleStartDate || 'N/A'}</div>
               </div>
               <div>
                  <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Current Time</div>
                  <div style="font-size: 11px; font-weight: 600; color: #38bdf8;">${this.currentDatetime || 'N/A'}</div>
               </div>
               <div style="padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.1);">
                  <div style="font-size: 12px; font-family: monospace; font-weight: 700; color: white;">
                    ${shipLocation[1].toFixed(4)}°N, ${shipLocation[0].toFixed(4)}°E
                  </div>
               </div>
            </div>
          </div>
       `;
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        className: 'modern-map-popup'
      }).setHTML(popupHtml);

      this.staticShipMarker.setPopup(popup);
      this.currentMarkers.push(this.staticShipMarker);

      const bounds = new mapboxgl.LngLatBounds();
      if (hasRoute) this.routeCoordinates.forEach(c => bounds.extend(c));
      if (hasActual) this.actualPath.forEach(c => bounds.extend(c));

      if (!bounds.isEmpty()) {
        setTimeout(() => {
          this.map.fitBounds(bounds, { padding: 100, maxZoom: 14, duration: 1000 });
        }, 300);
      }

      // Orientation: Point towards the 'End Marker' (destination)
      if (hasRoute && this.routeCoordinates.length > 0) {
        const destination = this.routeCoordinates[this.routeCoordinates.length - 1];
        const bearing = this.calculateBearing(shipLocation, destination);
        this.staticShipMarker.setRotation(bearing);
      } else if (hasActual && this.actualPath.length >= 2) {
        // Fallback to tracking bearing if no planned route is available
        const p1 = this.actualPath[this.actualPath.length - 2];
        const p2 = this.actualPath[this.actualPath.length - 1];
        const bearing = this.calculateBearing(p1, p2);
        this.staticShipMarker.setRotation(bearing);
      }
    }

    if (hasRoute) {
      this.routeCoordinates.forEach((coord, index) => {
        if (index === 0) return;
        const marker = this.addMarker(coord, `Station ${index + 1}`, 'assets/loc.png');
        if (marker) this.currentMarkers.push(marker);
      });
      this.addTrackPath(this.routeCoordinates, 'track-source', 'track-line', 'red', true);
    }

    if (hasActual && this.actualPath.length > 1) {
      this.addTrackPath(this.actualPath, 'actual-source', 'actual-line', '#10b981', false);
    }
  }

  toggleAnimation() {
    if (this.isAnimating) this.stopAnimation();
    else this.startAnimation();
  }

  async startAnimation() {
    if (!this.actualPath || this.actualPath.length < 2) return;

    this.isAnimating = true;
    if (this.staticShipMarker) this.staticShipMarker.getElement().style.opacity = '0';

    const path = this.actualPath;
    let startTime: number | null = null;

    // Sequence: First zoom in, then move
    this.map.flyTo({
      center: path[0],
      zoom: 14,
      pitch: 45,
      duration: 1500,
      essential: true
    });

    this.map.once('moveend', () => {
      if (!this.isAnimating) return;

      const animate = (timestamp: number) => {
        if (!this.isAnimating) return;
        if (!startTime) startTime = timestamp;

        const elapsed = timestamp - startTime;
        const t = Math.min(elapsed / this.totalDuration, 1);

        this.animationProgress = Math.round(t * 100);
        const pos = this.getPathPos(path, t);

        this.updateAnimationMarker(pos.coords, pos.bearing);

        // Lock camera to ship position
        this.map.jumpTo({ center: pos.coords });

        if (t < 1) {
          this.animationFrameId = requestAnimationFrame(animate);
        } else {
          this.stopAnimation();
        }
      };
      this.animationFrameId = requestAnimationFrame(animate);
    });
  }

  getPathPos(path: [number, number][], t: number): { coords: [number, number], bearing: number } {
    const totalSegments = path.length - 1;
    const globalT = t * totalSegments;
    const index = Math.min(Math.floor(globalT), totalSegments - 1);
    const localT = globalT - index;

    const p1 = path[index];
    const p2 = path[index + 1];

    const coords: [number, number] = [
      p1[0] + (p2[0] - p1[0]) * localT,
      p1[1] + (p2[1] - p1[1]) * localT
    ];
    return { coords, bearing: this.calculateBearing(p1, p2) };
  }

  stopAnimation() {
    this.isAnimating = false;
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    if (this.animationMarker) {
      this.animationMarker.remove();
      this.animationMarker = null;
    }
    if (this.staticShipMarker) this.staticShipMarker.getElement().style.opacity = '1';
    this.animationProgress = 0;
    this.drawDynamicRoute(); // Reset to full route view
  }

  calculateBearing(p1: [number, number], p2: [number, number]): number {
    const lat1 = p1[1] * Math.PI / 180;
    const lat2 = p2[1] * Math.PI / 180;
    const lon1 = p1[0] * Math.PI / 180;
    const lon2 = p2[0] * Math.PI / 180;
    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  updateAnimationMarker(coords: [number, number], bearing: number) {
    if (!this.animationMarker) {
      const el = this.create3DShipElement();
      this.animationMarker = new mapboxgl.Marker({ element: el, anchor: 'center', rotationAlignment: 'map' })
        .setLngLat(coords)
        .addTo(this.map);
    }
    this.animationMarker.setLngLat(coords);
    this.animationMarker.setRotation(bearing);
  }

  addTrackPath(coordinates: [number, number][], sourceId: string, layerId: string, color: string, isDashed: boolean) {
    if (!this.map) return;
    if (this.map.getLayer(layerId)) this.map.removeLayer(layerId);
    if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);

    this.map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coordinates }
      }
    });

    this.map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': color,
        'line-width': 4,
        ...(isDashed ? { 'line-dasharray': [1, 2] } : {})
      }
    });
  }

  addMarker(coordinates: [number, number], stationName: string, icon: string) {
    const el = icon.includes('ship') ? this.create3DShipElement() : this.getCustomMarkerElement(icon);
    el.addEventListener('click', () => {
      this.focusMarker(coordinates);
      this.station.setSelectedStation(stationName);
    });

    return new mapboxgl.Marker({
      element: el,
      anchor: icon.includes('ship') ? 'center' : 'bottom',
      rotationAlignment: icon.includes('ship') ? 'map' : 'viewport'
    })
      .setLngLat(coordinates)
      .addTo(this.map);
  }

  create3DShipElement(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'ship-icon-container';
    el.style.width = '100px';
    el.style.height = '100px';

    const shipImg = document.createElement('div');
    shipImg.style.width = '100%';
    shipImg.style.height = '100%';
    shipImg.style.backgroundImage = "url('assets/ship.png')";
    shipImg.style.backgroundSize = 'contain';
    shipImg.style.backgroundRepeat = 'no-repeat';
    shipImg.style.backgroundPosition = 'center';

    // IMAGE ORIENTATION FIX:
    // If the ship points backward or upside down, change to 180deg.
    shipImg.style.transform = 'rotate(100deg)';

    el.appendChild(shipImg);
    return el;
  }

  focusMarker(coordinates: [number, number]) {
    this.map.flyTo({ center: coordinates, zoom: 14, pitch: 45, essential: true });
  }

  getCustomMarkerElement(icon: string): HTMLElement {
    const el = document.createElement('div');
    el.className = 'custom-marker';
    el.style.backgroundImage = `url(${icon})`;
    el.style.width = '50px';
    el.style.height = '50px';
    el.style.backgroundSize = '100% 100%';
    el.style.cursor = 'pointer';
    return el;
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }
}