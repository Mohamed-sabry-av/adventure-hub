import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HomeService } from '../../service/home.service';

@Component({
  selector: 'app-related-categories',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './related-categories.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,

  styleUrls: ['./related-categories.component.css'],
})
export class RelatedCategoriesComponent implements OnInit {
  categories: any[] = [];
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
  };

  constructor(private homeService: HomeService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading = true;
    this.homeService.getCategories(0, 10).subscribe({
      next: (data) => {
        this.categories = data.map((category: any) => {
          if (!category.image || !category.image.src) {
            const defaultImage =
              this.defaultImages[category.slug] ||
              'https://images.unsplash.com/photo-1551632811-561732d1e306?ixlib=rb-1.2.1&auto=format&fit=crop&w=700&q=80';
            return {
              ...category,
              image: {
                ...category.image,
                src: defaultImage,
              },
            };
          }
          return category;
        });
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load categories';
        this.loading = false;
        console.error('Error loading categories:', err);
      },
    });
  }
}
