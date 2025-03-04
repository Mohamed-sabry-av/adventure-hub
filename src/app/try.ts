<nav class="navbar">
  <ul class="nav-list">
    <!-- Main Categories -->
    <li class="nav-item" *ngFor="let category of mainCategories">
      <a class="nav-link" [routerLink]="getCategoryRoute(category)">
        {{ category.name }}
      </a>

      <!-- Mega Menu -->
      <div class="mega-menu" *ngIf="getSubCategories(category.id).length > 0">
        <div class="menu-container">
          <!-- Subcategories -->
          <div class="menu-column" *ngFor="let sub of getSubCategories(category.id)">
            <h4 class="subcategory-title">
              <a [routerLink]="getCategoryRoute(sub)">
                {{ sub.name }}
              </a>
            </h4>
            <ul class="subcategory-list">
              <li *ngFor="let subSub of getSubCategories(sub.id)">
                <a 
                  [ngClass]="{
                    'has-children': getSubCategories(subSub.id).length > 0, 
                    'subsubsub-link': getSubCategories(subSub.id).length == 0
                  }" 
                  [routerLink]="getCategoryRoute(subSub)">
                  {{ subSub.name }}
                </a>
            
                <ul class="subsubcategory-list" *ngIf="getSubCategories(subSub.id).length > 0">
                  <li *ngFor="let subSubSub of getSubCategories(subSub.id)">
                    <a class="subsubsub-link" [routerLink]="getCategoryRoute(subSubSub)">
                      {{ subSubSub.name }}
                    </a>
                  </li>
                </ul>
              </li>
            </ul>
            
          </div>
        </div>
      </div>
    </li>

    <!-- SALE Section -->
    <li class="nav-item sale-item">
      <a class="sale-link">SALE!</a>
    </li>
  </ul>
</nav>




<!-- Hamburger Button (للشاشات الصغيرة) -->
<button class="btn  d-lg-none" 
        type="button" 
        data-bs-toggle="offcanvas" 
        data-bs-target="#sidebar">
        <i class="bi bi-list menu-btn"></i>
      </button>

<!-- Mobile Sidebar (للشاشات الصغيرة) -->
<!-- Mobile Sidebar (للشاشات الصغيرة) -->
<div class="offcanvas offcanvas-start d-lg-none" 
     tabindex="-1" 
     id="sidebar"
     data-bs-scroll="true">
  <div class="offcanvas-header">
    <h5 class="offcanvas-title">{{ currentMenuTitle }}</h5>
    <button *ngIf="showBackButton" 
            type="button" 
            class="btn btn-secondary btn-sm"
            (click)="goBack()">
      <i class="fas fa-arrow-left"></i> Back
    </button>
    <button type="button" 
            class="btn-close" 
            data-bs-dismiss="offcanvas"></button>
  </div>
  <div class="offcanvas-body">
    <ul class="nav flex-column">
      <!-- Main Categories -->
      <ng-container *ngIf="!showSubcategories">
        <li class="nav-item" *ngFor="let category of mainCategories">
          <a class="nav-link" 
             (click)="showSubcategoriesFor(category)">
            {{ category.name }}
            <i *ngIf="getSubCategories(category.id).length > 0" 
               class="fas fa-chevron-down float-end"></i>
          </a>
        </li>
      </ng-container>

      <!-- Subcategories -->
      <ng-container *ngIf="showSubcategories">
        <li class="nav-item" *ngFor="let sub of currentSubcategories">
          <a class="nav-link" 
             [routerLink]="getCategoryRoute(sub)">
            {{ sub.name }}
          </a>
        </li>
      </ng-container>

      <!-- SALE Section -->
      <li class="nav-item">
        <a class="nav-link text-danger">
          <i class="fas fa-tag me-2"></i>
          SALE!
        </a>
      </li>
    </ul>
  </div>
</div>ه