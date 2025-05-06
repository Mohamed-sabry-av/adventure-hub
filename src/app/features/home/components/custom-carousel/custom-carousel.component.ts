import {
  Component,
  Input,
  OnInit,
  HostListener,
  ContentChild,
  TemplateRef,
  AfterContentInit,
  OnChanges,
  SimpleChanges,
  AfterViewInit,
  ElementRef,
  Renderer2,
  NgZone,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-custom-carousel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="custom-carousel relative" #carouselContainer>
      <div
        class="carousel-container overflow-hidden"
        #carouselTrack
        (touchstart)="onTouchStart($event)"
        (touchmove)="onTouchMove($event)"
        (touchend)="onTouchEnd()"
      >
        <div
          class="carousel-track flex transition-transform duration-500 ease-in-out"
          [style.transform]="'translateX(' + -currentPosition + 'px)'"
          [style.width]="totalWidth + 'px'"
        >
          <ng-container *ngFor="let item of items; let i = index">
            <div
              class="carousel-item"
              [style.min-width.px]="getItemWidth()"
              [style.padding.px]="itemGap / 9"
            >
              <ng-container
                *ngTemplateOutlet="
                  itemTemplate;
                  context: { $implicit: item, index: i }
                "
              ></ng-container>
            </div>
          </ng-container>
        </div>
      </div>

      <!-- Navigation arrows -->
      <button
        *ngIf="shouldShowControls()"
        (click)="prev()"
        class="carousel-nav prev absolute top-1/2 -translate-y-1/2 left-0 z-10 bg-white bg-opacity-80 rounded-full p-2 shadow-md focus:outline-none"
        [class.opacity-50]="currentPosition <= 0 && !circular"
        aria-label="Previous items"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <button
        *ngIf="shouldShowControls()"
        (click)="next()"
        class="carousel-nav next absolute top-1/2 -translate-y-1/2 right-0 z-10 bg-white bg-opacity-80 rounded-full p-2 shadow-md focus:outline-none"
        [class.opacity-50]="currentPosition >= maxPosition && !circular"
        aria-label="Next items"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      <!-- Pagination dots -->
      <div
        *ngIf="showPagination && hasEnoughItems()"
        class="pagination-dots flex justify-center mt-4"
      >
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
  styles: [
    `
      .custom-carousel {
        position: relative;
        padding: 0 40px;
        user-select: none; /* Prevent text selection during swipe */
      }

      .carousel-container {
        margin: 0 auto;
        width: 100%;
        touch-action: pan-y; /* Allow vertical scrolling, block horizontal */
      }

      .carousel-item {
        box-sizing: border-box;
        flex-shrink: 0;
      }

      .carousel-nav {
        transition: all 0.2s ease-in-out;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 20;
      }

      .carousel-nav:hover {
        transform: translateY(-50%) scale(1.1);
        background-color: rgba(255, 255, 255, 0.95);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }

      .carousel-nav.prev {
        left: 5px;
      }

      .carousel-nav.next {
        right: 5px;
      }

      .pagination-dots {
        margin-top: 1rem;
      }

      .pagination-dot {
        transition: all 0.2s ease;
      }

      .pagination-dot:hover {
        transform: scale(1.2);
      }

      @media (max-width: 768px) {
        .custom-carousel {
          padding: 0;
        }

        .carousel-nav {
          width: 32px;
          height: 32px;
        }

        .carousel-nav.prev {
          left: 2px;
        }

        .carousel-nav.next {
          right: 2px;
        }
      }
    `,
  ],
})
export class CustomCarouselComponent
  implements OnInit, OnChanges, AfterContentInit, AfterViewInit
{
  @Input() items: any[] = [];
  @Input() numVisible: number = 4;
  @Input() numScroll: number = 1;
  @Input() autoplayInterval: number = 0;
  @Input() circular: boolean = false;
  @Input() showPagination: boolean = true;
  @Input() responsiveOptions: any[] = [];
  @Input() itemGap: number = 16;
  @Input() showControls: boolean = true;

  @ContentChild('item') itemTemplate!: TemplateRef<any>;

  currentPosition = 0;
  totalWidth = 0;
  screenWidth = 0;
  showControlsBasedOnWidth = true;
  maxPosition = 0;
  currentPage = 0;
  autoplayTimeout: any;
  containerWidth = 0;

  // Touch event properties
  private touchStartX = 0;
  private touchCurrentX = 0;
  private isDragging = false;
  private swipeThreshold = 50; // Minimum swipe distance to trigger next/prev

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    private zone: NgZone,
    private cd: ChangeDetectorRef
  ) {}

  @HostListener('window:resize')
  onResize() {
    this.zone.runOutsideAngular(() => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        this.zone.run(() => {
          this.screenWidth = window.innerWidth;
          this.showControlsBasedOnWidth = this.screenWidth > 768;
          this.updateCarouselParameters();
          this.cd.detectChanges();
        });
      }, 100);
    });
  }

  private resizeTimer: any;
  private initialized = false;

  ngOnInit(): void {
    this.screenWidth = window.innerWidth;
    this.showControlsBasedOnWidth = this.screenWidth > 768;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['items'] && !changes['items'].firstChange) ||
      (changes['numVisible'] && !changes['numVisible'].firstChange) ||
      (changes['responsiveOptions'] &&
        !changes['responsiveOptions'].firstChange)
    ) {
      setTimeout(() => {
        this.updateCarouselParameters();
      }, 50);
    }
  }

  ngAfterContentInit(): void {
    setTimeout(() => {
      this.updateCarouselParameters();
      this.startAutoplay();
      this.initialized = true;
    }, 100);
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.updateCarouselParameters();
      this.cd.detectChanges();
    }, 200);
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
    clearTimeout(this.resizeTimer);
  }

  updateCarouselParameters(): void {
    this.containerWidth =
      this.el.nativeElement.querySelector('.carousel-container')?.offsetWidth ||
      this.screenWidth - (this.showControlsBasedOnWidth ? 80 : 0);

    const itemWidth = this.getItemWidth();
    this.totalWidth = (itemWidth + this.itemGap) * this.items.length;

    const visibleWidth = this.getVisibleItems() * (itemWidth + this.itemGap);
    this.maxPosition = Math.max(0, this.totalWidth - visibleWidth);

    if (this.currentPosition > this.maxPosition) {
      this.currentPosition = this.circular ? 0 : this.maxPosition;
    }
    if (this.currentPosition < 0) {
      this.currentPosition = 0;
    }

    this.updateCurrentPage();
    this.cd.detectChanges();

    console.log(
      `Carousel: items=${
        this.items.length
      }, itemWidth=${itemWidth}, totalWidth=${this.totalWidth}, maxPosition=${
        this.maxPosition
      }, visibleItems=${this.getVisibleItems()}, containerWidth=${
        this.containerWidth
      }`
    );
  }

  getVisibleItems(): number {
    if (this.responsiveOptions && this.responsiveOptions.length) {
      for (let option of this.responsiveOptions) {
        if (window.innerWidth <= parseInt(option.breakpoint, 10)) {
          return option.numVisible;
        }
      }
    }

    if (this.screenWidth < 640) {
      return 2;
    } else if (this.screenWidth < 768) {
      return 2.5;
    } else if (this.screenWidth < 992) {
      return 3;
    } else {
      return this.numVisible;
    }
  }

  getItemWidth(): number {
    const containerWidth =
      this.containerWidth ||
      this.screenWidth - (this.showControlsBasedOnWidth ? 80 : 0);
    const numVisible = this.getVisibleItems();
    const width =
      (containerWidth - (numVisible - 1) * this.itemGap) / numVisible;
    return isNaN(width) || width <= 0 ? 300 : width;
  }

  next(): void {
    if (!this.items.length) return;

    const itemWidth = this.getItemWidth() + this.itemGap;
    const scrollAmount = itemWidth * this.numScroll;

    if (this.currentPosition < this.maxPosition) {
      this.currentPosition = Math.min(
        this.currentPosition + scrollAmount,
        this.maxPosition
      );
    } else if (this.circular) {
      this.currentPosition = 0;
    }

    this.updateCurrentPage();
    this.resetAutoplayTimer();
    this.cd.detectChanges();
  }

  prev(): void {
    if (!this.items.length) return;

    const itemWidth = this.getItemWidth() + this.itemGap;
    const scrollAmount = itemWidth * this.numScroll;

    if (this.currentPosition > 0) {
      this.currentPosition = Math.max(this.currentPosition - scrollAmount, 0);
    } else if (this.circular) {
      this.currentPosition = this.maxPosition;
    }

    this.updateCurrentPage();
    this.resetAutoplayTimer();
    this.cd.detectChanges();

    console.log(
      `Prev: currentPosition=${this.currentPosition}, maxPosition=${this.maxPosition}`
    );
  }

  goToPage(pageIndex: number): void {
    if (!this.items.length) return;

    const itemWidth = this.getItemWidth() + this.itemGap;
    const scrollAmount = itemWidth * this.numScroll;
    const totalPages = this.getTotalPages();

    if (pageIndex >= 0 && pageIndex < totalPages) {
      this.currentPosition = pageIndex * scrollAmount;
      if (this.currentPosition > this.maxPosition) {
        this.currentPosition = this.maxPosition;
      }
      this.currentPage = pageIndex;
    }

    this.resetAutoplayTimer();
    this.cd.detectChanges();
  }

  updateCurrentPage(): void {
    const scrollAmount = (this.getItemWidth() + this.itemGap) * this.numScroll;
    if (scrollAmount > 0) {
      this.currentPage = Math.round(this.currentPosition / scrollAmount);
    }
  }

  getTotalPages(): number {
    if (this.items.length === 0 || this.numScroll === 0) return 0;
    return (
      Math.ceil((this.items.length - this.getVisibleItems()) / this.numScroll) +
      1
    );
  }

  getPaginationDots(): number[] {
    const totalPages = this.getTotalPages();
    return Array(totalPages)
      .fill(0)
      .map((_, i) => i);
  }

  isActiveDot(index: number): boolean {
    return this.currentPage === index;
  }

  hasEnoughItems(): boolean {
    return this.items.length > Math.ceil(this.getVisibleItems());
  }

  shouldShowControls(): boolean {
    return this.showControls && this.hasEnoughItems();
  }

  startAutoplay(): void {
    if (this.autoplayInterval && this.autoplayInterval > 0) {
      this.stopAutoplay();
      this.autoplayTimeout = setInterval(() => {
        this.zone.run(() => {
          if (this.currentPosition >= this.maxPosition && !this.circular) {
            this.currentPosition = 0;
          } else {
            this.next();
          }
        });
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

  // Touch event handlers
  onTouchStart(event: TouchEvent): void {
    this.isDragging = true;
    this.touchStartX = event.touches[0].clientX;
    this.touchCurrentX = this.touchStartX;
    this.stopAutoplay();
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging) return;
    this.touchCurrentX = event.touches[0].clientX;
    const deltaX = this.touchCurrentX - this.touchStartX;
    this.currentPosition = Math.max(
      0,
      Math.min(this.maxPosition, this.currentPosition - deltaX)
    );
    this.cd.detectChanges();
  }

  onTouchEnd(): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    const deltaX = this.touchCurrentX - this.touchStartX;
    if (Math.abs(deltaX) > this.swipeThreshold) {
      if (deltaX > 0) {
        this.prev();
      } else {
        this.next();
      }
    } else {
      // Snap back to nearest item
      this.snapToNearestItem();
    }

    this.startAutoplay();
  }

  snapToNearestItem(): void {
    const itemWidth = this.getItemWidth() + this.itemGap;
    const nearestItemIndex = Math.round(this.currentPosition / itemWidth);
    this.currentPosition = nearestItemIndex * itemWidth;
    if (this.currentPosition > this.maxPosition) {
      this.currentPosition = this.maxPosition;
    }
    if (this.currentPosition < 0) {
      this.currentPosition = 0;
    }
    this.updateCurrentPage();
    this.cd.detectChanges();
  }
}
