import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
export interface DeliveryEstimate {
  orderWithinHours: number;
  orderWithinMinutes: number;
  estimatedDelivery: string;
  cutoffTime: string;
}
@Injectable({
  providedIn: 'root',
})
export class DeliveryEstimationService {
  private selectedEmirate = new BehaviorSubject<string>('Dubai');
  private isHubProduct = new BehaviorSubject<boolean>(false);
  constructor() {}
  setSelectedEmirate(emirate: string): void {
    this.selectedEmirate.next(emirate);
  }
  getSelectedEmirate(): Observable<string> {
    return this.selectedEmirate.asObservable();
  }
  setIsHubProduct(isHub: boolean): void {
    this.isHubProduct.next(isHub);
  }
  getIsHubProduct(): Observable<boolean> {
    return this.isHubProduct.asObservable();
  }
  getDeliveryEstimate(): DeliveryEstimate {
    const now = new Date();
    const cutoffTime = new Date();
    cutoffTime.setHours(11, 0, 0, 0); // 11:00 AM cutoff
    // Calculate time remaining until cutoff
    let timeRemaining = cutoffTime.getTime() - now.getTime();
    // If cutoff has already passed today, set cutoff to tomorrow
    if (timeRemaining < 0) {
      cutoffTime.setDate(cutoffTime.getDate() + 1);
      timeRemaining = cutoffTime.getTime() - now.getTime();
    }
    // Convert to hours and minutes
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    // Get estimated delivery based on selected emirate and product type
    const emirate = this.selectedEmirate.getValue();
    const isHub = this.isHubProduct.getValue();
    let estimatedDelivery = '';
    if (isHub) {
      // HUB product rules
      if (emirate === 'Dubai') {
        estimatedDelivery = now < cutoffTime ? 'Tomorrow' : 'in 2 days';
      } else {
        estimatedDelivery = 'in 2 working days';
      }
    } else {
      // NON-HUB product rules
      if (emirate === 'Dubai') {
        estimatedDelivery = 'in 1-2 working days';
      } else {
        estimatedDelivery = 'in 2-3 working days';
      }
    }
    return {
      orderWithinHours: hoursRemaining,
      orderWithinMinutes: minutesRemaining,
      estimatedDelivery,
      cutoffTime: '11:00 AM'
    };
  }
  // List of available emirates
  getEmiratesList(): string[] {
    return [
      'Dubai',
      'Abu Dhabi',
      'Sharjah',
      'Ajman',
      'Umm Al Quwain',
      'Ras Al Khaimah',
      'Fujairah'
    ];
  }
} 
