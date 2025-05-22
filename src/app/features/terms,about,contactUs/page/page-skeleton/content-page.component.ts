import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DecodeHtmlPipe } from '../../../../shared/pipes/decode-html.pipe';
import { animate, style, transition, trigger } from '@angular/animations';
import { SafeHtml } from '@angular/platform-browser';
import { ParsedPageContent } from '../../service/content-pages.service';

@Component({
  selector: 'app-content-page',
  standalone: true,
  imports: [CommonModule, DecodeHtmlPipe],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('100ms ease-in', style({ opacity: 1 })),
      ]),
    ]),
    trigger('fadeInUp', [
      transition(':enter', [
        style({ transform: 'translateY(5px)', opacity: 0 }),
        animate('150ms ease-out', style({ transform: 'translateY(0)', opacity: 1 })),
      ]),
    ]),
  ],
  styleUrls: ['./content-page.styles.css'],
  template: `
    <!-- SEO Schema Data -->
    <ng-container *ngIf="schemaData">
      <script type="application/ld+json" [innerHTML]="schemaData"></script>
    </ng-container>

    <div class="content-page-container" [ngClass]="pageClass">
      <!-- Skeleton Loading State -->
      <div *ngIf="isLoading" class="skeleton-container">
        <div class="skeleton-header">
          <div class="skeleton-title"></div>
          <div class="skeleton-meta"></div>
        </div>
        <div class="skeleton-content">
          <div class="skeleton-image"></div>
          <div class="skeleton-paragraph"></div>
          <div class="skeleton-paragraph" style="width: 85%"></div>
          <div class="skeleton-paragraph" style="width: 70%"></div>
        </div>
      </div>

      <!-- Actual Content When Loaded -->
      <div *ngIf="!isLoading && pageData" class="content-wrapper" @fadeIn>
        <!-- Page Header -->
        <div class="page-header">
          <h1 class="page-title" @fadeInUp>{{ pageData.title?.rendered | decodeHtml }}</h1>
          <div class="page-meta">
            <span class="meta-date">{{ formatDate(pageData.date) }}</span>
            <span *ngIf="pageData.modified && pageData.modified !== pageData.date" class="meta-updated">
              Last updated: {{ formatDate(pageData.modified) }}
            </span>
          </div>
        </div>

        <!-- Main Content Area -->
        <div class="content-body">
          <!-- Featured Image -->
          <div *ngIf="pageData.parsedContent?.images?.length > 0" class="featured-image" @fadeInUp>
            <img [src]="pageData.parsedContent.images[0]" alt="Featured image" />
          </div>

          <!-- Excerpt Block -->
          <div *ngIf="pageData.excerpt?.rendered" class="page-excerpt" @fadeInUp>
            <blockquote [innerHTML]="pageData.excerpt.rendered | decodeHtml"></blockquote>
          </div>

          <!-- Structured Content Sections -->
          <div class="content-sections">
            <ng-container *ngFor="let section of pageData.parsedContent?.sections; let i = index">
              <!-- Text Section -->
              <div *ngIf="section.type === 'text'" class="text-section" @fadeInUp>
                <h2 *ngIf="section.heading" class="section-heading">{{ section.heading }}</h2>
                <p class="section-text">{{ section.content }}</p>
              </div>

              <!-- Image Section -->
              <div *ngIf="section.type === 'image' && section.imageUrl" class="image-section" @fadeInUp>
                <img [src]="section.imageUrl" [alt]="section.content" />
                <p *ngIf="section.content" class="image-caption">{{ section.content }}</p>
              </div>

              <!-- Tabs Section -->
              <div *ngIf="section.type === 'tabs' && section.tabsData?.length" class="tabs-section" @fadeInUp>
                <div class="tab-container">
                  <div class="tab-headers">
                    <button *ngFor="let tab of section.tabsData; let tabIndex = index" 
                           class="tab-header" 
                           [class.active]="selectedTab === tabIndex"
                           (click)="selectedTab = tabIndex">
                      {{ tab.title }}
                    </button>
                  </div>
                  <div class="tab-content">
                    <div *ngFor="let tab of section.tabsData; let tabIndex = index" 
                         [class.hidden]="selectedTab !== tabIndex"
                         class="tab-pane">
                      {{ tab.content }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- List Section -->
              <div *ngIf="section.type === 'list' && section.listItems?.length" class="list-section" @fadeInUp>
                <ul class="content-list">
                  <li *ngFor="let item of section.listItems">{{ item }}</li>
                </ul>
              </div>
            </ng-container>
          </div>

          <!-- Fallback to original content if parsing failed -->
          <div *ngIf="!pageData.parsedContent?.sections || pageData.parsedContent.sections.length === 0" 
               class="original-content" @fadeInUp>
            <div [innerHTML]="pageData.content?.rendered | decodeHtml"></div>
          </div>

          <!-- Page navigation -->
          <div class="page-navigation">
            <div class="dropdown">
              <button class="dropdown-toggle">More Pages</button>
              <div class="dropdown-menu">
                <a href="/about-us">About Us</a>
                <a href="/terms">Terms & Conditions</a>
                <a href="/Cookies-Policy">Cookies Policy</a>
                <a href="/return-Policy">Return Policy</a>
                <a href="/contact-us">Contact Us</a>
              </div>
            </div>
            <div class="share-buttons">
              <button class="share-btn">Share</button>
              <button class="print-btn" (click)="printPage()">Print</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ContentPageComponent {
  @Input() pageData: any;
  @Input() schemaData: SafeHtml | null = null;
  @Input() isLoading = true;
  @Input() pageClass = '';
  
  selectedTab = 0;

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    };
    
    return date.toLocaleDateString('en-US', options);
  }

  printPage(): void {
    window.print();
  }
} 