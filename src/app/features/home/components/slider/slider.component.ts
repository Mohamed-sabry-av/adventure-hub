import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  inject,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  HostListener,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CarouselModule, OwlOptions, CarouselComponent } from 'ngx-owl-carousel-o';
import { Subscription, timer } from 'rxjs';
import { take } from 'rxjs/operators';
import { HomeService } from '../../service/home.service';

interface BannerImage {
  large: string;
  small: string;
}

@Component({
  selector: 'app-slider',
  standalone: true,
  imports: [CommonModule, RouterModule, CarouselModule],
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SliderComponent implements OnInit, OnDestroy, AfterViewInit {
  private homeService = inject(HomeService);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);
  
  @ViewChild('owlCarousel') owlCarousel?: CarouselComponent;
  @ViewChild('prevBtn') prevBtn?: ElementRef<HTMLButtonElement>;
  @ViewChild('nextBtn') nextBtn?: ElementRef<HTMLButtonElement>;
  
  bannerImages: BannerImage[] = [];
  loading: boolean = true;
  error: string | null = null;
  isMobile: boolean = false;
  
  carouselOptions: OwlOptions = {
    loop: true,
    mouseDrag: true,
    touchDrag: true,
    pullDrag: true,
    dots: true,
    navSpeed: 700,
    navText: ['', ''],
    autoplay: true, 
    autoplayTimeout: 5000,
    autoplayHoverPause: true,
    responsive: {
      0: {
        items: 1,
        nav: false
      },
      768: {
        items: 1,
        nav: false
      }
    },
    nav: false
  };

  private subscriptions: Subscription = new Subscription();
  private prevClickListener?: (e: Event) => void;
  private nextClickListener?: (e: Event) => void;

  ngOnInit(): void {
    this.checkScreenSize();
    this.loadBannerImages();
  }
  
  ngAfterViewInit(): void {
    // استخدام زمن مناسب للتأكد من تهيئة العناصر
    timer(100, 300)
      .pipe(take(5))
      .subscribe(() => {
        this.setupCustomNavigation();
      });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.removeNavigationListeners();
  }
  
  @HostListener('window:resize')
  onResize(): void {
    this.checkScreenSize();
    this.cdr.markForCheck();
  }
  
  checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768;
  }

  loadBannerImages(): void {
    this.loading = true;
    const subscription = this.homeService.getBannerImages()
      .subscribe({
        next: (bannerImages) => {
          this.bannerImages = bannerImages;
          this.loading = false;
          this.cdr.markForCheck();
          
          // إعادة محاولة إعداد الأزرار بعد تحميل الصور
          this.zone.runOutsideAngular(() => {
            setTimeout(() => {
              this.setupCustomNavigation();
            }, 300);
          });
        },
        error: (err) => {
          console.error('Error loading banner images:', err);
          this.error = 'Failed to load banner images';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
    
    this.subscriptions.add(subscription);
  }
  
  // إزالة المستمعين السابقين لتجنب التكرار
  private removeNavigationListeners(): void {
    if (this.prevBtn?.nativeElement && this.prevClickListener) {
      this.prevBtn.nativeElement.removeEventListener('click', this.prevClickListener);
    }
    
    if (this.nextBtn?.nativeElement && this.nextClickListener) {
      this.nextBtn.nativeElement.removeEventListener('click', this.nextClickListener);
    }
  }
  
  setupCustomNavigation(): void {
    this.zone.runOutsideAngular(() => {
      // إزالة المستمعين السابقين
      this.removeNavigationListeners();
      
      // إنشاء مستمعين جدد
      if (this.prevBtn?.nativeElement && this.nextBtn?.nativeElement && this.owlCarousel) {
        // استخدام addEventListener بدلاً من onclick لأداء أفضل
        this.prevClickListener = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.owlCarousel) {
            this.owlCarousel.prev();
            this.zone.run(() => {
              this.cdr.markForCheck();
            });
          }
        };
        
        this.nextClickListener = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          if (this.owlCarousel) {
            this.owlCarousel.next();
            this.zone.run(() => {
              this.cdr.markForCheck();
            });
          }
        };
        
        this.prevBtn.nativeElement.addEventListener('click', this.prevClickListener);
        this.nextBtn.nativeElement.addEventListener('click', this.nextClickListener);
      } else {
        // محاولة استخدام المحددات في حالة عدم توفر ViewChild
        const prevBtn = document.querySelector('.slider-container .prev-btn') as HTMLElement;
        const nextBtn = document.querySelector('.slider-container .next-btn') as HTMLElement;
        
        if (prevBtn && nextBtn && this.owlCarousel) {
          this.prevClickListener = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.owlCarousel) {
              this.owlCarousel.prev();
              this.zone.run(() => {
                this.cdr.markForCheck();
              });
            }
          };
          
          this.nextClickListener = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.owlCarousel) {
              this.owlCarousel.next();
              this.zone.run(() => {
                this.cdr.markForCheck();
              });
            }
          };
          
          prevBtn.addEventListener('click', this.prevClickListener);
          nextBtn.addEventListener('click', this.nextClickListener);
        }
      }
    });
  }
}
