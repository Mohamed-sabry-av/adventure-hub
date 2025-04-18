import { AfterViewInit, Component, ElementRef, HostListener, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { KlaviyoService } from '../../services/klaviyo.service';

interface SpecItem {
  key: string;
  value: string;
}

// interface KlaviyoReview {
//   id: string;
//   rating: number;
//   comment: string;
//   reviewer: string;
//   date: string;
// }

@Component({
  selector: 'app-product-desc',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-desc.component.html',
  styleUrls: ['./product-desc.component.css'],
})
export class ProductDescComponent implements OnInit, AfterViewInit {
  productAdditionlInfo = input<any>();
  activeSection: 'description' | 'additional-info' | 'reviews' = 'description';
  descriptionSections: { text?: string; image?: string; title?: string; align?: string }[] = [];
  productSpecs: SpecItem[] = [];
  reviewCount: number = 0;
  // reviews: KlaviyoReview[] = [];

  private sectionPositions: { [key: string]: number } = {};
  private scrolling = false;
  private headerHeight: number = 0;

  constructor(
    private elementRef: ElementRef,
    private route: ActivatedRoute,
    private router: Router,
    private klaviyoService: KlaviyoService
  ) {}

  ngOnInit() {
    this.parseDescription();
    this.extractSpecifications();
    this.reviewCount = 0;
    this.fetchReviews();
  
    this.route.url.subscribe((segments) => {
      const section = segments[segments.length - 1]?.path as
        | 'description'
        | 'additional-info'
        | 'reviews';
      if (section && ['description', 'additional-info', 'reviews'].includes(section)) {
        this.activeSection = section;
        setTimeout(() => this.scrollToSection(section), 0);
      }
    });
  }

  ngAfterViewInit() {
    // Calculate header height dynamically
    const stickyHeader = this.elementRef.nativeElement.querySelector('.sticky-tabs');
    this.headerHeight = stickyHeader ? stickyHeader.offsetHeight : 70;

    // Calculate section positions
    this.calculateSectionPositions();
    this.checkActiveSection();
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
  }

  

  scrollToSection(sectionId: 'description' | 'additional-info' | 'reviews'): void {
    this.activeSection = sectionId;
    this.router.navigate([`/product/${this.productAdditionlInfo()?.id}/${sectionId}`]);
  
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

    const scrollPosition = window.pageYOffset + this.headerHeight + 50; // Buffer for better UX
    let activeSection: 'description' | 'additional-info' | 'reviews' = 'description';

    // Determine which section is in view
    if (
      this.sectionPositions['reviews'] &&
      scrollPosition >= this.sectionPositions['reviews'] - 100
    ) {
      activeSection = 'reviews';
    } else if (
      this.sectionPositions['additional-info'] &&
      scrollPosition >= this.sectionPositions['additional-info'] - 100
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

  parseDescription() {
    const description = this.productAdditionlInfo()?.description || '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(description, 'text/html');

    this.descriptionSections = [];

    const productBlocks = Array.from(doc.querySelectorAll('.product-block'));
    productBlocks.forEach((block) => {
      const rte = block.querySelector('.rte');
      if (rte) {
        const introText = rte.querySelector('p:not(.medium-4 *)')?.innerHTML;
        if (introText) {
          this.descriptionSections.push({ text: introText });
        }

        const featureList = rte.querySelector('ul');
        if (featureList) {
          this.descriptionSections.push({ text: featureList.outerHTML });
        }

        const weight = rte.querySelector('p:not(.medium-4 *) ~ p:not(.medium-4 *)');
        if (weight) {
          this.descriptionSections.push({ text: weight.innerHTML });
        }
      }

      const sizingChart = block.querySelector('h1');
      if (sizingChart && sizingChart.textContent?.includes('SIZING CHART')) {
        const image = block.querySelector('img')?.getAttribute('data-src') || '';
        const title = sizingChart.textContent || '';
        this.descriptionSections.push({
          title,
          image,
          align: 'center',
        });
      }
    });

    if (!this.descriptionSections.length) {
      this.descriptionSections.push({ text: description });
    }
  }

  extractSpecifications(): void {
    const description = this.productAdditionlInfo()?.description || '';
    const specs: SpecItem[] = [];

    // Example: Parse specifications from description (customize as needed)
    if (description.includes('Specifications') || description.includes('specifications')) {
      // Add logic to extract specs (e.g., from a table or list in the description)
      // Example placeholder:
      specs.push({ key: 'Material', value: 'Cotton' });
      specs.push({ key: 'Weight', value: '200g' });
    }

    this.productSpecs = specs;
  }

  fetchReviews() {
  //   const productId = this.productAdditionlInfo()?.id;
  //   if (productId) {
  //     this.klaviyoService.getProductReviews(productId).subscribe({
  //       next: (reviews) => {
  //         this.reviews = reviews;
  //         this.reviewCount = reviews.length;
  //       },
  //       error: (error) => {
  //         console.error('Error fetching reviews:', error);
  //         this.reviewCount = 0;
  //         this.reviews = [];
  //       },
  //     });
  //   }
  // }
}}