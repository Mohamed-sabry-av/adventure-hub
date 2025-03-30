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
    const sections = Array.from(doc.querySelectorAll('.image-text-wrapper'));

    this.descriptionSections = [
      // النص الأولي قبل الصور
      { text: doc.querySelector('p')?.innerHTML || '' },
      // تفكيك الصور والنصوص
      ...sections.map((section) => {
        const img = section.querySelector('img')?.getAttribute('data-src') || '';
        const title = section.querySelector('h5')?.innerText || '';
        const text = section.querySelector('.content p')?.innerHTML || '';
        const align = section.classList.contains('img-text--left-image-block') ? 'left' : 'right';
        return { image: img, title, text, align };
      }),
    ];
  }
}