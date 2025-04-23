import { Component, Input } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { AppContainerComponent } from '../app-container/app-container.component';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule, AppContainerComponent],
  templateUrl: './skeleton-loader.component.html',
  styleUrls: ['./skeleton-loader.component.css'],
})
export class SkeletonLoaderComponent {
  @Input() showCheckoutSection: boolean = true; // Show second section for Cart
}
