import { DatePipe, DecimalPipe } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  signal
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

import {
  AdminTrackingService,
  LiveMapTechnician,
  TechnicianLocationUpdatedPayload,
  TechnicianStatus
} from '../../core/services/admin-tracking.service';
import { RealtimeService } from '../../core/services/realtime.service';

type TagSeverity = 'success' | 'info' | 'warn';
type LeafletLike = {
  map: (element: HTMLElement, options?: Record<string, unknown>) => any;
  tileLayer: (urlTemplate: string, options?: Record<string, unknown>) => any;
  marker: (latLng: [number, number], options?: Record<string, unknown>) => any;
  divIcon: (options?: Record<string, unknown>) => any;
  latLngBounds: (latLngs: [number, number][]) => any;
};

declare global {
  interface Window {
    L?: LeafletLike;
  }
}

const DEFAULT_CENTER = { lat: 10.5276, lng: 76.2144 };
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const LEAFLET_SCRIPT_URLS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'
] as const;
const LEAFLET_STYLE_URLS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'
] as const;

@Component({
  selector: 'app-live-map-page',
  imports: [ButtonModule, DatePipe, DecimalPipe, TagModule],
  templateUrl: './live-map-page.component.html',
  styleUrl: './live-map-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LiveMapPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private static leafletAssetsPromise: Promise<LeafletLike> | null = null;

  @ViewChild('mapContainer')
  set mapContainer(element: ElementRef<HTMLElement> | undefined) {
    this.mapElement = element;

    if (element) {
      queueMicrotask(() => this.initializeMapIfReady());
    }
  }

  protected readonly leafletReady = signal(false);
  protected readonly mapReady = signal(false);
  protected readonly loading = signal(true);
  protected readonly refreshing = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly mapErrorMessage = signal<string | null>(null);
  protected readonly technicians = signal<LiveMapTechnician[]>([]);
  protected readonly selectedTechnicianId = signal<string | null>(null);

  protected readonly selectedTechnician = computed(() => {
    const selectedId = this.selectedTechnicianId();
    const technicians = this.technicians();

    if (!selectedId) {
      return technicians[0] ?? null;
    }

    return technicians.find((technician) => technician.id === selectedId) ?? technicians[0] ?? null;
  });

  protected readonly mappableTechnicians = computed(() =>
    this.technicians().filter(
      (technician) => this.latitudeOf(technician) !== null && this.longitudeOf(technician) !== null
    )
  );

  private mapElement?: ElementRef<HTMLElement>;
  private mapInstance: any | null = null;
  private leafletPollId: number | null = null;
  private removeSocketListener: (() => void) | null = null;
  private readonly markerInstances = new Map<string, any>();
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    private readonly adminTrackingService: AdminTrackingService,
    protected readonly realtimeService: RealtimeService
  ) {}

  ngOnInit(): void {
    this.watchLeaflet();
    this.loadLiveMap(false);
    this.removeSocketListener = this.realtimeService.on<TechnicianLocationUpdatedPayload>(
      'technician_location_updated',
      (payload) => this.applyLiveUpdate(payload)
    );
  }

  ngAfterViewInit(): void {
    this.initializeMapIfReady();
  }

  ngOnDestroy(): void {
    if (this.leafletPollId !== null) {
      window.clearInterval(this.leafletPollId);
    }

    this.removeSocketListener?.();
    this.resizeObserver?.disconnect();
    this.clearMarkers();
    this.mapInstance?.remove?.();
    this.mapInstance = null;
  }

  protected refresh(): void {
    this.loadLiveMap(true);
  }

  protected selectTechnician(technicianId: string): void {
    this.selectedTechnicianId.set(technicianId);

    const technician = this.technicians().find((item) => item.id === technicianId);
    const position = technician ? this.positionOf(technician) : null;

    if (!position || !this.mapInstance) {
      return;
    }

    this.mapInstance.setView(position, 13, {
      animate: true
    });
  }

  protected statusLabel(status: TechnicianStatus): string {
    switch (status) {
      case 'AVAILABLE':
        return 'Available';
      case 'ON_JOB':
        return 'On Job';
      default:
        return 'Offline';
    }
  }

  protected statusSeverity(status: TechnicianStatus): TagSeverity {
    switch (status) {
      case 'AVAILABLE':
        return 'success';
      case 'ON_JOB':
        return 'info';
      default:
        return 'warn';
    }
  }

  protected jobLabel(technician: LiveMapTechnician): string {
    if (technician.activeJob) {
      return `${technician.activeJob.jobNumber} - ${technician.activeJob.title}`;
    }

    if (technician.latestLocation?.job) {
      return `${technician.latestLocation.job.jobNumber} - ${technician.latestLocation.job.title}`;
    }

    return 'No active job';
  }

  protected latitudeOf(technician: LiveMapTechnician): number | null {
    return technician.currentLatitude ?? technician.latestLocation?.latitude ?? null;
  }

  protected longitudeOf(technician: LiveMapTechnician): number | null {
    return technician.currentLongitude ?? technician.latestLocation?.longitude ?? null;
  }

  protected lastSeenOf(technician: LiveMapTechnician): string | null {
    return technician.lastSeenAt ?? technician.latestLocation?.recordedAt ?? null;
  }

  private loadLiveMap(isRefresh: boolean): void {
    if (isRefresh) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }

    this.errorMessage.set(null);

    this.adminTrackingService.getLiveMap().subscribe({
      next: (technicians) => {
        this.technicians.set(technicians);
        this.syncSelectedTechnician();
        this.loading.set(false);
        this.refreshing.set(false);
        this.renderMarkers();
        this.fitMapToMarkers();
      },
      error: () => {
        this.errorMessage.set(
          'Unable to load live map data. Make sure the API is running and an admin access token is available.'
        );
        this.loading.set(false);
        this.refreshing.set(false);
      }
    });
  }

  private applyLiveUpdate(payload: TechnicianLocationUpdatedPayload): void {
    this.technicians.update((technicians) => {
      const technicianIndex = technicians.findIndex(
        (technician) => technician.id === payload.technician.id
      );

      const previous = technicianIndex >= 0 ? technicians[technicianIndex] : null;
      const nextActiveJob = payload.location.job
        ? {
            id: payload.location.job.id,
            jobNumber: payload.location.job.jobNumber,
            title: payload.location.job.title,
            status: payload.location.job.status,
            scheduledDate:
              previous?.activeJob?.id === payload.location.job.id
                ? previous.activeJob.scheduledDate
                : null,
            customer:
              previous?.activeJob?.id === payload.location.job.id
                ? previous.activeJob.customer
                : null
          }
        : payload.technician.status === 'ON_JOB'
          ? previous?.activeJob ?? null
          : null;

      const nextTechnician: LiveMapTechnician = {
        id: payload.technician.id,
        phone: payload.technician.phone,
        status: payload.technician.status,
        currentLatitude: payload.technician.currentLatitude,
        currentLongitude: payload.technician.currentLongitude,
        lastSeenAt: payload.technician.lastSeenAt,
        user: payload.technician.user,
        latestLocation: payload.location,
        activeJob: nextActiveJob
      };

      if (technicianIndex === -1) {
        return [nextTechnician, ...technicians];
      }

      return technicians.map((technician, index) =>
        index === technicianIndex ? nextTechnician : technician
      );
    });

    this.syncSelectedTechnician();
    this.renderMarkers();

    if (this.selectedTechnicianId() === payload.technician.id) {
      const updated = this.technicians().find((technician) => technician.id === payload.technician.id);
      const position = updated ? this.positionOf(updated) : null;

      if (position && this.mapInstance) {
        this.mapInstance.panTo(position);
      }
    }
  }

  private syncSelectedTechnician(): void {
    const selectedId = this.selectedTechnicianId();
    const technicians = this.technicians();

    if (!technicians.length) {
      this.selectedTechnicianId.set(null);
      return;
    }

    if (selectedId && technicians.some((technician) => technician.id === selectedId)) {
      return;
    }

    const firstWithLocation = technicians.find((technician) => this.positionOf(technician));
    this.selectedTechnicianId.set((firstWithLocation ?? technicians[0]).id);
  }

  private positionOf(technician: LiveMapTechnician): [number, number] | null {
    const latitude = this.latitudeOf(technician);
    const longitude = this.longitudeOf(technician);

    if (latitude === null || longitude === null) {
      return null;
    }

    return [latitude, longitude];
  }

  private initializeMapIfReady(): void {
    const leaflet = this.leaflet();
    if (!leaflet || !this.mapElement?.nativeElement || this.mapInstance) {
      return;
    }

    try {
      this.mapErrorMessage.set(null);

      this.mapInstance = leaflet.map(this.mapElement.nativeElement, {
        zoomControl: true,
        attributionControl: true
      });

      leaflet
        .tileLayer(TILE_URL, {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        })
        .addTo(this.mapInstance);

      this.mapInstance.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 11);
      this.renderMarkers();
      this.fitMapToMarkers();
      this.mapReady.set(true);
      this.observeMapSize();
      this.invalidateMapSize();
    } catch (error) {
      this.mapInstance = null;
      this.mapReady.set(false);
      this.mapErrorMessage.set(
        error instanceof Error
          ? `Unable to initialize the live map: ${error.message}`
          : 'Unable to initialize the live map.'
      );
    }
  }

  private renderMarkers(): void {
    const leaflet = this.leaflet();
    if (!leaflet || !this.mapInstance) {
      return;
    }

    this.clearMarkers();

    this.mappableTechnicians().forEach((technician) => {
      const position = this.positionOf(technician);
      if (!position) {
        return;
      }

      const marker = leaflet.marker(position, {
        icon: this.markerIconFor(technician.status)
      });

      marker.on('click', () => this.selectTechnician(technician.id));
      marker.bindTooltip(technician.user.name, {
        direction: 'top',
        offset: [0, -18]
      });
      marker.addTo(this.mapInstance);

      this.markerInstances.set(technician.id, marker);
    });
  }

  private fitMapToMarkers(): void {
    const leaflet = this.leaflet();
    if (!leaflet || !this.mapInstance) {
      return;
    }

    const technicians = this.mappableTechnicians();
    if (!technicians.length) {
      this.mapInstance.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 11);
      return;
    }

    if (technicians.length === 1) {
      const position = this.positionOf(technicians[0]);
      if (position) {
        this.mapInstance.setView(position, 13);
      }
      return;
    }

    const bounds = leaflet.latLngBounds(
      technicians
        .map((technician) => this.positionOf(technician))
        .filter((position): position is [number, number] => position !== null)
    );

    this.mapInstance.fitBounds(bounds, {
      padding: [72, 72]
    });
  }

  private watchLeaflet(): void {
    const check = () => {
      const leaflet = this.leaflet();
      if (!leaflet) {
        return;
      }

      this.leafletReady.set(true);
      this.mapErrorMessage.set(null);

      if (this.leafletPollId !== null) {
        window.clearInterval(this.leafletPollId);
        this.leafletPollId = null;
      }

      this.initializeMapIfReady();
    };

    check();

    if (this.leafletReady()) {
      return;
    }

    this.loadLeafletAssets();
    this.leafletPollId = window.setInterval(check, 300);
  }

  private loadLeafletAssets(): void {
    LiveMapPageComponent.leafletAssetsPromise ??= this.ensureLeafletAssets();

    LiveMapPageComponent.leafletAssetsPromise
      .then(() => {
        this.leafletReady.set(true);
        this.mapErrorMessage.set(null);
        this.initializeMapIfReady();
      })
      .catch(() => {
        this.mapReady.set(false);
        this.mapErrorMessage.set(
          'Leaflet map assets could not be loaded. Check the server internet connection or CDN access.'
        );
      });
  }

  private async ensureLeafletAssets(): Promise<LeafletLike> {
    const existingLeaflet = this.leaflet();
    if (existingLeaflet) {
      return existingLeaflet;
    }

    await this.ensureStylesheet(LEAFLET_STYLE_URLS);
    await this.ensureScript(LEAFLET_SCRIPT_URLS);

    const leaflet = this.leaflet();
    if (!leaflet) {
      throw new Error('Leaflet did not expose a usable global object.');
    }

    return leaflet;
  }

  private ensureStylesheet(urls: readonly string[]): Promise<void> {
    const existing = document.getElementById('ftt-leaflet-css') as HTMLLinkElement | null;
    if (existing?.sheet) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const link =
        existing ??
        Object.assign(document.createElement('link'), {
          id: 'ftt-leaflet-css',
          rel: 'stylesheet'
        });

      const tryIndex = (index: number) => {
        if (index >= urls.length) {
          reject(new Error('Leaflet stylesheet failed to load.'));
          return;
        }

        link.onload = () => resolve();
        link.onerror = () => tryIndex(index + 1);
        link.href = urls[index];

        if (!existing) {
          document.head.appendChild(link);
        }
      };

      tryIndex(0);
    });
  }

  private ensureScript(urls: readonly string[]): Promise<void> {
    if (this.leaflet()) {
      return Promise.resolve();
    }

    const existing = document.getElementById('ftt-leaflet-script') as HTMLScriptElement | null;
    if (existing?.dataset['loaded'] === 'true') {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script =
        existing ??
        Object.assign(document.createElement('script'), {
          id: 'ftt-leaflet-script',
          defer: true
        });

      const tryIndex = (index: number) => {
        if (index >= urls.length) {
          reject(new Error('Leaflet script failed to load.'));
          return;
        }

        script.onload = () => {
          script.dataset['loaded'] = 'true';
          resolve();
        };
        script.onerror = () => tryIndex(index + 1);
        script.src = urls[index];

        if (!existing) {
          document.head.appendChild(script);
        }
      };

      tryIndex(0);
    });
  }

  private markerIconFor(status: TechnicianStatus): any {
    const leaflet = this.leaflet();
    if (!leaflet) {
      return undefined;
    }

    const fill =
      status === 'AVAILABLE' ? '#22c55e' : status === 'ON_JOB' ? '#2563eb' : '#94a3b8';

    return leaflet.divIcon({
      className: 'ftt-live-marker',
      html: `
        <span
          style="
            display:flex;
            width:24px;
            height:24px;
            border-radius:999px;
            background:${fill};
            border:3px solid #ffffff;
            box-shadow:0 0 0 8px ${this.colorWithAlpha(fill, 0.18)}, 0 12px 24px rgba(15, 23, 42, 0.18);
          ">
        </span>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  }

  private colorWithAlpha(hexColor: string, alpha: number): string {
    const normalizedHex = hexColor.replace('#', '');
    const red = Number.parseInt(normalizedHex.substring(0, 2), 16);
    const green = Number.parseInt(normalizedHex.substring(2, 4), 16);
    const blue = Number.parseInt(normalizedHex.substring(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  private clearMarkers(): void {
    this.markerInstances.forEach((marker) => marker.remove?.());
    this.markerInstances.clear();
  }

  private observeMapSize(): void {
    if (!this.mapElement?.nativeElement || this.resizeObserver) {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.mapInstance?.invalidateSize?.();
    });
    this.resizeObserver.observe(this.mapElement.nativeElement);
  }

  private invalidateMapSize(): void {
    queueMicrotask(() => this.mapInstance?.invalidateSize?.());
    window.setTimeout(() => this.mapInstance?.invalidateSize?.(), 150);
    window.setTimeout(() => this.mapInstance?.invalidateSize?.(), 500);
  }

  private leaflet(): LeafletLike | null {
    const candidate = window.L;
    if (
      candidate &&
      typeof candidate.map === 'function' &&
      typeof candidate.tileLayer === 'function' &&
      typeof candidate.marker === 'function' &&
      typeof candidate.divIcon === 'function' &&
      typeof candidate.latLngBounds === 'function'
    ) {
      return candidate;
    }

    return null;
  }
}
