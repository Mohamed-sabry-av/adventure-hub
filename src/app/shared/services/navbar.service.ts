import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NavbarService {
  // الحالات المختلفة للنافبار
  sideNavIsVisible$ = new BehaviorSubject<boolean>(false);
  searcBarIsVisible$ = new BehaviorSubject<boolean>(false);
  navbarIsVisible$ = new BehaviorSubject<boolean>(true);
  headerHeight$ = new BehaviorSubject<number>(88);
  isNavbarAnimating$ = new BehaviorSubject<boolean>(false);
  isDrawerOpen$ = new BehaviorSubject<boolean>(false);

  // تبديل حالة القائمة الجانبية
  siwtchSideNav(visible: boolean) {
    this.sideNavIsVisible$.next(visible);
    this.isDrawerOpen$.next(visible);

    // التحكم في تمرير الصفحة عند فتح القائمة
    document.body.style.overflow = visible ? 'hidden' : 'auto';

    // إزالة الخلفية الشفافة عند إغلاق القائمة
    if (!visible) {
      setTimeout(() => {
        const backdrops = document.querySelectorAll('.p-component-overlay');
        backdrops.forEach(backdrop => {
          (backdrop as HTMLElement).style.display = 'none';
        });
      }, 300);
    }
  }

  // التعامل مع تمرير الصفحة
  handleScroll(headerHeight: number) {
    this.headerHeight$.next(headerHeight);
  }

  // إظهار / إخفاء شريط البحث
  showSearchBar(isVisible: boolean) {
    this.searcBarIsVisible$.next(isVisible);
  }

  // إظهار / إخفاء شريط التنقل
  showNavbar(isVisible: boolean) {
    if (this.navbarIsVisible$.value !== isVisible) {
      this.isNavbarAnimating$.next(true);
      this.navbarIsVisible$.next(isVisible);
      setTimeout(() => {
        this.isNavbarAnimating$.next(false);
      }, 300); // تطابق مدة الحركة
    }
  }

  // الحصول على حالة عرض القائمة الجانبية
  getSideNavIsVisible$() {
    return this.sideNavIsVisible$.asObservable();
  }

  // الحصول على حالة عرض شريط البحث
  getSearchBarIsVisible$() {
    return this.searcBarIsVisible$.asObservable();
  }

  // الحصول على حالة عرض شريط التنقل
  getNavbarIsVisible$() {
    return this.navbarIsVisible$.asObservable();
  }

  // الحصول على ارتفاع الهيدر
  getHeaderHeight$() {
    return this.headerHeight$.asObservable();
  }

  // الحصول على حالة فتح القائمة الجانبية
  getIsDrawerOpen$() {
    return this.isDrawerOpen$.asObservable();
  }

  // الحصول على حالة حركة شريط التنقل
  getIsNavbarAnimating$() {
    return this.isNavbarAnimating$.asObservable();
  }
}
