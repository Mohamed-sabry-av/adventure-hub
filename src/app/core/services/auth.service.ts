import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { HandleErrorsService } from './handel-errors.service';
import { BehaviorSubject, catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // لم نعد نحتاج لمفاتيح API في خدمة المصادقة
  // private consumerKey: string = '';
  // private consumerSecret: string = '';
  private configService = inject(ConfigService);
  private http = inject(HttpClient);
  private handelErrorService = inject(HandleErrorsService);
  private authReady = new BehaviorSubject<boolean>(true); // دائماً جاهز الآن

  constructor() {
    // لم نعد نحتاج لتحميل مفاتيح API من التكوين
    // تحميل بيانات المستخدم الحالي إذا كانت موجودة
    this.loadUserData();
    
    // الاشتراك في تغييرات التكوين للتأكد من تحميل المعلومات الضرورية للمستخدم
    this.configService.getConfig().subscribe(config => {
      if (config) {
        // هنا يمكن الحصول على معلومات التكوين العامة إذا كانت ضرورية
        console.log('Auth service received application config');
      }
    });
  }

  // تحميل بيانات المستخدم من localStorage إذا كانت موجودة
  private loadUserData(): void {
    try {
      // هنا يمكن إضافة منطق تحميل بيانات المستخدم مثل رمز الدخول
    } catch (error) {
      console.error('Error loading user data', error);
    }
  }

  // لم نعد نحتاج لهذه الطريقة، لكن نبقيها للتوافق الخلفي
  // وتعيد هيدرز عادية بدون مفاتيح API
  getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
    });
  }
  
  // طريقة للتحقق من جاهزية المصادقة - دائمًا جاهزة الآن
  isAuthReady(): Observable<boolean> {
    return this.authReady.asObservable();
  }
  
  // يمكن إضافة طرق للتسجيل والخروج وإدارة حسابات المستخدمين هنا
  // مثل login(), logout(), register()، إلخ
}