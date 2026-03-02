import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  OnChanges,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlotlyModule } from 'angular-plotly.js';
import * as PlotlyJS from 'plotly.js-dist-min';
PlotlyModule.plotlyjs = PlotlyJS;
export interface PolarAxis {
  name: string;
  date?: string;
  speed: string;
  direction: string;
}

@Component({
  selector: 'app-polar-chart',
  standalone: true,
  imports: [PlotlyModule, CommonModule],
  template: '<div #chartContainer class="w-full h-full"></div>',
  styles: ['']
})
export class PolarChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() polarAxis: PolarAxis[] = [];
  @Input() id!: string;
  @Input() height: number=300;
  @Input() width: number=300;

  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;

  public graph: any;
  title!: string;
  V_WIND: number[] = [];
  DIR_WIND: number[] = [];

  private resizeObserver!: ResizeObserver;
  directionValue(degrees: number): string {
    degrees = degrees % 360;
    if (degrees < 0) degrees += 360;
    if (degrees >= 348.75 || degrees < 11.25) {
      return 'N'; // North
    } else if (degrees >= 11.25 && degrees < 33.75) {
      return 'NNE'; // North-Northeast
    } else if (degrees >= 33.75 && degrees < 56.25) {
      return 'NE'; // Northeast
    } else if (degrees >= 56.25 && degrees < 78.75) {
      return 'ENE'; // East-Northeast
    } else if (degrees >= 78.75 && degrees < 101.25) {
      return 'E'; // East
    } else if (degrees >= 101.25 && degrees < 123.75) {
      return 'ESE'; // East-Southeast
    } else if (degrees >= 123.75 && degrees < 146.25) {
      return 'SE'; // Southeast
    } else if (degrees >= 146.25 && degrees < 168.75) {
      return 'SSE'; // South-Southeast
    } else if (degrees >= 168.75 && degrees < 191.25) {
      return 'S'; // South
    } else if (degrees >= 191.25 && degrees < 213.75) {
      return 'SSW'; // South-Southwest
    } else if (degrees >= 213.75 && degrees < 236.25) {
      return 'SW'; // Southwest
    } else if (degrees >= 236.25 && degrees < 258.75) {
      return 'WSW'; // West-Southwest
    } else if (degrees >= 258.75 && degrees < 281.25) {
      return 'W'; // West
    } else if (degrees >= 281.25 && degrees < 303.75) {
      return 'WNW'; // West-Northwest
    } else if (degrees >= 303.75 && degrees < 326.25) {
      return 'NW'; // Northwest
    } else {
      return 'NNW'; // North-Northwest
    }
  }
  ngOnInit(): void {
    for (let index = 0; index < this.polarAxis.length; index++) {
      const speed = parseFloat(this.polarAxis[index].speed);
      this.V_WIND.push(speed);
      this.DIR_WIND.push(parseFloat(this.polarAxis[index].direction));
    }

    this.title = this.polarAxis[0].name.includes('wave')
      ? 'Wave'
      : this.polarAxis[0].name.includes('current')
      ? 'Current'
      : this.polarAxis[0].name.includes('wind')
      ? 'Wind'
      : 'Polar';

    this.setChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['polarAxis'] && this.polarAxis) {
      // Update data arrays
      this.V_WIND = [];
      this.DIR_WIND = [];
      for (let index = 0; index < this.polarAxis.length; index++) {
        const speed = parseFloat(this.polarAxis[index].speed);
        this.V_WIND.push(speed);
        this.DIR_WIND.push(parseFloat(this.polarAxis[index].direction));
      }

      this.title = this.polarAxis[0]?.name.includes('wave')
        ? 'Wave'
        : this.polarAxis[0]?.name.includes('current')
        ? 'Current'
        : this.polarAxis[0]?.name.includes('wind')
        ? 'Wind'
        : 'Polar';

      this.setChart();

      // Re-render the chart if container is available
      if (this.chartContainer?.nativeElement && this.graph) {
        PlotlyJS.react(this.chartContainer.nativeElement, this.graph.data, this.graph.layout, this.graph.config);
      }
    }
  }

  ngAfterViewInit() {
    // Render the chart
    if (this.chartContainer?.nativeElement && this.graph) {
      PlotlyJS.newPlot(this.chartContainer.nativeElement, this.graph.data, this.graph.layout, this.graph.config);
    }

    // observe container size changes
    this.resizeObserver = new ResizeObserver(() => {
      if (this.chartContainer?.nativeElement) {
        PlotlyJS.Plots.resize(this.chartContainer.nativeElement);
      }
    });
    this.resizeObserver.observe(this.chartContainer.nativeElement);
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  setChart() {
    // sector configuration (keep if you want different granularity)
    const sectorSize = 22.5; // 16 sectors (22.5° each)
    const nSectors = Math.round(360 / sectorSize);
    const sectorCenters = Array.from(
      { length: nSectors },
      (_, i) => i * sectorSize + sectorSize / 2
    );

    // dynamic speed bins (auto from data)
    const minSpeed = Math.min(...this.V_WIND);
    const maxSpeed = Math.max(...this.V_WIND);
    const numBins = 6; // tweak if you want more/less
    const step = (maxSpeed - minSpeed) / numBins || 1; // avoid zero step
    const speedBins = Array.from(
      { length: numBins + 1 },
      (_, i) => minSpeed + i * step
    );
    const binLabels = speedBins
      .slice(1)
      .map((v, i) => `${speedBins[i].toFixed(1)} - ${v.toFixed(1)} m/s`);

    // initialize counts: [binIndex][sectorIndex]
    const counts: number[][] = Array.from({ length: numBins }, () =>
      new Array(nSectors).fill(0)
    );

    // assign each observation to a speed bin and a sector and increment count
    for (let i = 0; i < this.V_WIND.length; i++) {
      const s = this.V_WIND[i];
      let d = this.DIR_WIND[i] % 360;
      if (d < 0) d += 360;
      const sectorIdx = Math.floor(d / sectorSize) % nSectors;

      // find speed bin index: first bin edge greater than speed
      let binIdx = speedBins.findIndex((edge) => s < edge);
      if (binIdx === -1)
        binIdx = numBins - 1; // put into last bin if >= last edge
      else binIdx = Math.max(0, binIdx - 1); // convert edge index to class index

      counts[binIdx][sectorIdx] += 1;
    }

    // Build traces: one trace per speed bin, r is count per sector (length = nSectors)
    // Keep your visual design: Plasma colorscale, opacity, width, colorbar preserved.
    // For coloring per-bin we set a constant numeric color (mean of bin) repeated for sectors so colorbar works.
    const traces = counts.map((sectorCounts, k) => {
      const binLow = speedBins[k];
      const binHigh = speedBins[k + 1];
      const binLabel = `${binLow.toFixed(1)} - ${binHigh.toFixed(1)} m/s`;
      const binColorValue = (binLow + binHigh) / 2; // numeric value used with colorscale

      return {
        type: 'barpolar',
        r: sectorCounts, // aggregated counts per sector — this fixes "one bar per data"
        theta: sectorCenters,
        name: binLabel,
        width: Array(nSectors).fill(sectorSize * 0.9),
        marker: {
          color: Array(nSectors).fill(binColorValue), // numeric to map to Plasma scale
          colorscale: 'Jet',
          opacity: 0.8,
          cmin: minSpeed,
          cmax: maxSpeed,
          colorbar:
            k === 0
              ? {
                  title: {
                    side: 'right',
                    font: { size: 12, family: 'Arial', color: '#333' },
                  },
                  x: 1,
                  thickness: 15,
                  len: 1,
                  tickfont: { size: 10, color: '#444' },
                }
              : undefined,
          line: { color: 'rgba(0,0,0,0.2)', width: 0.4 },
        },
        hovertemplate: `Speed Bin: ${binLabel}<br>Direction: %{theta}<br>Count: %{r}<extra></extra>`,
      };
    });

    // keep your layout exactly as before (margins, rotation, legend behaviour, etc.)
    this.graph = {
      data: traces,
      layout: {
        hovermode: 'closest',
        dragmode: false,
        autosize: true,
        
        width: this.width,
        height: this.height,
        margin: { t: 14, r: 14, b: 14, l: 14 },
        polar: {
          radialaxis: {
            visible: true,
            // radial range still based on max of counts (not speeds). if you prefer percentage,
            // convert counts to percent before building traces.
            range: [0, Math.max(...counts.flat()) * 1.2 || 1],
            tickfont: { size: 8, color: '#333', family: 'Arial' },
          },
          angularaxis: { rotation: 90, direction: 'clockwise' },
        },
        showlegend: false,
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'none',
      },
      config: {
        responsive: true,
        displayModeBar: false,
        scrollZoom: false,
        doubleClick: false,
        staticPlot: false,
      },
    };
  }
}