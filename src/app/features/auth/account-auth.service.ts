import { Injectable } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { BehaviorSubject, catchError, Observable, tap, of, throwError, delay, timer } from 'rxjs';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { LocalStorageService } from '../../core/services/local-storage.service';
import { LoginResponse, User } from '../../interfaces/user.model';

@Injectable({
  providedIn: 'root',
})
export class AccountAuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly USER_ID_KEY = 'customerId'; // مفتاح جديد لتخزين user_id
  private readonly TOKEN_EXPIRY_KEY = 'token_expiry'; // تاريخ انتهاء التوكن
  private readonly Api_Url = 'https://adventures-hub.com';
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  isLoggedIn$ = this.isLoggedInSubject.asObservable();
  private tokenValidationInProgress = false;

  constructor(
    private WooApi: ApiService,
    private http: HttpClient,
    private localStorageService: LocalStorageService
  ) {
    const token = this.localStorageService.getItem<string>(this.TOKEN_KEY);
    const tokenExpiry = this.localStorageService.getItem<number>(this.TOKEN_EXPIRY_KEY);

    // التحقق من صلاحية التوكن محليًا أولاً (من خلال تاريخ الانتهاء)
    if (token && tokenExpiry && tokenExpiry > Date.now()) {
      this.isLoggedInSubject.next(true);
    } else if (token) {
      // إذا كان لدينا توكن ولكن لا نعرف متى ينتهي أو انتهت صلاحيته، سنتحقق من الخادم
      // لكن سنعطي قيمة مبدئية true لتجنب التأخير في واجهة المستخدم
      this.isLoggedInSubject.next(true);
    } else {
      this.isLoggedInSubject.next(false);
    }

    // تأخير التحقق من التوكن من الخادم
    timer(300).subscribe(() => this.verifyTokenOnInit());
  }

  verifyToken(silent: boolean = false): Observable<any> {
    const token = this.getToken();
    if (!token) {
      this.isLoggedInSubject.next(false);
      return silent ? of({ valid: false }) : throwError(() => new Error('No token found'));
    }

    // التحقق من تاريخ انتهاء التوكن المخزن محليًا
    const tokenExpiry = this.localStorageService.getItem<number>(this.TOKEN_EXPIRY_KEY);
    if (tokenExpiry && tokenExpiry > Date.now()) {
      // التوكن لا يزال صالحًا محليًا، لا داعي للتحقق من الخادم
      this.isLoggedInSubject.next(true);
      return of({ valid: true, code: 'jwt_auth_valid_token' });
    }

    // إذا كانت عملية التحقق جارية بالفعل، قم بإرجاع خطأ أو نتيجة فارغة
    if (this.tokenValidationInProgress) {
      return silent ? of({ valid: false, message: 'Validation in progress' }) : throwError(() => new Error('Token validation already in progress'));
    }

    this.tokenValidationInProgress = true;

    return this.http
      .post(
        `${this.Api_Url}/wp-json/jwt-auth/v1/token/validate`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .pipe(
        tap((response: any) => {
          if (response.code === 'jwt_auth_valid_token') {
            this.isLoggedInSubject.next(true);
            // حفظ تاريخ انتهاء التوكن (1 يوم من الآن)
            const expiryTime = Date.now() + (24 * 60 * 60 * 1000);
            this.localStorageService.setItem(this.TOKEN_EXPIRY_KEY, expiryTime);
          } else {
            this.logout();
          }
          this.tokenValidationInProgress = false;
        }),
        catchError((error) => {
          console.error('Token verification failed:', error);
          this.tokenValidationInProgress = false;
          this.logout();
          return silent ? of({ valid: false, error }) : throwError(() => error);
        })
      );
  }

  private verifyTokenOnInit(): void {
    const token = this.getToken();
    if (token) {
      const tokenExpiry = this.localStorageService.getItem<number>(this.TOKEN_EXPIRY_KEY);

      // إذا كان التوكن صالحًا محليًا، لا داعي للتحقق من الخادم
      if (tokenExpiry && tokenExpiry > Date.now()) {
        console.log('Token is valid (local check)');
        this.isLoggedInSubject.next(true);
        return;
      }

      this.verifyToken(true).subscribe({
        next: (response) => {
          if (response && response.valid === false) {
            console.log('Token is invalid or expired');
            this.isLoggedInSubject.next(false);
          } else {
            console.log('Token is valid');
          }
        },
        error: () => {
          console.log('Token is invalid or expired');
          this.isLoggedInSubject.next(false);
        },
      });
    } else {
      this.isLoggedInSubject.next(false);
    }
  }

  login(credentials: {
    email?: string;
    username?: string;
    password: string;
  }): Observable<HttpResponse<LoginResponse>> {
    return this.http
      .post<LoginResponse>(
        `${this.Api_Url}/wp-json/jwt-auth/v1/token`,
        credentials,
        {
          withCredentials: true,
          observe: 'response',
        }
      )
      .pipe(
        tap((response: HttpResponse<LoginResponse>) => {
          console.log('Cookies from response:', response.headers.get('Set-Cookie'));
          if (response.body?.token) {
            this.localStorageService.setItem(this.TOKEN_KEY, response.body.token);
            this.localStorageService.setItem(this.USER_KEY, {
              username:
                response.body.user_username ||
                credentials.username ||
                credentials.email ||
                '',
              email: response.body.user_email || '',
            });
            // خزّن user_id
            if (response.body.user_id) {
              this.localStorageService.setItem(this.USER_ID_KEY, response.body.user_id.toString());
            }

            // حفظ تاريخ انتهاء التوكن (1 يوم من الآن)
            const expiryTime = Date.now() + (24 * 60 * 60 * 1000);
            this.localStorageService.setItem(this.TOKEN_EXPIRY_KEY, expiryTime);

            this.isLoggedInSubject.next(true);
          }
        }),
        catchError((error) => {
          console.error('Login failed:', error);
          throw error;
        })
      );
  }

  getCart(): Observable<HttpResponse<any>> {
    return this.http
      .get(`${this.Api_Url}/wp-json/wc/store/v1/cart`, {
        withCredentials: true,
        observe: 'response',
      })
      .pipe(
        tap((response) =>
          console.log('Cart Cookies:', response.headers.get('Set-Cookie'))
        )
      );
  }

  signup(userData: {
    username: string;
    email: string;
    password: string;
  }): Observable<any> {
    return this.WooApi.postRequest('customers', userData).pipe(
      tap((response) => {
        console.log('SignUp successfully');
      }),
      catchError((error) => {
        console.log('signUp failed', error);
        throw error;
      })
    );
  }

  logout(): void {
    this.localStorageService.removeItem(this.TOKEN_KEY);
    this.localStorageService.removeItem(this.USER_KEY);
    this.localStorageService.removeItem(this.USER_ID_KEY); // امسح user_id
    this.localStorageService.removeItem(this.TOKEN_EXPIRY_KEY); // امسح تاريخ انتهاء التوكن
    this.isLoggedInSubject.next(false);
  }

  getToken(): string | null {
    return this.localStorageService.getItem<string>(this.TOKEN_KEY);
  }

  getUser(): User | null {
    return this.localStorageService.getItem<User>(this.USER_KEY);
  }

  getUserId(): string | null {
    return this.localStorageService.getItem<string>(this.USER_ID_KEY);
  }

  isLoggedIn(): boolean {
    return this.isLoggedInSubject.value;
  }
}
