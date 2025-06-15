import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MaintenanceService {
  private isMaintenanceMode = new BehaviorSubject<boolean>(true);
  private bypassKey = 'bypass_maintenance';

  constructor() {
    // Check if there's a bypass parameter in the URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has(this.bypassKey)) {
      // Store bypass in session storage
      sessionStorage.setItem(this.bypassKey, 'true');
    }
  }

  get isMaintenance$(): Observable<boolean> {
    return this.isMaintenanceMode.asObservable();
  }

  get isMaintenance(): boolean {
    // Check if bypass exists in session storage
    const bypass = sessionStorage.getItem(this.bypassKey) === 'true';
    return this.isMaintenanceMode.value && !bypass;
  }

  setMaintenanceMode(value: boolean): void {
    this.isMaintenanceMode.next(value);
  }
}