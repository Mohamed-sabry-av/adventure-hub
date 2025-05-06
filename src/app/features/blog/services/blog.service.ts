import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { CacheService } from '../../../core/services/cashing.service';

export interface BlogPost {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  date: string;
  slug: string;
  link: string;
  yoast_head_json: {
    og_image: { url: string }[]
  };
}

@Injectable({ providedIn: 'root' })
export class BlogService {
  private httpClient = inject(HttpClient);
  private apiService = inject(ApiService);
  private cacheService = inject(CacheService);

  blogData$ = new BehaviorSubject<BlogPost[]>([]);
  private cacheTimeMs = 60 * 60 * 1000; // 1 hour cache

  constructor() {
    // جلب المنشورات عند تهيئة الخدمة
    this.getPosts();
  }

  getPosts(page: number = 1, perPage: number = 10): void {
    const cacheKey = `blog_posts_page_${page}_per_${perPage}`;

    // محاولة استعادة من ذاكرة التخزين المؤقت أولاً
    const cachedData = this.getFromLocalCache(cacheKey);
  

    // تحديث البيانات من الخادم بغض النظر عن وجود بيانات مخزنة مؤقتًا
    this.httpClient
      .get<BlogPost[]>(`https://adventures-hub.com/wp-json/wp/v2/posts`, {
        params: new HttpParams()
          .set(
            '_fields',
            'content,date,excerpt,id,link,title,yoast_head_json,slug'
          )
          .set('page', page.toString())
          .set('per_page', perPage.toString()),
      })
      .pipe(
        catchError(error => {
          console.error('Error fetching posts:', error);
          return of([]);
        })
      )
      .subscribe((response: BlogPost[]) => {
        this.blogData$.next(response);
        this.saveToLocalCache(cacheKey, response);
      });
  }

  getLatestPosts(count: number = 4): Observable<BlogPost[]> {
    const cacheKey = `latest_blog_posts_${count}`;



    return this.httpClient
      .get<BlogPost[]>(`https://adventures-hub.com/wp-json/wp/v2/posts`, {
        params: new HttpParams()
          .set(
            '_fields',
            'content,date,excerpt,id,link,title,yoast_head_json,slug'
          )
          .set('page', '1')
          .set('per_page', count.toString()),
      })
      .pipe(
        tap(posts => this.saveToLocalCache(cacheKey, posts)),
        catchError(error => {
          console.error('Error fetching latest posts:', error);
          return of(this.getFallbackPosts().slice(0, count));
        })
      );
  }

  getPostBySlug(slug: string): Observable<BlogPost | null> {
    const cacheKey = `blog_post_${slug}`;



    return this.httpClient
      .get<BlogPost[]>(`https://adventures-hub.com/wp-json/wp/v2/posts`, {
        params: new HttpParams()
          .set(
            '_fields',
            'content,date,excerpt,id,link,title,yoast_head_json,slug'
          )
          .set('slug', slug),
      })
      .pipe(
        map(posts => posts.length > 0 ? posts[0] : null),
        tap(post => {
          if (post) {
            this.saveToLocalCache(cacheKey, post);
          }
        }),
        catchError(error => {
          console.error(`Error fetching post with slug ${slug}:`, error);
          return of(null);
        })
      );
  }

  private getFromLocalCache<T>(key: string): T | null {
    try {
      const cachedString = localStorage.getItem(key);
      if (!cachedString) return null;

      const cached = JSON.parse(cachedString);
      const now = new Date().getTime();

      if (cached.expiry && cached.expiry > now) {
        return cached.data;
      }

      // تنظيف البيانات القديمة
      localStorage.removeItem(key);
      return null;
    } catch (e) {
      console.error('Error retrieving from cache:', e);
      return null;
    }
  }

  private saveToLocalCache<T>(key: string, data: T): void {
    try {
      const expiry = new Date().getTime() + this.cacheTimeMs;
      const cacheObj = { data, expiry };
      localStorage.setItem(key, JSON.stringify(cacheObj));
    } catch (e) {
      console.error('Error saving to cache:', e);
    }
  }

  // بيانات احتياطية في حالة فشل جلب المنشورات
  private getFallbackPosts(): BlogPost[] {
    return [
      {
        id: 1,
        title: { rendered: 'Top 5 Hiking Trails in The Mountains' },
        excerpt: { rendered: '<p>Discover the most beautiful hiking trails that offer breathtaking views and unforgettable experiences...</p>' },
        content: { rendered: '<p>Hiking in the mountains offers some of the most rewarding outdoor experiences. Here are our top 5 favorite trails that every outdoor enthusiast should try.</p><h2>1. Pacific Crest Trail</h2><p>The Pacific Crest Trail spans 2,650 miles from Mexico to Canada through California, Oregon, and Washington. It reveals the beauty of the desert, unfolds the glaciated expanses of the Sierra Nevada, and provides commanding vistas of volcanic peaks in the Cascade Range.</p>' },
        date: new Date().toISOString(),
        slug: 'top-hiking-trails',
        link: '/top-hiking-trails',
        yoast_head_json: {
          og_image: [{ url: 'https://images.unsplash.com/photo-1551632811-561732d1e306?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8aGlraW5nfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60' }]
        }
      },
      {
        id: 2,
        title: { rendered: 'Essential Camping Gear for Your Next Adventure' },
        excerpt: { rendered: '<p>Planning your next camping trip? Here are the essential items you should never leave behind...</p>' },
        content: { rendered: '<p>Whether you\'re a seasoned camper or planning your first outdoor adventure, having the right gear is crucial for a safe and comfortable experience.</p><h2>Shelter</h2><p>A good quality tent is your first line of defense against the elements. Look for one that\'s appropriate for the season and easily accommodates all members of your party.</p>' },
        date: new Date().toISOString(),
        slug: 'essential-camping-gear',
        link: '/essential-camping-gear',
        yoast_head_json: {
          og_image: [{ url: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y2FtcGluZ3xlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60' }]
        }
      },
      {
        id: 3,
        title: { rendered: 'Winter Gear: How to Stay Warm and Safe' },
        excerpt: { rendered: '<p>When temperatures drop, having the right gear becomes crucial. Learn how to prepare for winter adventures...</p>' },
        content: { rendered: '<p>Winter outdoor activities require special preparation and equipment to ensure safety and comfort in cold conditions.</p><h2>Layering System</h2><p>The key to staying warm in winter is proper layering. Start with a moisture-wicking base layer to keep sweat away from your skin, add an insulating middle layer, and finish with a waterproof and windproof outer shell.</p>' },
        date: new Date().toISOString(),
        slug: 'winter-gear-safety',
        link: '/winter-gear-safety',
        yoast_head_json: {
          og_image: [{ url: 'https://images.unsplash.com/photo-1605540436563-5bca919ae766?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8d2ludGVyJTIwaGlraW5nfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60' }]
        }
      },
      {
        id: 4,
        title: { rendered: 'Sustainable Outdoor Practices: Leave No Trace' },
        excerpt: { rendered: '<p>As outdoor enthusiasts, we have a responsibility to protect nature. Here are the principles of leaving no trace...</p>' },
        content: { rendered: '<p>As more people venture outdoors, it\'s crucial that we all practice responsible recreation to preserve natural areas for future generations.</p><h2>The Seven Principles</h2><p>Leave No Trace is built on seven core principles: Plan ahead and prepare, travel and camp on durable surfaces, dispose of waste properly, leave what you find, minimize campfire impacts, respect wildlife, and be considerate of other visitors.</p>' },
        date: new Date().toISOString(),
        slug: 'sustainable-outdoor-practices',
        link: '/sustainable-outdoor-practices',
        yoast_head_json: {
          og_image: [{ url: 'https://images.unsplash.com/photo-1517021897933-0e0319cfbc28?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8ZWNvJTIwZnJpZW5kbHl8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60' }]
        }
      }
    ];
  }
}
