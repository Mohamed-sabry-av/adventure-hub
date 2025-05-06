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
              [style.margin-right.px]="i < items.length - 1 ? itemGap : 0"
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
        class="carousel-nav prev"
        [class.opacity-50]="currentPosition <= 0 && !circular"
        aria-label="Previous items"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
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
        class="carousel-nav next"
        [class.opacity-50]="currentPosition >= maxPosition && !circular"
        aria-label="Next items"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
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
          class="pagination-dot w-3 h-3 rounded-full mx-1 transition-all"
          [class.bg-black]="isActiveDot(i)"
          [class.bg-gray-400]="!isActiveDot(i)"
        ></button>
      </div>
    </div>
  `,
  styles: [
    `
      .custom-carousel {
        position: relative;
        padding: 0 40px;
        user-select: none;
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
        width: 48px;
        height: 48px;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease-in-out;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        z-index: 10;
      }

      .carousel-nav.prev {
        left: 10px;
      }

      .carousel-nav.next {
        right: 10px;
      }

      .carousel-nav:hover {
        background-color: rgba(0, 0, 0, 0.9);
        transform: translateY(-50%) scale(1.1);
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
    this.totalWidth =
      this.items.length * itemWidth + (this.items.length - 1) * this.itemGap;

    this.maxPosition = Math.max(0, this.totalWidth - this.containerWidth);

    if (this.currentPosition > this.maxPosition) {
      this.currentPosition = this.circular ? 0 : this.maxPosition;
    }
    if (this.currentPosition < 0) {
      this.currentPosition = 0;
    }

    this.updateCurrentPage();
    this.cd.detectChanges();
  }

  getVisibleItems(): number {
    if (this.responsiveOptions && this.responsiveOptions.length) {
      for (let option of this.responsiveOptions) {
        if (window.innerWidth <= parseInt(option.breakpoint, 10)) {
          return option.numVisible;
        }
      }
    }

    if (this.screenWidth < 768) {
      return 2;
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

    const itemWidth = this.getItemWidth();
    const scrollAmount = (itemWidth + this.itemGap) * this.numScroll;

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

    const itemWidth = this.getItemWidth();
    const scrollAmount = (itemWidth + this.itemGap) * this.numScroll;

    if (this.currentPosition > 0) {
      this.currentPosition = Math.max(this.currentPosition - scrollAmount, 0);
    } else if (this.circular) {
      this.currentPosition = this.maxPosition;
    }

    this.updateCurrentPage();
    this.resetAutoplayTimer();
    this.cd.detectChanges();
  }

  goToPage(pageIndex: number): void {
    if (!this.items.length) return;

    const itemWidth = this.getItemWidth();
    const scrollAmount = (itemWidth + this.itemGap) * this.numScroll;
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
    const itemWidth = this.getItemWidth();
    const scrollAmount = (itemWidth + this.itemGap) * this.numScroll;
    if (scrollAmount > 0) {
      this.currentPage = Math.round(this.currentPosition / scrollAmount);
    }
  }

  getTotalPages(): number {
    if (this.items.length === 0 || this.numScroll === 0) return 0;
    const totalItems = this.items.length;
    const visibleItems = this.getVisibleItems();
    return Math.ceil((totalItems - visibleItems) / this.numScroll) + 1;
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
    return this.items.length > this.getVisibleItems();
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
}