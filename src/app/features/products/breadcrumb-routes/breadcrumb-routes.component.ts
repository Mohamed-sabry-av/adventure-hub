import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Category } from '../../../interfaces/category.model';
import { CategoriesService } from '../../../core/services/categories.service';
import { ProductService } from '../../../core/services/product.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

@Component({
  selector: 'app-breadcrumb-routes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <ul class="list-group subroutes">
      <li class="list-group-itme" *ngFor="let subCat of subcategories">
        <a class="subrouteA" [routerLink]="getSubCategoryRoute(subCat.category)" (click)="onSubcategoryClick(subCat.category)">
        {{subCat.category.name}}  ({{subCat.productCount}})
        </a>
      </li>
    </ul>
  `,
  styleUrls: ['./breadcrumb-routes.component.css'],
})
export class BreadcrumbRoutesComponent {
  @Input() categoryId: number |null = null;
  subcategories:{category: Category; productCount: number}[] = [];

  constructor(
    private categoryService: CategoriesService,
    private productService: ProductService,
    private router:Router,
    private route:ActivatedRoute,
    private cdr:ChangeDetectorRef
  ) {}




  ngOnInit() {
    if(this.categoryId ){
      this.loadSubCategories(this.categoryId!)
    }else{
      console.log('Category ID is null or undefined')
    }
  }




  private loadSubCategories(categoryId:number):void{
    this.categoryService.getAllCategories().subscribe((allCategories)=>{
      const subCats = allCategories.filter((cat)=> cat.parent === categoryId)
      this.subcategories = [];

      subCats.forEach((subcat)=>{
        this.productService.getProductsByCategoryId(subcat.id).pipe(
          map((products)=> products.length)
        ).subscribe((count)=>{
          this.subcategories.push({category:subcat, productCount:count})
          this.cdr.detectChanges();
        })
      })
    })
  } 



  getSubCategoryRoute(category:Category):string[]{
    const currentUrl = this.route.snapshot.url.map(segmant=> segmant.path).join('/')
    const currentSements = currentUrl.split('/').filter(segment => segment && segment !== 'products')

    const newSegments = [...currentSements, category.slug].filter((item,index,self)=>
    index === self.lastIndexOf(item))

    return ['/', ...newSegments]
  }


  

  onSubcategoryClick(category:Category){
    const newPath = this.getSubCategoryRoute(category)
    this.router.navigate(newPath).then(()=>{
      console.log('Navigated to subcategory: ', newPath)
    })
  }
}
