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
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { HomeService } from '../../service/home.service';
import Splide from '@splidejs/splide';

interface BannerImage {
  large: string;
  small: string;
}

@Component({
  selector: 'app-slider',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './slider.component.html',
  styleUrls: ['./slider.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SliderComponent implements OnInit, OnDestroy, AfterViewInit {
  private homeService = inject(HomeService);
  private cdr = inject(ChangeDetectorRef);
  
  @ViewChild('splideEl') splideEl?: ElementRef<HTMLElement>;
  
  bannerImages: BannerImage[] = [];
  loading: boolean = true;
  error: string | null = null;
  isMobile: boolean = false;
  
  private splide?: Splide;
  private subscriptions: Subscription = new Subscription();

  ngOnInit(): void {
    this.checkScreenSize();
    this.loadBannerImages();
  }
  
  ngAfterViewInit(): void {
    this.initSplide();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    
    if (this.splide) {
      this.splide.destroy();
    }
  }
  
  @HostListener('window:resize')
  onResize(): void {
    const wasMobile = this.isMobile;
    this.checkScreenSize();
    
    // Only re-render if the device type changed (mobile/desktop)
    if (wasMobile !== this.isMobile) {
    this.cdr.markForCheck();
      if (this.splide) {
        this.splide.refresh();
      }
    }
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
          
          // Initialize Splide after images are loaded
            setTimeout(() => {
            this.initSplide();
            }, 300);
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
  
  private initSplide(): void {
    if (this.splideEl && this.bannerImages.length > 0) {
      if (this.splide) {
        this.splide.destroy();
    }
      
      this.splide = new Splide(this.splideEl.nativeElement, {
        type: 'loop',
        perPage: 1,
        autoplay: true,
        interval: 5000,
        pauseOnHover: true,
        arrows: true,
        pagination: true,
        speed: 800,
        rewind: true,
        height: this.isMobile ? '450px' : '550px',
        lazyLoad: 'nearby',
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        role: 'region',
        label: 'Featured Banner Images'
      });
      
      this.splide.mount();
        }
  }
}
