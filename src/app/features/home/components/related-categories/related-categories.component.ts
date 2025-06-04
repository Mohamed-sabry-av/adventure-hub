import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeService } from '../../service/home.service';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

interface CategoryImage {
  category_id: number;
  category_name: string;
  image_url: string;
}

@Component({
  selector: 'app-related-categories',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './related-categories.component.html',
  styleUrls: ['./related-categories.component.css'],
})
export class RelatedCategoriesComponent implements OnInit {
  categories: any[] = [];
  categoryImages: CategoryImage[] = [];
  loading: boolean = true;
  error: string | null = null;

  // صور الفئات الإفتراضية
  defaultImages: { [key: string]: string } = {
    hiking:
      'https://images.unsplash.com/photo-1501554728187-ce583db33af7?ixlib=rb-1.2.1&auto=format&fit=crop&w=700&q=80',
    camping:
      'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?ixlib=rb-1.2.1&auto=format&fit=crop&w=700&q=80',
    climbing:
      'https://images.unsplash.com/photo-1516592066400-86d98f655676?ixlib=rb-1.2.1&auto=format&fit=crop&w=700&q=80',
    footwear:
      'https://images.unsplash.com/photo-1560072810-1cffb09faf0f?ixlib=rb-1.2.1&auto=format&fit=crop&w=700&q=80',
    jackets:
      'https://images.unsplash.com/photo-1520027298377-d137e4122dab?ixlib=rb-1.2.1&auto=format&fit=crop&w=700&q=80',
    backpacks:
      'https://images.unsplash.com/photo-1501198837835-640009e1a100?ixlib=rb-1.2.1&auto=format&fit=crop&w=700&q=80',
    accessories:
      'https://images.unsplash.com/photo-1532179214618-f169ac064704?ixlib=rb-1.2.1&auto=format&fit=crop&w=700&q=80',
    tents:
      'https://images.unsplash.com/photo-1506535995048-638aa1b62b77?ixlib=rb-1.2.1&auto=format&fit=crop&w=700&q=80',
    'sleeping-bags':
      'https://images.unsplash.com/photo-1503756143517-cbe130ba7009?ixlib=rb-1.2.1&auto=format&fit=crop&w=700&q=80',
    'water-sports':
      'https://images.unsplash.com/photo-1530539595977-0aa9890547c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=700&q=80',
  };

  // Water sports category to replace Home
  waterSportsCategory = {
    id: 999,
    name: 'Water Sports',
    slug: 'water-sports',
    count: 25,
    image: {
      src: this.defaultImages['water-sports']
    }
  };

  constructor(private homeService: HomeService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading = true;
    
    // Fetch both categories and custom category images simultaneously
    forkJoin({
      categories: this.homeService.getCategories(0, 10).pipe(
        catchError(err => {
          console.error('Error loading categories:', err);
          return of([]);
        })
      ),
      categoryImages: this.homeService.getCategoryImages().pipe(
        catchError(err => {
          console.error('Error loading category images:', err);
          return of([]);
        })
      )
    }).pipe(
      finalize(() => this.loading = false)
    ).subscribe({
      next: (result) => {
        this.categoryImages = result.categoryImages || [];
        
        if (result.categories && Array.isArray(result.categories)) {
          // Filter out "home" category if it exists
          let filteredCategories = result.categories.filter(cat => cat.slug !== 'home');
          
          // Add water sports category at the beginning if needed
          const hasWaterSports = filteredCategories.some(cat => 
            cat.slug === 'water-sports' || cat.name.toLowerCase() === 'water sports');
          
          if (!hasWaterSports) {
            filteredCategories.unshift(this.waterSportsCategory);
          }
          
          // Map custom images to categories
          filteredCategories = this.mapCategoryImages(filteredCategories);
          
          // Take only 6 categories
          this.categories = filteredCategories.slice(0, 6);
        } else {
          this.categories = [];
          this.error = 'No categories found';
          console.warn('Received invalid categories data:', result.categories);
        }
      },
      error: (err) => {
        this.error = 'Failed to load categories';
        console.error('Error in forkJoin:', err);
      }
    });
  }

  /**
   * Map custom images to categories
   */
  private mapCategoryImages(categories: any[]): any[] {
    if (!this.categoryImages || this.categoryImages.length === 0) {
      return categories;
    }

    return categories.map(category => {
      // Try to find a matching custom image by category ID
      const customImage = this.categoryImages.find(img => img.category_id === category.id);
      
      if (customImage && customImage.image_url) {
        // Replace the category image with the custom one
        return {
          ...category,
          image: {
            ...category.image,
            src: customImage.image_url
          }
        };
      }
      
      // If no custom image found but category has no image or invalid image, use default
      if (!category.image || !category.image.src) {
        const defaultImage = this.defaultImages[category.slug] || 
          'https://images.unsplash.com/photo-1551632811-561732d1e306?ixlib=rb-1.2.1&auto=format&fit=crop&w=700&q=80';
        
        return {
          ...category,
          image: {
            ...category.image,
            src: defaultImage
          }
        };
      }
      
      // Return unchanged if it already has a valid image
      return category;
    });
  }
}
