import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-order-confirmation-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="order-confirmation-skeleton">
      <!-- Header skeleton -->
      <div class="bg-gray-100 animate-pulse rounded-lg p-6 mb-6">
        <div class="h-8 bg-gray-200 rounded-md w-3/4 mb-4"></div>
        <div class="h-6 bg-gray-200 rounded-md w-1/2 mb-3"></div>
        <div class="h-6 bg-gray-200 rounded-md w-1/3"></div>
      </div>

      <!-- Payment info skeleton -->
      <div class="bg-gray-100 animate-pulse rounded-lg p-4 mb-6">
        <div class="h-6 bg-gray-200 rounded-md w-2/3"></div>
      </div>

      <!-- Order details skeleton -->
      <div class="bg-gray-100 animate-pulse rounded-lg p-6 mb-6">
        <div class="h-7 bg-gray-200 rounded-md w-1/4 mb-6"></div>

        <!-- Product row skeletons -->
        <div class="flex items-center mb-4">
          <div class="h-16 w-16 bg-gray-200 rounded-md mr-4"></div>
          <div class="flex-1">
            <div class="h-5 bg-gray-200 rounded-md w-3/4 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded-md w-1/2"></div>
          </div>
          <div class="h-5 bg-gray-200 rounded-md w-20"></div>
        </div>

        <div class="flex items-center mb-4">
          <div class="h-16 w-16 bg-gray-200 rounded-md mr-4"></div>
          <div class="flex-1">
            <div class="h-5 bg-gray-200 rounded-md w-3/4 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded-md w-1/2"></div>
          </div>
          <div class="h-5 bg-gray-200 rounded-md w-20"></div>
        </div>

        <!-- Order totals skeleton -->
        <div class="mt-6 border-t border-gray-200 pt-4">
          <div class="flex justify-between mb-2">
            <div class="h-5 bg-gray-200 rounded-md w-24"></div>
            <div class="h-5 bg-gray-200 rounded-md w-20"></div>
          </div>
          <div class="flex justify-between mb-2">
            <div class="h-5 bg-gray-200 rounded-md w-20"></div>
            <div class="h-5 bg-gray-200 rounded-md w-16"></div>
          </div>
          <div class="flex justify-between">
            <div class="h-6 bg-gray-200 rounded-md w-28"></div>
            <div class="h-6 bg-gray-200 rounded-md w-24"></div>
          </div>
        </div>
      </div>

      <!-- Address information skeleton -->
      <div class="bg-gray-100 animate-pulse rounded-lg p-6 mb-6">
        <div class="h-7 bg-gray-200 rounded-md w-1/4 mb-4"></div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Billing address -->
          <div>
            <div class="h-6 bg-gray-200 rounded-md w-1/3 mb-3"></div>
            <div class="h-4 bg-gray-200 rounded-md w-2/3 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded-md w-1/2 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded-md w-3/4 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded-md w-1/2"></div>
          </div>

          <!-- Shipping address -->
          <div>
            <div class="h-6 bg-gray-200 rounded-md w-1/3 mb-3"></div>
            <div class="h-4 bg-gray-200 rounded-md w-2/3 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded-md w-1/2 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded-md w-3/4 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded-md w-1/2"></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .order-confirmation-skeleton {
      width: 100%;
      max-width: 1000px;
      margin: 0 auto;
      padding: 0 1rem;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    .animate-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
  `]
})
export class OrderConfirmationSkeletonComponent {}
