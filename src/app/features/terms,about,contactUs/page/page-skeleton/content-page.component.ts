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
            <div [innerHTML]="pageData.content?.rendered"></div>
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
  `,
  styles: [`
    /* Main container styles */
    .content-page-container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 30px 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #333;
      display: flex;
      flex-direction: column;
    }

    /* Page Header styles */
    .page-header {
      margin-bottom: 30px;
      border-bottom: 1px solid #eee;
      padding-bottom: 20px;
    }

    .page-title {
      font-size: 2.5rem;
      margin: 0 0 15px;
      color: #2c3e50;
      font-weight: 600;
      line-height: 1.2;
    }

    .page-meta {
      display: flex;
      gap: 20px;
      font-size: 0.9rem;
      color: #6c757d;
    }

    /* Content body styles */
    .content-body {
      display: flex;
      flex-direction: column;
      gap: 25px;
    }

    /* Featured image */
    .featured-image {
      margin-bottom: 20px;
      text-align: center;
    }

    .featured-image img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
    }

    /* Excerpt styles */
    .page-excerpt {
      margin-bottom: 20px;
    }

    .page-excerpt blockquote {
      padding: 15px 25px;
      background-color: #f8f9fa;
      border-left: 4px solid #3498db;
      margin: 0;
      font-size: 1.1rem;
      line-height: 1.6;
      color: #495057;
      font-style: italic;
      border-radius: 0 4px 4px 0;
    }

    /* Content sections */
    .content-sections {
      display: flex;
      flex-direction: column;
      gap: 25px;
    }

    .section-heading {
      font-size: 1.8rem;
      color: #2c3e50;
      margin-bottom: 15px;
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 8px;
    }

    .section-text {
      font-size: 1.05rem;
      line-height: 1.7;
      color: #333;
      margin: 0;
    }

    /* Image section */
    .image-section {
      text-align: center;
      margin: 20px 0;
    }

    .image-section img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
    }

    .image-caption {
      margin-top: 10px;
      font-size: 0.9rem;
      color: #6c757d;
      font-style: italic;
    }

    /* Tabs section */
    .tab-container {
      border: 1px solid #dee2e6;
      border-radius: 6px;
      overflow: hidden;
      margin: 20px 0;
    }

    .tab-headers {
      display: flex;
      background-color: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }

    .tab-header {
      padding: 12px 20px;
      cursor: pointer;
      border: none;
      background: none;
      font-weight: 500;
      color: #495057;
      flex: 1;
      text-align: center;
      transition: all 0.3s ease;
    }

    .tab-header.active {
      background-color: white;
      color: #3498db;
      border-bottom: 3px solid #3498db;
    }

    .tab-content {
      padding: 20px;
      background-color: white;
    }

    .tab-pane {
      animation: fadeEffect 0.3s;
      line-height: 1.6;
    }

    .tab-pane.hidden {
      display: none;
    }

    @keyframes fadeEffect {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* List section */
    .content-list {
      padding-left: 20px;
      margin: 10px 0;
    }

    .content-list li {
      margin-bottom: 10px;
      line-height: 1.6;
    }

    /* Original content fallback */
    .original-content {
      line-height: 1.7;
    }

    .original-content ::ng-deep p {
      margin-bottom: 20px;
    }

    .original-content ::ng-deep img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 20px 0;
    }

    /* Page navigation */
    .page-navigation {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }

    /* Dropdown menu */
    .dropdown {
      position: relative;
      display: inline-block;
    }

    .dropdown-toggle {
      background-color: #f8f9fa;
      border: 1px solid #dee2e6;
      padding: 10px 15px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.95rem;
      transition: background-color 0.2s;
    }

    .dropdown-toggle:hover {
      background-color: #e9ecef;
    }

    .dropdown-menu {
      display: none;
      position: absolute;
      background-color: white;
      min-width: 200px;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
      z-index: 1;
      border-radius: 4px;
      margin-top: 5px;
    }

    .dropdown:hover .dropdown-menu {
      display: block;
    }

    .dropdown-menu a {
      display: block;
      padding: 10px 15px;
      text-decoration: none;
      color: #495057;
      transition: background-color 0.2s;
    }

    .dropdown-menu a:hover {
      background-color: #f8f9fa;
      color: #3498db;
    }

    /* Share buttons */
    .share-buttons {
      display: flex;
      gap: 10px;
    }

    .share-btn, .print-btn {
      padding: 10px 15px;
      border: none;
      border-radius: 4px;
      font-size: 0.95rem;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .share-btn {
      background-color: #3498db;
      color: white;
    }

    .share-btn:hover {
      background-color: #2980b9;
    }

    .print-btn {
      background-color: #f8f9fa;
      color: #495057;
      border: 1px solid #dee2e6;
    }

    .print-btn:hover {
      background-color: #e9ecef;
    }

    /* Skeleton loading styles */
    .skeleton-container {
      display: flex;
      flex-direction: column;
      gap: 30px;
      animation: pulse 1.5s infinite alternate;
    }

    .skeleton-header {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-bottom: 20px;
    }

    .skeleton-title {
      height: 40px;
      background-color: #f0f0f0;
      border-radius: 5px;
      width: 70%;
    }

    .skeleton-meta {
      height: 20px;
      background-color: #f0f0f0;
      border-radius: 5px;
      width: 40%;
    }

    .skeleton-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .skeleton-image {
      height: 300px;
      background-color: #f0f0f0;
      border-radius: 8px;
      width: 100%;
    }

    .skeleton-paragraph {
      height: 20px;
      background-color: #f0f0f0;
      border-radius: 5px;
      width: 100%;
    }

    @keyframes pulse {
      0% {
        opacity: 0.6;
      }
      100% {
        opacity: 1;
      }
    }

    /* Responsive styles */
    @media (max-width: 768px) {
      .page-title {
        font-size: 2rem;
      }

      .section-heading {
        font-size: 1.6rem;
      }

      .page-navigation {
        flex-direction: column;
        gap: 15px;
      }

      .skeleton-image {
        height: 200px;
      }
    }

    @media (max-width: 576px) {
      .content-page-container {
        padding: 20px 15px;
      }

      .page-meta {
        flex-direction: column;
        gap: 5px;
      }

      .page-title {
        font-size: 1.8rem;
      }
    }
  `]
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