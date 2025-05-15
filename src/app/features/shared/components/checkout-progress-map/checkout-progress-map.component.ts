import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CheckoutStep = 'cart' | 'checkout' | 'confirmation';

@Component({
  selector: 'app-checkout-progress-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './checkout-progress-map.component.html',
  styleUrls: ['./checkout-progress-map.component.css']
})
export class CheckoutProgressMapComponent {
  @Input() currentStep: CheckoutStep = 'cart';

  steps = [
    { id: 'cart', label: 'Shopping Cart' },
    { id: 'checkout', label: 'Shipping and Checkout' },
    { id: 'confirmation', label: 'Confirmation' },
  ];

  getStepStatus(stepId: string): 'upcoming' | 'active' | 'completed' {
    const stepOrder: Record<CheckoutStep, number> = { 
      cart: 0, 
      checkout: 1, 
      confirmation: 2 
    };
    
    const currentStepIndex = stepOrder[this.currentStep];
    const targetStepIndex = stepOrder[stepId as CheckoutStep];

    if (targetStepIndex < currentStepIndex) return 'completed';
    if (targetStepIndex === currentStepIndex) return 'active';
    return 'upcoming';
  }
} 