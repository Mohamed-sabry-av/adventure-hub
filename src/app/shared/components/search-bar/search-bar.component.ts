import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  HostListener,
  ChangeDetectionStrategy,
  Inject,
  PLATFORM_ID,
  inject,
  NgZone,
  ChangeDetectorRef,
  OnDestroy,
} from '@angular/core';
import {
  debounceTime,
  distinctUntilChanged,
  Subject,
  switchMap,
  of,
  firstValueFrom,
  Subscription,
} from 'rxjs';
import { SearchBarService } from '../../services/search-bar.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { CategoriesService } from '../../../core/services/categories.service';

interface Category {
  id: number;
  name: string;
  count?: number;
  children?: Category[];
  parent?: number;
  expanded?: boolean;
  slug?: any;
}

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchBarComponent implements OnInit, OnDestroy {
  searchTerm = new Subject<string>();
  products: any[] = [];
  categories: Category[] = [];
  processedCategories: Category[] = [];
  loading = false;
  showResults = false;
  activeTab: 'products' | 'categories' = 'products';
  recentSearches: string[] = [];
  
  // Voice search properties
  isListening: boolean = false;
  speechSupported: boolean = false;

  @ViewChild('searchInput') searchInput!: ElementRef;
  @ViewChild('resultsContainer') resultsContainer!: ElementRef;

  private categoriesService: CategoriesService;
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private subscriptions = new Subscription();

  constructor(
    private searchService: SearchBarService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.categoriesService = inject(CategoriesService);
    if (isPlatformBrowser(this.platformId)) {
      const savedSearches = localStorage.getItem('recentSearches');
      if (savedSearches) {
        this.recentSearches = JSON.parse(savedSearches).slice(0, 5);
      }
      
      // Get speech recognition support status from service
      this.speechSupported = this.searchService.isSpeechRecognitionSupported();
    }
  }

  ngOnInit() {
    this.handleSearch();
    
    // Subscribe to voice search status updates
    const voiceSearchSub = this.searchService.voiceSearchStatus$.subscribe(status => {
      this.isListening = status.isListening;
      
      // If we got a transcript, update the search input and trigger search
      if (status.transcript) {
        if (this.searchInput && this.searchInput.nativeElement) {
          this.searchInput.nativeElement.value = status.transcript;
          this.searchTerm.next(status.transcript);
        }
      }
      
      this.cdr.markForCheck();
    });
    
    this.subscriptions.add(voiceSearchSub);
  }
  
  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  // Handle Enter key press for search
  @HostListener('keydown.enter')
  onKeydownEnter(): void {
    const term = this.searchInput.nativeElement.value.trim();
    if (term) {
      this.saveToRecentSearches(term);
      this.showResults = false;
      this.navigateToSearchResults(term);
    }
  }

  // Handle form submission
  onEnterKey(event: Event): void {
    const term = this.searchInput.nativeElement.value.trim();
    if (term) {
      this.saveToRecentSearches(term);
      this.showResults = false;
      this.navigateToSearchResults(term);
    }
  }

  // Navigate to search results page
  navigateToSearchResults(query: string): void {
    if (!query.trim()) return;

    this.showResults = false;
    this.saveToRecentSearches(query);

    this.router.navigate(['/product/search'], {
      queryParams: { query: query },
    });
  }

  // دالة جديدة لاختيار صورة صغيرة
  getThumbnail(product: any): string {
    if (product.images && product.images.length > 0) {
      const image = product.images[0];
      // استخدام الصورة الصغيرة (thumbnail أو صورة من srcset)
      if (image.thumbnail) {
        return image.thumbnail; // مثل 150x150
      }
      // الرجوع إلى صورة صغيرة من srcset إذا كانت موجودة
      const srcset = image.srcset
        ?.split(',')
        .map((src: string) => src.trim().split(' ')[0]);
      const smallImage = srcset?.find(
        (src: string) => src.includes('100x100') || src.includes('150x150')
      );
      return smallImage || image.src; // الرجوع إلى src إذا لم يكن هناك صورة صغيرة
    }
    return ''; // صورة افتراضية إذا لم تكن هناك صور
  }

  handleSearch() {
    this.searchTerm
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term: string) => {
          if (!term.trim()) {
            return of({ products: [], categories: [] });
          }
          this.loading = true;
          this.showResults = true;
          // Use optimized search method for better performance
          return this.searchService.OptimizedComprehensiveSearch(term);
        })
      )
      .subscribe(
        (results: any) => {
          this.products = results.products || [];
          this.categories = results.categories || [];
          this.processCategories();
          this.loading = false;
          if (this.products.length > 0 && this.categories.length === 0) {
            this.activeTab = 'products';
          } else if (this.products.length === 0 && this.categories.length > 0) {
            this.activeTab = 'categories';
          }
          this.cdr.markForCheck();
        },
        (error) => {
          console.error('Error fetching search results:', error);
          this.loading = false;
          this.cdr.markForCheck();
        }
      );
  }

  processCategories() {
    const categoryMap = new Map<number, Category>();
    this.categories.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, children: [], expanded: false });
    });

    this.processedCategories = [];

    this.categories.forEach((cat) => {
      const category = categoryMap.get(cat.id);
      if (category) {
        if (!cat.parent || !categoryMap.has(cat.parent)) {
          this.processedCategories.push(category);
        } else {
          const parent = categoryMap.get(cat.parent);
          if (parent && parent.children) {
            parent.children.push(category);
          }
        }
      }
    });
  }

  toggleCategory(category: Category, event: Event) {
    event.stopPropagation();
    category.expanded = !category.expanded;
  }

  hasChildren(category: Category): boolean {
    return !!(category.children && category.children.length > 0);
  }

  onSearch(event: any): void {
    const term = event.target.value.trim();
    this.searchTerm.next(term);
    if (!term) {
      this.showResults = false;
      this.products = [];
      this.categories = [];
    }
  }

  onFocus(): void {
    const term = this.searchInput.nativeElement.value.trim();
    if (term || this.recentSearches.length > 0) {
      this.showResults = true;
    }
  }

  selectProduct(product: any): void {
    this.saveToRecentSearches(this.searchInput.nativeElement.value);
    this.showResults = false;
    this.router.navigate([`/product/${product.slug}`]);
  }

  /**
   * Select a category and navigate to its full path page
   */
  async selectCategory(category: Category): Promise<void> {
    this.saveToRecentSearches(this.searchInput.nativeElement.value);
    this.showResults = false;

    // Get the full path of category slugs using the CategoriesService (card-details approach)
    const pathSegments = await this.getCategoryPath(category);

    // Create a router navigation array that starts with the base path '/category'
    // and adds each segment as a separate argument (not using spread operator)
    const navigationArray = ['/category'];

    // Add each path segment individually to the navigationArray
    for (const segment of pathSegments) {
      navigationArray.push(segment);
    }

    // Navigate using the array-based approach that ensures proper URL construction
    this.router.navigate(navigationArray);
  }

  /**
   * Get the full category path as an array of slugs
   * This builds an array starting from the root category to the selected category
   * Uses CategoriesService to get the complete hierarchy
   */
  async getCategoryPath(category: Category): Promise<string[]> {
    try {
      // Start with the current category
      const slugs: string[] = [category.slug];
      let currentCategory = category;

      // Add parent categories by querying them individually
      while (currentCategory.parent) {
        // Get the parent category directly from the service
        const parentCategory = await firstValueFrom(
          this.categoriesService.getCategoryById(currentCategory.parent)
        );

        if (!parentCategory) break;

        // Add to start of array (we're building from root to child)
        slugs.unshift(parentCategory.slug);
        currentCategory = parentCategory;
      }

      return slugs;
    } catch (error) {
      console.error('Error building category path:', error);
      // Fallback to simple slug-only array
      return [category.slug];
    }
  }

  clearSearch(): void {
    this.searchInput.nativeElement.value = '';
    this.searchTerm.next('');
    this.showResults = false;
    this.products = [];
    this.categories = [];
    this.processedCategories = [];
  }

  saveToRecentSearches(term: string): void {
    if (term && !this.recentSearches.includes(term)) {
      this.recentSearches.unshift(term);
      this.recentSearches = this.recentSearches.slice(0, 5);
      localStorage.setItem(
        'recentSearches',
        JSON.stringify(this.recentSearches)
      );
    }
  }

  selectRecentSearch(term: string): void {
    this.searchInput.nativeElement.value = term;
    this.searchTerm.next(term);
  }

  clearRecentSearches(): void {
    this.recentSearches = [];
    localStorage.removeItem('recentSearches');
  }

  switchTab(tab: 'products' | 'categories'): void {
    this.activeTab = tab;
  }

  formatPrice(product: any): string {
    if (product.onSale) {
      return `<span class="line-through text-gray-400 mr-2">${product.regular_price}</span> ${product.sale_price}`;
    }
    return product.price;
  }

  closeSearchResults(): void {
    this.showResults = false;
  }

  preventClose(event: Event): void {
    event.stopPropagation();
  }

  /**
   * Start voice search using the service
   */
  startVoiceSearch(): void {
    this.searchService.startVoiceSearch();
  }
  
  /**
   * Stop voice search using the service
   */
  stopVoiceSearch(): void {
    this.searchService.stopVoiceSearch();
  }
}
