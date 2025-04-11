import { Component, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-desc',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-desc.component.html',
  styleUrls: ['./product-desc.component.css'],
})
export class ProductDescComponent implements OnInit {
  productAdditionlInfo = input<any>();
  activeTab: 'description' | 'specifications' = 'description';
  descriptionSections: { text?: string; image?: string; title?: string; align?: string }[] = [];

  ngOnInit() {
    this.parseDescription();
  }

  setActiveTab(tab: 'description' | 'specifications'): void {
    this.activeTab = tab;
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

  
}
