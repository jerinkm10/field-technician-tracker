import { Injectable, signal } from '@angular/core';
import { Socket, io } from 'socket.io-client';

import { appSettings } from '../config/app.settings';

@Injectable({
  providedIn: 'root'
})
export class RealtimeService {
  private socket: Socket | null = null;

  readonly connected = signal(false);
  readonly lastEvent = signal('Waiting for live tracking events');
  readonly endpoint = `${appSettings.socketUrl}/tracking`;

  connect(): void {
    if (this.socket) {
      return;
    }

    this.socket = io(this.endpoint, {
      autoConnect: false,
      transports: ['websocket']
    });

    this.socket.on('connect', () => {
      this.connected.set(true);
      this.lastEvent.set('Socket connected to live tracking server');
    });

    this.socket.on('disconnect', () => {
      this.connected.set(false);
      this.lastEvent.set('Socket disconnected');
    });

    this.socket.on('connect_error', () => {
      this.connected.set(false);
      this.lastEvent.set('Unable to reach live tracking server');
    });

    this.socket.on('technician_location_updated', () => {
      this.lastEvent.set('Technician location update received');
    });

    this.socket.connect();
  }

  on<T>(eventName: string, listener: (payload: T) => void): () => void {
    this.connect();

    const wrappedListener = (payload: T) => {
      this.lastEvent.set(`${eventName} received at ${new Date().toLocaleTimeString()}`);
      listener(payload);
    };

    this.socket?.on(eventName, wrappedListener);

    return () => {
      this.socket?.off(eventName, wrappedListener);
    };
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }

    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;
    this.connected.set(false);
  }
}
