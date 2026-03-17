import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private readonly url: string = 'https://terra-axis-api.trideltechnologiesindia.com'; // Match backend port

  constructor() {
    this.socket = io(this.url);

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });
  }

  // Listen for wind data updates
  onWindDataUpdate(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('wind_data_update', (data) => {
        observer.next(data);
      });
    });
  }

  // Generic emitter if needed later
  emit(eventName: string, data: any) {
    this.socket.emit(eventName, data);
  }
}
