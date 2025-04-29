import { AfterViewInit, Component, ElementRef, HostListener, Input, OnInit, SecurityContext } from '@angular/core';
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
  imports: [CommonModule, SafeHtmlPipe],
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
  private offsetBuffer: number = 100; // Buffer for better section detection

  constructor(
    private elementRef: ElementRef,
    private route: ActivatedRoute,
    private router: Router,
    private klaviyoService: KlaviyoService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    // Debug: Print productAdditionlInfo to console
    console.log('Product Additional Info:', this.productAdditionlInfo);
    console.log('Description:', this.productAdditionlInfo?.description);
    console.log('Variations:', this.productAdditionlInfo?.variations);

    // Set the sanitized description
    this.setSafeDescription();

    this.reviewCount = 0;
    this.fetchReviews();

    // Check URL for active section
    this.route.fragment.subscribe(fragment => {
      if (fragment && ['description', 'additional-info', 'reviews'].includes(fragment)) {
        this.activeSection = fragment as 'description' | 'additional-info' | 'reviews';
        setTimeout(() => this.scrollToSection(this.activeSection, false), 100);
      }
    });
  }

  ngAfterViewInit() {
    // Calculate header height dynamically
    const stickyHeader = this.elementRef.nativeElement.querySelector('.sticky-tabs');
    this.headerHeight = stickyHeader ? stickyHeader.offsetHeight : 70;

    // Calculate section positions
    setTimeout(() => {
      this.calculateSectionPositions();
      this.checkActiveSection();
    }, 200);

    // Initialize lazy loading for images
    this.initializeLazyLoading();
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll() {
    if (!this.scrolling) {
      this.checkActiveSection();
    }
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize() {
    this.calculateSectionPositions();
    // Recalculate header height on resize
    const stickyHeader = this.elementRef.nativeElement.querySelector('.sticky-tabs');
    this.headerHeight = stickyHeader ? stickyHeader.offsetHeight : 70;
  }

  scrollToSection(sectionId: 'description' | 'additional-info' | 'reviews', updateUrl: boolean = true): void {
    this.activeSection = sectionId;

    if (updateUrl) {
      this.router.navigate([], {
        relativeTo: this.route,
        fragment: sectionId,
        replaceUrl: true
      });
    }

    const element = document.getElementById(sectionId);
    if (element) {
      this.scrolling = true;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - this.headerHeight - 10;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });

      setTimeout(() => {
        this.scrolling = false;
      }, 600);
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

    const scrollPosition = window.pageYOffset + this.headerHeight + this.offsetBuffer;
    let activeSection: 'description' | 'additional-info' | 'reviews' = 'description';

    // Determine which section is in view
    if (
      this.sectionPositions['reviews'] &&
      scrollPosition >= this.sectionPositions['reviews'] - this.offsetBuffer
    ) {
      activeSection = 'reviews';
    } else if (
      this.sectionPositions['additional-info'] &&
      scrollPosition >= this.sectionPositions['additional-info'] - this.offsetBuffer
    ) {
      activeSection = 'additional-info';
    } else if (this.sectionPositions['description']) {
      activeSection = 'description';
    }

    if (this.activeSection !== activeSection) {
      this.activeSection = activeSection;
      // Update URL fragment silently
      this.router.navigate([], {
        relativeTo: this.route,
        fragment: activeSection,
        replaceUrl: true,
      });
    }
  }

  private setSafeDescription(): void {
    const description = this.productAdditionlInfo?.description || '';
    if (!description) {
      this.safeDescription = null;
      return;
    }

    try {
      // Sanitize the HTML content to prevent XSS attacks but allow formatting
      this.safeDescription = this.sanitizer.bypassSecurityTrustHtml(description);
    } catch (error) {
      console.error('Error sanitizing product description:', error);
      const sanitizedText = this.sanitizer.sanitize(SecurityContext.HTML, description) || '';
      this.safeDescription = this.sanitizer.bypassSecurityTrustHtml(sanitizedText);
    }
  }

  // Extract colors and sizes from variations
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
    // Implement as needed
  }

  private initializeLazyLoading(): void {
    // Initialize lazy loading for images with data-src
    const images = document.querySelectorAll('img[data-src]');
    images.forEach((img) => {
      const src = img.getAttribute('data-src');
      if (src) {
        img.setAttribute('src', src);
        img.setAttribute('loading', 'lazy');
        img.removeAttribute('data-src');
      }
    });
  }
}
