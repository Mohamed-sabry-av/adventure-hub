import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  SecurityContext,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { KlaviyoService } from '../../services/klaviyo.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SafeHtmlPipe } from '../../../../shared/pipes/safeHtml.pipe';

interface SpecItem {
  key: string;
  value: string;
}

interface Attribute {
  name: string;
  value: string;
}

@Component({
  selector: 'app-product-desc',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-desc.component.html',
  styleUrls: ['./product-desc.component.css'],
})
export class ProductDescComponent implements OnInit, AfterViewInit {
  @Input() productAdditionlInfo: any;
  activeSection: 'description' | 'additional-info' | 'reviews' = 'description';
  reviewCount: number = 0;
  safeDescription: SafeHtml | null = null;

  private sectionPositions: { [key: string]: number } = {};
  private scrolling = false;
  private headerHeight: number = 0;
  private offsetBuffer: number = 50; // Reduced for better section detection

  constructor(
    private elementRef: ElementRef,
    private route: ActivatedRoute,
    private router: Router,
    private klaviyoService: KlaviyoService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Validate productAdditionlInfo
    if (!this.productAdditionlInfo) {
      console.error('productAdditionlInfo is undefined');
      this.productAdditionlInfo = {};
    }
    console.log('Product Additional Info:', this.productAdditionlInfo);

    // Set the sanitized description
    this.setSafeDescription();

    this.reviewCount = 0;
    this.fetchReviews();

    // Check URL fragment
    const fragment = this.route.snapshot.fragment;
    if (
      fragment &&
      ['description', 'additional-info', 'reviews'].includes(fragment)
    ) {
      this.activeSection = fragment as
        | 'description'
        | 'additional-info'
        | 'reviews';
      setTimeout(() => this.scrollToSection(this.activeSection, false), 300);
    }
  }

  ngAfterViewInit() {
    // Calculate header height including site header
    const siteHeader = document.querySelector('header'); // Adjust selector as needed
    const stickyHeader =
      this.elementRef.nativeElement.querySelector('.sticky-tabs');
    this.headerHeight =
      (siteHeader?.offsetHeight || 0) + (stickyHeader?.offsetHeight || 70);

    // Calculate section positions
    setTimeout(() => {
      this.calculateSectionPositions();
      this.checkActiveSection();
    }, 200);

    // Initialize lazy loading for images
    this.initializeLazyLoading();

    // Observe content changes
    const observer = new MutationObserver(() => {
      this.calculateSectionPositions();
    });
    observer.observe(this.elementRef.nativeElement, {
      childList: true,
      subtree: true,
    });
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll = this.debounce(() => {
    if (!this.scrolling) {
      this.checkActiveSection();
    }
  }, 100);

  @HostListener('window:resize', ['$event'])
  onWindowResize() {
    this.calculateSectionPositions();
    const siteHeader = document.querySelector('header');
    const stickyHeader =
      this.elementRef.nativeElement.querySelector('.sticky-tabs');
    this.headerHeight =
      (siteHeader?.offsetHeight || 0) + (stickyHeader?.offsetHeight || 70);
  }

  scrollToSection(
    sectionId: 'description' | 'additional-info' | 'reviews',
    updateUrl: boolean = true
  ): void {
    this.activeSection = sectionId;

    if (updateUrl) {
      this.router.navigate([], {
        relativeTo: this.route,
        fragment: sectionId,
        replaceUrl: true,
      });
    }

    const element = document.getElementById(sectionId);
    if (element) {
      this.scrolling = true;
      const elementPosition =
        element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - this.headerHeight - 20;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });

      setTimeout(() => {
        this.scrolling = false;
        this.checkActiveSection();
        this.cdr.markForCheck();
      }, 800);
    } else {
      console.warn(`Section ${sectionId} not found`);
    }
  }

  private calculateSectionPositions(): void {
    const sections = ['description', 'additional-info', 'reviews'];
    this.sectionPositions = {};
    sections.forEach((section) => {
      const element = document.getElementById(section);
      if (element) {
        this.sectionPositions[section] = element.offsetTop;
      }
    });
  }

  private checkActiveSection(): void {
    if (this.scrolling) return;

    const scrollPosition =
      window.pageYOffset + this.headerHeight + this.offsetBuffer;
    let activeSection: 'description' | 'additional-info' | 'reviews' =
      'description';

    if (
      this.sectionPositions['reviews'] &&
      scrollPosition >= this.sectionPositions['reviews'] - this.offsetBuffer
    ) {
      activeSection = 'reviews';
    } else if (
      this.sectionPositions['additional-info'] &&
      scrollPosition >=
        this.sectionPositions['additional-info'] - this.offsetBuffer
    ) {
      activeSection = 'additional-info';
    } else if (this.sectionPositions['description']) {
      activeSection = 'description';
    }

    if (this.activeSection !== activeSection) {
      this.activeSection = activeSection;
      this.router.navigate([], {
        relativeTo: this.route,
        fragment: activeSection,
        replaceUrl: true,
      });
      this.cdr.markForCheck();
    }
  }

  private setSafeDescription(): void {
    const description = this.productAdditionlInfo?.description || '';
    if (!description) {
      this.safeDescription = null;
      return;
    }

    try {
      this.safeDescription =
        this.sanitizer.bypassSecurityTrustHtml(description);
    } catch (error) {
      console.error('Error sanitizing product description:', error);
      const sanitizedText =
        this.sanitizer.sanitize(SecurityContext.HTML, description) || '';
      this.safeDescription =
        this.sanitizer.bypassSecurityTrustHtml(sanitizedText);
    }
  }

  getAdditionalInfoFromVariations(): { colors: string[]; sizes: string[] } {
    const variations = this.productAdditionlInfo?.variations || [];
    const colors = new Set<string>();
    const sizes = new Set<string>();

    variations.forEach((variation: any) => {
      variation.attributes?.forEach((attr: any) => {
        if (attr.name === 'Color' && attr.option) {
          colors.add(attr.option);
        }
        if (attr.name === 'Size' && attr.option) {
          sizes.add(attr.option);
        }
      });
    });

    return {
      colors: Array.from(colors),
      sizes: Array.from(sizes),
    };
  }

  fetchReviews() {
    // Placeholder for fetching reviews
  }

  private initializeLazyLoading(): void {
    const images = document.querySelectorAll('img[data-src]');
    images.forEach((img) => {
      if (img instanceof HTMLImageElement) {
        // Type guard
        const src = img.getAttribute('data-src');
        if (src) {
          img.src = src;
          img.loading = 'lazy';
          img.removeAttribute('data-src');
          img.onload = () => this.calculateSectionPositions();
        }
      }
    });
  }

  private debounce(fn: Function, ms: number) {
    let timeoutId: any;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), ms);
    };
  }
}
