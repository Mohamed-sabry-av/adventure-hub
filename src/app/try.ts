// products.component.ts
export class ProductsComponent implements OnInit {
  products: any[] = [];
  isLoading = true;
  isLoadingMore = false;
  currentCategoryId: number | null = null;
  currentPage: number = 1;
  itemPerPage: number = 18;
  totalProducts: number = 0;

  constructor(
    private productService: ProductService,
    private categoriesService: CategoriesService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // ... your existing ngOnInit code ...
  }

  // Remove the ViewChild since it's not in the template
  // @ViewChild('productsContainer') productsContainer!: ElementRef;

  @HostListener('window:scroll', ['$event'])
  onScroll(event: Event) {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    
    // Check if we're near the bottom (within 200px)
    if (scrollTop + windowHeight >= documentHeight - 200 && !this.isLoading && !this.isLoadingMore) {
      this.loadMoreProducts();
    }
  }

  onCategoryIdChange(categoryId: number | null) {
    this.currentCategoryId = categoryId;
    this.currentPage = 1;
    this.products = []; // Clear products when category changes
    this.isLoading = true;
    console.log('Category ID updated:', this.currentCategoryId);
    
    if (categoryId !== null) {
      this.loadProducts(categoryId, this.currentPage);
      this.loadTotalProducts(categoryId);
    } else {
      this.loadAllProducts(this.currentPage);
      this.loadTotalAllProducts();
    }
  }

  private loadProducts(categoryId: number, page: number) {
    const isInitialLoad = page === 1;
    if (isInitialLoad) {
      this.isLoading = true;
    } else {
      this.isLoadingMore = true;
    }

    this.productService.getProductsByCategoryId(categoryId, page, this.itemPerPage).subscribe({
      next: (products) => {
        console.log(`Loaded ${products.length} products for page ${page}`);
        // Only append new products, don't duplicate
        this.products = isInitialLoad ? products : [...this.products, ...products];
      },
      error: (error) => {
        console.error('Error loading products:', error);
      },
      complete: () => {
        this.isLoading = false;
        this.isLoadingMore = false;
      }
    });
  }

  private loadAllProducts(page: number) {
    const isInitialLoad = page === 1;
    if (isInitialLoad) {
      this.isLoading = true;
    } else {
      this.isLoadingMore = true;
    }

    this.productService.getAllProducts(page, this.itemPerPage).subscribe({
      next: (products) => {
        console.log(`Loaded ${products.length} all products for page ${page}`);
        this.products = isInitialLoad ? products : [...this.products, ...products];
      },
      error: (error) => {
        console.error('Error loading all products:', error);
      },
      complete: () => {
        this.isLoading = false;
        this.isLoadingMore = false;
      }
    });
  }

  private loadMoreProducts() {
    if (this.currentPage * this.itemPerPage >= this.totalProducts) {
      console.log('All products loaded:', this.totalProducts);
      return;
    }

    if (!this.isLoading && !this.isLoadingMore) {
      this.currentPage++;
      console.log('Fetching page:', this.currentPage);
      
      if (this.currentCategoryId !== null) {
        this.loadProducts(this.currentCategoryId, this.currentPage);
      } else {
        this.loadAllProducts(this.currentPage);
      }
    }
  }

  // ... rest of your existing methods ...
}