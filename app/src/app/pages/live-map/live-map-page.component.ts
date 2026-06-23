import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild, computed, signal } from '@angular/core';
import { GoogleMap, MapMarker } from '@angular/google-maps';
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

const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 10.5276, lng: 76.2144 };

@Component({
  selector: 'app-live-map-page',
  imports: [ButtonModule, DatePipe, DecimalPipe, GoogleMap, MapMarker, TagModule],
  templateUrl: './live-map-page.component.html',
  styleUrl: './live-map-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LiveMapPageComponent implements OnInit, OnDestroy {
  @ViewChild(GoogleMap)
  set mapComponent(component: GoogleMap | undefined) {
    this.googleMapComponent = component;

    if (component) {
      queueMicrotask(() => this.fitMapToMarkers());
    }
  }

  protected readonly googleMapsReady = signal(false);
  protected readonly loading = signal(true);
  protected readonly refreshing = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly technicians = signal<LiveMapTechnician[]>([]);
  protected readonly selectedTechnicianId = signal<string | null>(null);
  protected readonly center = signal<google.maps.LatLngLiteral>(DEFAULT_CENTER);
  protected readonly zoom = signal(11);
  protected readonly mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    streetViewControl: false,
    fullscreenControl: false,
    mapTypeControl: false
  };

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
      (technician) =>
        this.latitudeOf(technician) !== null &&
        this.longitudeOf(technician) !== null
    )
  );

  private googleMapComponent?: GoogleMap;
  private googleMapsPollId: number | null = null;
  private removeSocketListener: (() => void) | null = null;

  constructor(
    private readonly adminTrackingService: AdminTrackingService,
    protected readonly realtimeService: RealtimeService
  ) {}

  ngOnInit(): void {
    this.watchGoogleMaps();
    this.loadLiveMap(false);
    this.removeSocketListener = this.realtimeService.on<TechnicianLocationUpdatedPayload>(
      'technician_location_updated',
      (payload) => this.applyLiveUpdate(payload)
    );
  }

  ngOnDestroy(): void {
    if (this.googleMapsPollId !== null) {
      window.clearInterval(this.googleMapsPollId);
    }

    this.removeSocketListener?.();
  }

  protected refresh(): void {
    this.loadLiveMap(true);
  }

  protected selectTechnician(technicianId: string): void {
    this.selectedTechnicianId.set(technicianId);

    const technician = this.technicians().find((item) => item.id === technicianId);
    if (!technician) {
      return;
    }

    const position = this.positionOf(technician);
    if (!position) {
      return;
    }

    this.center.set(position);
    this.zoom.set(13);
    this.googleMapComponent?.googleMap?.panTo(position);
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

  protected markerOptions(technician: LiveMapTechnician): google.maps.MarkerOptions {
    return {
      icon: this.markerIconFor(technician.status),
      clickable: true
    };
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

    if (this.selectedTechnicianId() === payload.technician.id) {
      const updated = this.technicians().find((technician) => technician.id === payload.technician.id);
      const position = updated ? this.positionOf(updated) : null;

      if (position) {
        this.center.set(position);
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

  private positionOf(technician: LiveMapTechnician): google.maps.LatLngLiteral | null {
    const latitude = this.latitudeOf(technician);
    const longitude = this.longitudeOf(technician);

    if (latitude === null || longitude === null) {
      return null;
    }

    return { lat: latitude, lng: longitude };
  }

  private fitMapToMarkers(): void {
    if (!this.googleMapsReady() || !this.googleMapComponent?.googleMap) {
      return;
    }

    const technicians = this.mappableTechnicians();
    if (!technicians.length) {
      this.center.set(DEFAULT_CENTER);
      this.zoom.set(11);
      return;
    }

    if (technicians.length === 1) {
      const position = this.positionOf(technicians[0]);
      if (position) {
        this.center.set(position);
        this.zoom.set(13);
      }
      return;
    }

    const googleMapsWindow = window as Window & { google?: typeof google };
    if (!googleMapsWindow.google?.maps) {
      return;
    }

    const bounds = new googleMapsWindow.google.maps.LatLngBounds();
    technicians.forEach((technician) => {
      const position = this.positionOf(technician);
      if (position) {
        bounds.extend(position);
      }
    });

    this.googleMapComponent.googleMap.fitBounds(bounds, 72);
  }

  private watchGoogleMaps(): void {
    const check = () => {
      const googleMapsWindow = window as Window & { google?: typeof google };
      const ready = Boolean(googleMapsWindow.google?.maps);

      if (!ready) {
        return;
      }

      this.googleMapsReady.set(true);

      if (this.googleMapsPollId !== null) {
        window.clearInterval(this.googleMapsPollId);
        this.googleMapsPollId = null;
      }

      queueMicrotask(() => this.fitMapToMarkers());
    };

    check();

    if (this.googleMapsReady()) {
      return;
    }

    this.googleMapsPollId = window.setInterval(check, 500);
  }

  private markerIconFor(status: TechnicianStatus): string {
    const fill =
      status === 'AVAILABLE'
        ? '#22c55e'
        : status === 'ON_JOB'
          ? '#2563eb'
          : '#94a3b8';

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42">
        <circle cx="21" cy="21" r="9" fill="${fill}" />
        <circle cx="21" cy="21" r="15" fill="${fill}" fill-opacity="0.18" />
        <circle cx="21" cy="21" r="20" fill="${fill}" fill-opacity="0.08" />
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }
}
