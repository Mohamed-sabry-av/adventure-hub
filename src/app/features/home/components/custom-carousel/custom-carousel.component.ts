import {
  Component,
  Input,
  OnInit,
  HostListener,
  ContentChild,
  TemplateRef,
  AfterContentInit
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-custom-carousel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="custom-carousel relative">
      <div class="carousel-container overflow-hidden">
        <div
          class="carousel-track flex transition-transform duration-500 ease-in-out"
          [style.transform]="'translateX(' + -currentPosition + 'px)'"
          [style.width]="totalWidth + 'px'"
        >
          <ng-container *ngFor="let item of items; let i = index">
            <div
              class="carousel-item"
              [style.min-width.px]="getItemWidth()"
              [style.padding.px]="itemGap / 2"
            >
              <ng-container
                *ngTemplateOutlet="itemTemplate; context: { $implicit: item, index: i }"
              ></ng-container>
            </div>
          </ng-container>
        </div>
      </div>

      <!-- Navigation arrows - hidden on mobile -->
      <button
        *ngIf="showControls && hasEnoughItems()"
        (click)="prev()"
        class="carousel-nav prev absolute top-1/2 -translate-y-1/2 left-0 z-10 bg-white bg-opacity-80 rounded-full p-2 shadow-md focus:outline-none"
        [class.opacity-50]="currentPosition <= 0"
        aria-label="Previous items"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <button
        *ngIf="showControls && hasEnoughItems()"
        (click)="next()"
        class="carousel-nav next absolute top-1/2 -translate-y-1/2 right-0 z-10 bg-white bg-opacity-80 rounded-full p-2 shadow-md focus:outline-none"
        [class.opacity-50]="currentPosition >= maxPosition"
        aria-label="Next items"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      <!-- Pagination dots - shown only on mobile -->
      <div *ngIf="showPagination && hasEnoughItems()" class="pagination-dots flex justify-center mt-4">
        <button
          *ngFor="let dot of getPaginationDots(); let i = index"
          (click)="goToPage(i)"
          class="pagination-dot w-2 h-2 rounded-full mx-1 transition-all"
          [class.bg-gray-800]="isActiveDot(i)"
          [class.bg-gray-300]="!isActiveDot(i)"
        ></button>
      </div>
    </div>
  `,
  styles: [`
    .custom-carousel {
      position: relative;
      padding: 0 40px;
    }

    .carousel-container {
      margin: 0 auto;
      width: 100%;
    }

    .carousel-item {
      box-sizing: border-box;
      flex-shrink: 0;
    }

    .carousel-nav {
      transition: all 0.2s ease-in-out;
    }

    .carousel-nav:hover {
      transform: translateY(-50%) scale(1.1);
      background-color: rgba(255, 255, 255, 0.95);
    }

    @media (max-width: 768px) {
      .custom-carousel {
        padding: 0;
      }

      .carousel-nav {
        display: none;
      }
    }
  `]
})
export class CustomCarouselComponent implements OnInit, AfterContentInit {
  @Input() items: any[] = [];
  @Input() numVisible: number = 4;
  @Input() numScroll: number = 1;
  @Input() autoplayInterval: number = 0;
  @Input() circular: boolean = false;
  @Input() showPagination: boolean = true;
  @Input() responsiveOptions: any[] = [];
  @Input() itemGap: number = 16; // Gap between items

  @ContentChild('item') itemTemplate!: TemplateRef<any>;

  currentPosition = 0;
  totalWidth = 0;
  screenWidth = window.innerWidth;
  showControls = true;
  maxPosition = 0;
  currentPage = 0;
  autoplayTimeout: any;

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.screenWidth = window.innerWidth;
    this.showControls = this.screenWidth > 768;
    this.updateCarouselParameters();
  }

  ngOnInit(): void {
    this.screenWidth = window.innerWidth;
    this.showControls = this.screenWidth > 768;
  }

  ngAfterContentInit(): void {
    setTimeout(() => {
      this.updateCarouselParameters();
      this.startAutoplay();
    }, 100);
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  updateCarouselParameters(): void {
    const itemWidth = this.getItemWidth();
    this.totalWidth = itemWidth * this.items.length;

    // Calculate max position
    const visibleWidth = this.getVisibleItems() * itemWidth;
    this.maxPosition = Math.max(0, this.totalWidth - visibleWidth);

    // Adjust current position if needed
    if (this.currentPosition > this.maxPosition) {
      this.currentPosition = this.maxPosition;
    }

    // Update current page
    if (this.getVisibleItems() > 0) {
      this.currentPage = Math.floor(this.currentPosition / (this.getItemWidth() * this.numScroll));
    }
  }

  getVisibleItems(): number {
    // Check responsive options first
    if (this.responsiveOptions && this.responsiveOptions.length) {
      for (let i = 0; i < this.responsiveOptions.length; i++) {
        const option = this.responsiveOptions[i];
        if (window.innerWidth <= parseInt(option.breakpoint, 10)) {
          return option.numVisible;
        }
      }
    }

    // Default visible items based on screen size if no matching responsive option
    if (this.screenWidth < 640) {
      return 2; // Mobile
    } else if (this.screenWidth < 768) {
      return 2.5; // Small tablet
    } else if (this.screenWidth < 992) {
      return 3; // Tablet
    } else {
      return this.numVisible; // Desktop (use input value)
    }
  }

  getItemWidth(): number {
    // Calculate based on container width and number of visible items
    const containerWidth = this.screenWidth - (this.showControls ? 80 : 0); // Account for padding
    const numVisible = this.getVisibleItems();
    return containerWidth / numVisible;
  }

  next(): void {
    const itemWidth = this.getItemWidth();
    const scrollAmount = itemWidth * this.numScroll;

    if (this.currentPosition < this.maxPosition) {
      this.currentPosition += scrollAmount;

      // Don't go beyond the end
      if (this.currentPosition > this.maxPosition) {
        this.currentPosition = this.circular ? 0 : this.maxPosition;
      }

      this.updateCurrentPage();
    } else if (this.circular) {
      this.currentPosition = 0;
      this.updateCurrentPage();
    }

    this.resetAutoplayTimer();
  }

  prev(): void {
    const itemWidth = this.getItemWidth();
    const scrollAmount = itemWidth * this.numScroll;

    if (this.currentPosition > 0) {
      this.currentPosition -= scrollAmount;

      // Don't go beyond the start
      if (this.currentPosition < 0) {
        this.currentPosition = this.circular ? this.maxPosition : 0;
      }

      this.updateCurrentPage();
    } else if (this.circular) {
      this.currentPosition = this.maxPosition;
      this.updateCurrentPage();
    }

    this.resetAutoplayTimer();
  }

  goToPage(pageIndex: number): void {
    const itemWidth = this.getItemWidth();
    const scrollAmount = itemWidth * this.numScroll;
    const totalPages = this.getTotalPages();

    if (pageIndex >= 0 && pageIndex < totalPages) {
      this.currentPosition = pageIndex * scrollAmount;

      // Make sure we don't exceed max position
      if (this.currentPosition > this.maxPosition) {
        this.currentPosition = this.maxPosition;
      }

      this.currentPage = pageIndex;
    }

    this.resetAutoplayTimer();
  }

  updateCurrentPage(): void {
    if (this.getItemWidth() * this.numScroll > 0) {
      this.currentPage = Math.floor(this.currentPosition / (this.getItemWidth() * this.numScroll));
    }
  }

  getTotalPages(): number {
    if (this.items.length === 0 || this.numScroll === 0) return 0;

    return Math.ceil((this.items.length - this.getVisibleItems()) / this.numScroll) + 1;
  }

  getPaginationDots(): number[] {
    const totalPages = this.getTotalPages();
    return Array(totalPages).fill(0).map((_, i) => i);
  }

  isActiveDot(index: number): boolean {
    return this.currentPage === index;
  }

  hasEnoughItems(): boolean {
    return this.items.length > this.getVisibleItems();
  }

  startAutoplay(): void {
    if (this.autoplayInterval && this.autoplayInterval > 0) {
      this.stopAutoplay(); // Clear any existing interval

      this.autoplayTimeout = setInterval(() => {
        if (this.currentPosition >= this.maxPosition && !this.circular) {
          this.currentPosition = 0;
        } else {
          this.next();
        }
      }, this.autoplayInterval);
    }
  }

  stopAutoplay(): void {
    if (this.autoplayTimeout) {
      clearInterval(this.autoplayTimeout);
      this.autoplayTimeout = null;
    }
  }

  resetAutoplayTimer(): void {
    if (this.autoplayInterval && this.autoplayInterval > 0) {
      this.stopAutoplay();
      this.startAutoplay();
    }
  }
}
