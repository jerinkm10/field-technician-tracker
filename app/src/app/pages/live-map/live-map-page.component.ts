import { DatePipe, DecimalPipe } from '@angular/common';
import {
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

@Component({
  selector: 'app-live-map-page',
  imports: [ButtonModule, DatePipe, DecimalPipe, TagModule],
  templateUrl: './live-map-page.component.html',
  styleUrl: './live-map-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LiveMapPageComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer')
  set mapContainer(element: ElementRef<HTMLElement> | undefined) {
    this.mapElement = element;

    if (element) {
      queueMicrotask(() => this.initializeMapIfReady());
    }
  }

  protected readonly leafletReady = signal(false);
  protected readonly loading = signal(true);
  protected readonly refreshing = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
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

  ngOnDestroy(): void {
    if (this.leafletPollId !== null) {
      window.clearInterval(this.leafletPollId);
    }

    this.removeSocketListener?.();
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

    queueMicrotask(() => this.mapInstance?.invalidateSize?.());
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
      if (!this.leaflet()) {
        return;
      }

      this.leafletReady.set(true);

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

    this.leafletPollId = window.setInterval(check, 300);
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

  private leaflet(): LeafletLike | null {
    return window.L ?? null;
  }
}
