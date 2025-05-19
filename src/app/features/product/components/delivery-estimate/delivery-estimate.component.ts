import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeliveryEstimationService, DeliveryEstimate } from '../../../../shared/services/delivery-estimation.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-delivery-estimate',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './delivery-estimate.component.html',
  styleUrls: ['./delivery-estimate.component.css']
})
export class DeliveryEstimateComponent implements OnInit, OnDestroy {
  @Input() set isHubProduct(value: boolean) {
    this.deliveryService.setIsHubProduct(value);
    this.updateEstimate();
  }

  deliveryService = inject(DeliveryEstimationService);
  
  selectedEmirate: string = 'Dubai';
  showEmirateSelector: boolean = false;
  emirates: string[] = [];
  estimate: DeliveryEstimate = {
    orderWithinHours: 0,
    orderWithinMinutes: 0,
    estimatedDelivery: '',
    cutoffTime: ''
  };
  
  private timerSubscription?: Subscription;

  ngOnInit(): void {
    this.emirates = this.deliveryService.getEmiratesList();
    this.deliveryService.getSelectedEmirate().subscribe(emirate => {
      this.selectedEmirate = emirate;
      this.updateEstimate();
    });
    
    // Update the countdown every minute
    this.timerSubscription = interval(60000).subscribe(() => {
      this.updateEstimate();
    });
    
    this.updateEstimate();
  }
  
  ngOnDestroy(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }
  
  updateEstimate(): void {
    this.estimate = this.deliveryService.getDeliveryEstimate();
  }
  
  toggleEmirateSelector(): void {
    this.showEmirateSelector = !this.showEmirateSelector;
  }
  
  selectEmirate(emirate: string): void {
    this.deliveryService.setSelectedEmirate(emirate);
    this.showEmirateSelector = false;
    this.updateEstimate();
  }
} 