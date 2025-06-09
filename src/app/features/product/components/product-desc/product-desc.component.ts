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
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDescComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() product: any;
  activeSection: 'description' | 'additional-info' | 'reviews' = 'description';
  reviewCount: number = 0;
  safeDescription: SafeHtml | null = null;

  // Derived product info for the template
  productAdditionlInfo: any = null;

  private sectionPositions: { [key: string]: number } = {};
  private scrolling = false;
  private headerHeight: number = 0;
  private offsetBuffer: number = 50;

  constructor(
    private elementRef: ElementRef,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['product'] && this.product) {
      // Initialize productAdditionlInfo from product data
      this.productAdditionlInfo = this.product;
      this.setSafeDescription();
      this.cdr.markForCheck();
    }
  }

  ngOnInit() {
    if (this.product) {
      this.productAdditionlInfo = this.product;
      this.setSafeDescription();
    }
    
    this.reviewCount = 0;
    this.fetchReviews();
  }

  ngAfterViewInit() {
    const siteHeader = document.querySelector('header');
    const stickyHeader = this.elementRef.nativeElement.querySelector('.sticky-tabs');
    this.headerHeight = (siteHeader?.offsetHeight || 0) + (stickyHeader?.offsetHeight || 70);

    setTimeout(() => {
      this.calculateSectionPositions();
      this.checkActiveSection();
      this.fixWideContent();
    }, 200);

    this.initializeLazyLoading();

    const observer = new MutationObserver(() => {
      this.calculateSectionPositions();
      this.fixWideContent();
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
    const stickyHeader = this.elementRef.nativeElement.querySelector('.sticky-tabs');
    this.headerHeight = (siteHeader?.offsetHeight || 0) + (stickyHeader?.offsetHeight || 70);
    this.fixWideContent();
  }

  scrollToSection(sectionId: 'description' | 'additional-info' | 'reviews'): void {
    this.activeSection = sectionId;

    const element = document.getElementById(sectionId);
    if (element) {
      this.scrolling = true;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
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

    const scrollPosition = window.pageYOffset + this.headerHeight + this.offsetBuffer;
    let activeSection: 'description' | 'additional-info' | 'reviews' = 'description';

    if (this.sectionPositions['reviews'] && scrollPosition >= this.sectionPositions['reviews'] - this.offsetBuffer) {
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
      this.cdr.markForCheck();
    }
  }

  private setSafeDescription(): void {
    const description = this.product?.description || '';
    if (!description) {
      this.safeDescription = null;
      return;
    }
    try {
      // Skip extra console log that might slow down processing
      // 
      
      let processedDescription = description;
      
      processedDescription = processedDescription.replace(/data-src="(.*?)"/g, 'src="$1"');
      processedDescription = processedDescription.replace(/src="data:image\/gif;base64,.*?"/g, '');
      processedDescription = processedDescription.replace(/class="lazyload"/g, '');
      
      this.safeDescription = this.sanitizer.bypassSecurityTrustHtml(processedDescription);
    } catch (error) {
      console.error('Error sanitizing product description:', error);
      const sanitizedText = this.sanitizer.sanitize(SecurityContext.HTML, description) || '';
      this.safeDescription = this.sanitizer.bypassSecurityTrustHtml(sanitizedText);
    }
  }

  private fixWideContent(): void {
    const descriptionContent = this.elementRef.nativeElement.querySelector('.raw-description');
    if (descriptionContent) {
      const tables = descriptionContent.querySelectorAll('table');
      tables.forEach((table: HTMLElement) => {
        table.style.maxWidth = '100%';
        table.style.width = 'auto';
        table.style.tableLayout = 'auto';
        table.style.display = 'block';
        table.style.overflowX = 'auto';
      });

      const wideElements = descriptionContent.querySelectorAll('div[style*="width"], table[style*="width"], img[style*="width"]');
      wideElements.forEach((el: HTMLElement) => {
        el.style.maxWidth = '100%';
        el.style.width = 'auto';
      });

      const customContainers = descriptionContent.querySelectorAll('.container, .bg-1, .pad-4-0-2, .bg-0, .pad-5-0-4');
      customContainers.forEach((el: HTMLElement) => {
        el.style.maxWidth = '100%';
        el.style.width = 'auto';
        el.style.overflowX = 'auto';
      });
      
      const iframes = descriptionContent.querySelectorAll('iframe');
      iframes.forEach((iframe: HTMLElement) => {
        iframe.style.maxWidth = '100%';
        iframe.style.width = '100%';
        iframe.style.height = 'auto';
        iframe.style.minHeight = '315px';
        
        iframe.style.display = 'block';
        
        const parentP = iframe.closest('p');
        if (parentP) {
          parentP.style.maxWidth = '100%';
          parentP.style.width = '100%';
        }
      });
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
        const src = img.getAttribute('data-src');
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          img.onload = () => {
            this.calculateSectionPositions();
            this.fixWideContent();
          };
        }
      }
    });
    
    const iframes = document.querySelectorAll('iframe[data-src]');
    iframes.forEach((iframe) => {
      if (iframe instanceof HTMLIFrameElement) {
        const src = iframe.getAttribute('data-src');
        if (src) {
          iframe.src = src;
          iframe.removeAttribute('data-src');
          iframe.classList.remove('lazyload');
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
