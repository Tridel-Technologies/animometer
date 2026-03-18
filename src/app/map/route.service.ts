import { Injectable } from '@angular/core';

type Coord = [number, number]; // [lng, lat]

// ─── Simplified land polygons ─────────────────────────────────────────────────

/** Indian mainland peninsula (clockwise from NW) */
const INDIA_POLYGON: Coord[] = [
  [68.0, 23.0], [69.5, 22.5], [71.0, 22.3], [72.5, 22.0],
  [72.8, 21.0], [72.9, 20.0], [72.8, 19.0], [72.6, 18.5],
  [72.8, 17.5], [73.0, 16.8], [73.2, 15.8], [73.5, 15.0],
  [73.8, 14.0], [74.2, 13.0], [74.5, 12.5], [75.0, 12.0],
  [75.5, 11.5], [75.8, 10.8], [76.0, 10.2], [76.2, 9.5],
  [76.4, 9.0], [76.6, 8.5], [76.6, 8.2], [77.0, 8.0],
  [77.6, 8.1], [78.5, 8.5], [79.2, 9.5], [79.8, 10.5],
  [80.0, 11.2], [80.1, 11.8], [80.2, 12.2], [80.3, 12.6],
  [80.4, 13.1], [80.4, 13.4], [80.8, 14.5], [81.2, 15.5],
  [81.8, 16.5], [82.5, 17.5], [83.5, 18.5], [84.5, 19.5],
  [86.0, 20.5], [88.0, 21.5], [89.5, 22.0], [86.5, 20.5],
  [82.0, 19.5], [78.0, 20.5], [74.0, 21.5], [72.5, 22.5],
  [68.0, 23.0],
];

/** Sri Lanka island - Aggressively expanded to ensure Colombo/Galle are shielded */
const SRI_LANKA_POLYGON: Coord[] = [
  // North
  [79.6, 10.0], [80.2, 10.0], [80.8, 9.8], [81.5, 9.2],
  // East
  [82.0, 8.7], [82.0, 8.0], [81.9, 7.3], [81.8, 6.7],
  // South (Expanded latitude down to 5.7 to strictly block Dondra Head & Galle cuts)
  [81.2, 6.0], [80.6, 5.7], [80.0, 5.7], [79.4, 5.8],
  // West
  [79.3, 6.5], [79.3, 7.5], [79.4, 8.5], [79.5, 9.3], [79.5, 10.0],
];

const PALK_STRAIT_POLYGON: Coord[] = [
  [79.5, 9.5], [80.5, 9.5], [80.5, 10.5], [79.5, 10.5], [79.5, 9.5],
];

const GULF_OF_MANNAR_POLYGON: Coord[] = [
  [77.5, 8.0], [79.5, 8.0], [79.5, 9.5], [77.5, 9.5], [77.5, 8.0],
];

const LAND_POLYGONS = [INDIA_POLYGON, SRI_LANKA_POLYGON, PALK_STRAIT_POLYGON, GULF_OF_MANNAR_POLYGON];

// ─── Predefined ocean bypass waypoints for south-of-India routing ─────────────

const SOUTH_INDIA_BYPASS_W2E: Coord[] = [
  [73.5, 9.0], [74.8, 8.0], [76.2, 7.0], [77.8, 6.2],
  [79.2, 5.4], [80.5, 5.3], [81.8, 5.4], [83.2, 6.0],
  [84.5, 7.8], [85.5, 9.5], [86.0, 11.0],
];

// ─── Graph types for shipping lane A* ────────────────────────────────────────

interface GraphNode {
  id: number; lng: number; lat: number;
  neighbors: { nodeId: number; dist: number }[];
}

@Injectable({ providedIn: 'root' })
export class RouteService {
  private nodes: Map<number, GraphNode> = new Map();
  private _keyMap = new Map<string, number>();
  private nodeCount = 0;
  private gridIndex: Map<string, number[]> = new Map();
  private ready = false;
  private loadPromise: Promise<void> | null = null;

  private readonly SAMPLE = 1;
  private readonly GRID = 2.0;
  private readonly SNAP = 6.0;

  // ─── Public API ─────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    if (this.ready) return;
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this.buildGraph();
    await this.loadPromise;
  }

  async getSeaRoute(from: Coord, to: Coord): Promise<Coord[]> {
    await this.init();
    const sNode = this.nearestNode(from);
    const eNode = this.nearestNode(to);

    if (sNode && eNode && sNode.id !== eNode.id) {
      const path = this.aStar(sNode, eNode);
      if (path && path.length >= 2) {
        const routed: Coord[] = [from, ...path.map(n => [n.lng, n.lat] as Coord), to];
        if (!this.pathCrossesLand(routed)) return routed;
      }
    }

    if (!this.segmentCrossesLand(from, to)) {
      return [from, to];
    }

    return this.buildBypassPath(from, to);
  }

  // ─── Land detection ──────────────────────────────────────────────────────────

  private pointInPolygon(lng: number, lat: number, poly: Coord[]): boolean {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (((yi > lat) !== (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  private isOnLand(lng: number, lat: number): boolean {
    return LAND_POLYGONS.some(poly => this.pointInPolygon(lng, lat, poly));
  }

  private segmentCrossesLand(a: Coord, b: Coord): boolean {
    const dist = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
    // Dynamic high resolution: 20 checks per degree, min 60 points checked
    const samples = Math.max(60, Math.ceil(dist * 20));

    for (let i = 1; i < samples; i++) {
      const t = i / samples;
      const lng = a[0] + (b[0] - a[0]) * t;
      const lat = a[1] + (b[1] - a[1]) * t;
      if (this.isOnLand(lng, lat)) return true;
    }
    return false;
  }

  private pathCrossesLand(path: Coord[]): boolean {
    for (let i = 0; i < path.length - 1; i++) {
      if (this.segmentCrossesLand(path[i], path[i + 1])) return true;
    }
    return false;
  }

  // ─── Bypass routing ───────────────────────────────────────────────────────────

  private buildBypassPath(from: Coord, to: Coord): Coord[] {
    const [fLng, fLat] = from;
    const [tLng, tLat] = to;

    // Subcontinent crossing (West Coast <-> East Coast)
    if ((fLng < 78.5 && tLng > 78.5) || (fLng > 78.5 && tLng < 78.5)) {
      const goingEast = tLng >= fLng;
      const ordered = goingEast
        ? SOUTH_INDIA_BYPASS_W2E
        : [...SOUTH_INDIA_BYPASS_W2E].reverse();

      const minL = Math.min(fLng, tLng) - 3;
      const maxL = Math.max(fLng, tLng) + 5;

      const waypoints = ordered.filter(p => p[0] >= minL && p[0] <= maxL);
      const pts = waypoints.length > 0 ? waypoints : ordered;
      return [from, ...pts, to];
    }

    // Offshore bypass for staying on the same coast
    const offshoreLng = fLng > 78.5 ? Math.max(fLng, tLng) + 1.5 : Math.min(fLng, tLng) - 1.5;
    return [from, [offshoreLng, (fLat + tLat) / 2], to];
  }

  // ─── Shipping lane graph ─────────────────────────────────────────────────────

  private async buildGraph(): Promise<void> {
    try {
      this.addCoastalLanes();

      const resp = await fetch('assets/Shipping_Lanes_v1.geojson');
      const geoJson = await resp.json();
      for (const feature of geoJson.features ?? []) {
        const g = feature.geometry;
        if (!g) continue;
        if (g.type === 'LineString') this.addSequence(g.coordinates as Coord[]);
        else if (g.type === 'MultiLineString')
          for (const line of g.coordinates as Coord[][]) this.addSequence(line);
      }
      this.ready = true;
    } catch (err) {
      console.error('[RouteService] Failed to build graph', err);
      this.ready = true;
    }
  }

  private addCoastalLanes(): void {
    const west: Coord[] = [
      [68.5, 23.0], [70.0, 21.0], [71.5, 18.5], [72.5, 16.5],
      [73.5, 14.5], [74.0, 12.5], [75.0, 10.5], [75.5, 9.0]
    ];

    const east: Coord[] = [
      [81.0, 10.0], [81.5, 11.0], [81.8, 12.5], [82.0, 14.5],
      [83.0, 17.5], [84.5, 19.5], [87.5, 21.5]
    ];

    const south: Coord[] = [
      [75.0, 8.5], [76.2, 7.2], [77.8, 6.2],
      [79.5, 5.3], [80.8, 5.2], [82.5, 5.4],
      [84.0, 6.8], [85.5, 9.0], [86.0, 11.0],
    ];

    this.addSequence(west);
    this.addSequence(east);
    this.addSequence(south);

    this.addSequence([[75.5, 9.0], [75.0, 8.5]]); // Connect West to South
    // FIX: A safer arc around Sri Lanka's East Coast so it doesn't clip the bulge
    this.addSequence([[81.0, 10.0], [83.0, 7.5], [82.5, 5.4]]); // Connect East bottom to South Loop
  }

  private addSequence(coords: Coord[]): void {
    if (coords.length < 2) return;
    const sampled: Coord[] = [];
    for (let i = 0; i < coords.length; i++) {
      if (i === 0 || i === coords.length - 1 || i % this.SAMPLE === 0) sampled.push(coords[i]);
    }
    const ids = sampled.map(c => this.getOrCreateNode(c[0], c[1]));
    for (let i = 0; i < ids.length - 1; i++) {
      const a = this.nodes.get(ids[i])!;
      const b = this.nodes.get(ids[i + 1])!;

      // CRITICAL FIX: Explicitly sever any GeoJSON edge that cuts across a land polygon
      // This stops A* from ever considering bad coordinates.
      if (this.segmentCrossesLand([a.lng, a.lat], [b.lng, b.lat])) {
        continue;
      }

      const d = this.haversine(a.lat, a.lng, b.lat, b.lng);
      if (!a.neighbors.some(n => n.nodeId === b.id)) a.neighbors.push({ nodeId: b.id, dist: d });
      if (!b.neighbors.some(n => n.nodeId === a.id)) b.neighbors.push({ nodeId: a.id, dist: d });
    }
  }

  private getOrCreateNode(lng: number, lat: number): number {
    const key = `${lng.toFixed(4)},${lat.toFixed(4)}`;
    if (this._keyMap.has(key)) return this._keyMap.get(key)!;
    const id = this.nodeCount++;
    const node: GraphNode = { id, lng, lat, neighbors: [] };
    this.nodes.set(id, node);
    this._keyMap.set(key, id);
    const cell = this.gridCell(lng, lat);
    if (!this.gridIndex.has(cell)) this.gridIndex.set(cell, []);
    this.gridIndex.get(cell)!.push(id);
    return id;
  }

  private gridCell(lng: number, lat: number): string {
    return `${Math.floor(lng / this.GRID)},${Math.floor(lat / this.GRID)}`;
  }

  private nearestNode(coord: Coord): GraphNode | null {
    const [lng, lat] = coord;
    let bestId = -1, bestDist = Infinity;
    const cells = Math.ceil(this.SNAP / this.GRID) + 1;
    const cc = Math.floor(lng / this.GRID), cr = Math.floor(lat / this.GRID);
    for (let dc = -cells; dc <= cells; dc++) {
      for (let dr = -cells; dr <= cells; dr++) {
        for (const id of this.gridIndex.get(`${cc + dc},${cr + dr}`) ?? []) {
          const n = this.nodes.get(id)!;
          const d = this.haversine(lat, lng, n.lat, n.lng);
          if (d < bestDist) { bestDist = d; bestId = id; }
        }
      }
    }
    return bestId >= 0 ? this.nodes.get(bestId)! : null;
  }

  // ─── A* ──────────────────────────────────────────────────────────────────────

  private aStar(start: GraphNode, end: GraphNode): GraphNode[] | null {
    const open = new MinHeap<{ id: number; f: number }>(x => x.f);
    const g = new Map<number, number>();
    const came = new Map<number, number>();
    const visited = new Set<number>();

    g.set(start.id, 0);
    open.push({ id: start.id, f: this.haversine(start.lat, start.lng, end.lat, end.lng) });

    while (!open.isEmpty()) {
      const cur = open.pop()!;
      if (cur.id === end.id) return this.reconstructPath(came, end.id);
      if (visited.has(cur.id)) continue;
      visited.add(cur.id);

      const cg = g.get(cur.id) ?? Infinity;
      for (const nb of this.nodes.get(cur.id)!.neighbors) {
        if (visited.has(nb.nodeId)) continue;
        const tg = cg + nb.dist;
        if (tg < (g.get(nb.nodeId) ?? Infinity)) {
          came.set(nb.nodeId, cur.id);
          g.set(nb.nodeId, tg);
          const nbNode = this.nodes.get(nb.nodeId)!;
          open.push({ id: nb.nodeId, f: tg + this.haversine(nbNode.lat, nbNode.lng, end.lat, end.lng) });
        }
      }
    }
    return null;
  }

  private reconstructPath(came: Map<number, number>, endId: number): GraphNode[] {
    const path: GraphNode[] = [];
    let cur: number | undefined = endId;
    while (cur !== undefined) { path.unshift(this.nodes.get(cur)!); cur = came.get(cur); }
    return path;
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371, d2r = Math.PI / 180;
    const dLat = (lat2 - lat1) * d2r, dLng = (lng2 - lng1) * d2r;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * d2r) * Math.cos(lat2 * d2r) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

// ─── Min-heap priority queue ──────────────────────────────────────────────────

class MinHeap<T> {
  private data: T[] = [];
  constructor(private key: (x: T) => number) { }
  push(item: T): void { this.data.push(item); this.up(this.data.length - 1); }
  pop(): T | undefined {
    if (!this.data.length) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length) { this.data[0] = last; this.down(0); }
    return top;
  }
  isEmpty(): boolean { return !this.data.length; }
  private up(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.key(this.data[p]) <= this.key(this.data[i])) break;
      [this.data[p], this.data[i]] = [this.data[i], this.data[p]]; i = p;
    }
  }
  private down(i: number): void {
    const n = this.data.length;
    while (true) {
      let s = i, l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.key(this.data[l]) < this.key(this.data[s])) s = l;
      if (r < n && this.key(this.data[r]) < this.key(this.data[s])) s = r;
      if (s === i) break;
      [this.data[s], this.data[i]] = [this.data[i], this.data[s]]; i = s;
    }
  }
}