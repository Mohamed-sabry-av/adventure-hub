import { AfterViewInit, Component, ElementRef, HostListener, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface SpecItem {
  key: string;
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
  productAdditionlInfo = input<any>();
  activeSection: 'description' | 'additional-info' | 'reviews' = 'description';
  descriptionSections: { text?: string; image?: string; title?: string; align?: string }[] = [];
  productSpecs: SpecItem[] = [];
  reviewCount: number = 0;

  // Keep track of section positions
  private sectionPositions: { [key: string]: number } = {};
  private scrolling = false;

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    this.parseDescription();
    this.extractSpecifications();
    // You can set a dummy review count or fetch it from an API
    this.reviewCount = 0;
  }

  ngAfterViewInit() {
    // Calculate section positions after the view is initialized
    this.calculateSectionPositions();
    // Initial check for the active section based on scroll position
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
    const element = document.getElementById(sectionId);
    if (element) {
      this.scrolling = true;
      this.activeSection = sectionId;

      // Calculate offset to account for sticky header
      const offset = 70; // Adjust based on your header height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      // Reset scrolling flag after animation completes
      setTimeout(() => {
        this.scrolling = false;
      }, 500);
    }
  }

  private calculateSectionPositions(): void {
    const sections = ['description', 'additional-info', 'reviews'];
    sections.forEach(section => {
      const element = document.getElementById(section);
      if (element) {
        this.sectionPositions[section] = element.offsetTop;
      }
    });
  }

  private checkActiveSection(): void {
    if (this.scrolling) return;

    const scrollPosition = window.pageYOffset + 100; // Add offset for better UX

    // Find the section that is currently in view
    let activeSection: 'description' | 'additional-info' | 'reviews' = 'description';

    if (scrollPosition >= this.sectionPositions['reviews']) {
      activeSection = 'reviews';
    } else if (scrollPosition >= this.sectionPositions['additional-info']) {
      activeSection = 'additional-info';
    } else {
      activeSection = 'description';
    }

    if (this.activeSection !== activeSection) {
      this.activeSection = activeSection;
    }
  }

  parseDescription() {
    const description = this.productAdditionlInfo()?.description || '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(description, 'text/html');

    // Initialize descriptionSections
    this.descriptionSections = [];

    // Extract product blocks
    const productBlocks = Array.from(doc.querySelectorAll('.product-block'));

    productBlocks.forEach((block) => {
      // Handle RTE block (features, intro text, etc.)
      const rte = block.querySelector('.rte');
      if (rte) {
        // Initial paragraph
        const introText = rte.querySelector('p:not(.medium-4 *)')?.innerHTML;
        if (introText) {
          this.descriptionSections.push({ text: introText });
        }

        // Feature list
        const featureList = rte.querySelector('ul');
        if (featureList) {
          this.descriptionSections.push({ text: featureList.outerHTML });
        }

        // Weight information
        const weight = rte.querySelector('p:not(.medium-4 *) ~ p:not(.medium-4 *)');
        if (weight) {
          this.descriptionSections.push({ text: weight.innerHTML });
        }
      }

      // Handle sizing chart
      const sizingChart = block.querySelector('h1');
      if (sizingChart && sizingChart.textContent?.includes('SIZING CHART')) {
        const image = block.querySelector('img')?.getAttribute('data-src') || '';
        const title = sizingChart.textContent || '';
        this.descriptionSections.push({
          title,
          image,
          align: 'center', // As per the align="center" in the HTML
        });
      }
    });

    // Fallback: if no sections were parsed, use raw description
    if (!this.descriptionSections.length) {
      this.descriptionSections.push({ text: description });
    }
  }

  extractSpecifications(): void {
    // This method extracts specifications from the description HTML
    // Example: dimensions, weight, material, etc.
    const description = this.productAdditionlInfo()?.description || '';

    // Try to find specifications in the description
    if (description.includes('Specifications') || description.includes('specifications')) {
      // Find common specification patterns
      const specs: SpecItem[] = [];

      
     

      this.productSpecs = specs;
    }
  }
}
