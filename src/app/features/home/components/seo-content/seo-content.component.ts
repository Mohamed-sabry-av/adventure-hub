import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeService } from '../../service/home.service';
@Component({
  selector: 'app-seo-content',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './seo-content.component.html',
  styleUrls: ['./seo-content.component.css']
})
export class SeoContentComponent implements OnInit {
  isContentVisible = false;
  categories: any[] = [];
  // Default category slugs for the SEO content section
  categorySlugs = {
    camping: 'camping-hub',
    hiking: 'hiking-hub',
    diving: 'diving-hub',
    waterSports: 'water-sports-hub',
    cycling: 'cycling'
  };
  constructor(private homeService: HomeService) {}
  ngOnInit(): void {
    this.loadCategories();
  }
  loadCategories(): void {
    this.homeService.getCategories(0, 20).subscribe({
      next: (categories) => {
        if (categories && Array.isArray(categories)) {
          // Store all categories to use their actual slugs
          this.categories = categories;
          // Update category slugs if they exist in the fetched categories
          this.updateCategorySlugs();
        }
      },
      error: (err) => {
        console.error('Error loading categories for SEO content:', err);
      }
    });
  }
  private updateCategorySlugs(): void {
    // Update camping slug
    const campingCategory = this.findCategoryByName(['camping', 'camping equipment', 'camp']);
    if (campingCategory) {
      this.categorySlugs.camping = campingCategory.slug;
    }
    // Update hiking slug
    const hikingCategory = this.findCategoryByName(['hiking', 'hiking gear', 'trekking']);
    if (hikingCategory) {
      this.categorySlugs.hiking = hikingCategory.slug;
    }
    // Update diving slug
    const divingCategory = this.findCategoryByName(['diving', 'diving equipment', 'scuba']);
    if (divingCategory) {
      this.categorySlugs.diving = divingCategory.slug;
    }
    // Update water sports slug
    const waterSportsCategory = this.findCategoryByName(['water sports', 'watersports', 'water-sports']);
    if (waterSportsCategory) {
      this.categorySlugs.waterSports = waterSportsCategory.slug;
    }
    // Update cycling slug
    const cyclingCategory = this.findCategoryByName(['cycling', 'biking', 'bikes']);
    if (cyclingCategory) {
      this.categorySlugs.cycling = cyclingCategory.slug;
    }
  }
  private findCategoryByName(possibleNames: string[]): any {
    return this.categories.find(category => 
      possibleNames.some(name => 
        category.name.toLowerCase() === name.toLowerCase() || 
        category.slug.toLowerCase() === name.toLowerCase().replace(/\s+/g, '-')
      )
    );
  }
  toggleContent() {
    this.isContentVisible = !this.isContentVisible;
  }
} 
