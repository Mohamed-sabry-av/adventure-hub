import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, forkJoin } from 'rxjs';
import { LocalStorageService } from './local-storage.service';
import { ProductService } from './product.service';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class RelatedProductsService {
  private readonly STORAGE_KEY = 'relatedProductsIds';
  private readonly MAX_STORED_IDS = 100; // الحد الأقصى لعدد الـIDs التي سيتم تخزينها
  private readonly MAX_RELATED_IDS_PER_PRODUCT = 30; // الحد الأقصى لعدد الـIDs المخزنة لكل منتج

  // خاص بالمنتجات ذات الصلة المحملة حالياً
  private relatedProductsSubject = new BehaviorSubject<number[]>([]);

  constructor(
    private localStorageService: LocalStorageService,
    private productService: ProductService
  ) {
    this.loadFromLocalStorage();
    this.pruneOldEntries(); // تنظيف القائمة عند بدء التشغيل
  }

  /**
   * الحصول على المنتجات ذات الصلة كـ Observable
   */
  get relatedProductsIds$(): Observable<number[]> {
    return this.relatedProductsSubject.asObservable();
  }

  /**
   * Get in-stock related products by IDs
   * @param productIds Array of product IDs to check
   * @param count Maximum number of products to return
   * @returns Observable of in-stock product IDs
   */
  getInStockProductIds(productIds: number[], count: number = 12): Observable<number[]> {
    if (!productIds || productIds.length === 0) {
      return of([]);
    }

    // Get products in batches to avoid overloading the API
    const batchSize = 20;
    const batches: Observable<any[]>[] = [];
    
    for (let i = 0; i < productIds.length; i += batchSize) {
      const batchIds = productIds.slice(i, i + batchSize);
      batches.push(
        this.productService.getProductsByIds(batchIds).pipe(
          map(products => products.filter(p => 
            p.stock_status === 'instock' && 
            (p.variations?.length === 0 || p.variations?.some(v => v.stock_status === 'instock'))
          )),
          catchError(() => of([]))
        )
      );
    }

    return forkJoin(batches).pipe(
      map(batchResults => {
        const allInStockProducts = batchResults.flat();
        return this.shuffleArray(allInStockProducts)
          .slice(0, count)
          .map(product => product.id);
      }),
      catchError(() => of([]))
    );
  }

  /**
   * إضافة مجموعة من الـ IDs الخاصة بالمنتجات ذات الصلة
   * @param productId ID المنتج الحالي
   * @param relatedIds مصفوفة الـ IDs ذات الصلة
   */
  addRelatedIds(productId: number, relatedIds: number[]): void {
    if (!productId || !relatedIds || relatedIds.length === 0) return;

    // استبعاد المنتج الحالي من القائمة إذا كان موجوداً في الـ related_ids
    const filteredIds = relatedIds.filter(id => id !== productId);
    if (filteredIds.length === 0) return;

    // الحصول على القائمة الحالية
    const storedData = this.localStorageService.getItem<Record<string, number[]>>(this.STORAGE_KEY) || {};

    // إضافة أو تحديث الـ IDs الخاصة بالمنتج
    // تحديث القائمة الحالية أو إنشاء قائمة جديدة إذا لم تكن موجودة
    const existingIds = storedData[productId.toString()] || [];

    // دمج القوائم وإزالة التكرار
    const mergedIds = [...new Set([...existingIds, ...filteredIds])];

    // التأكد من عدم تجاوز الحد الأقصى لكل منتج
    const limitedIds = mergedIds.slice(0, this.MAX_RELATED_IDS_PER_PRODUCT);

    // تخزين القائمة المحدثة
    storedData[productId.toString()] = limitedIds;

    // تحديث القائمة في localStorage
    this.localStorageService.setItem(this.STORAGE_KEY, storedData);

    // تنظيف القائمة إذا كانت كبيرة جدًا
    this.pruneOldEntries();

    // تحديث الـ BehaviorSubject
    this.relatedProductsSubject.next(this.getAllRelatedIds());
  }

  /**
   * الحصول على الـ IDs ذات الصلة بمنتج معين مباشرة دون معالجة
   * @param productId ID المنتج
   * @returns المنتجات ذات الصلة المباشرة
   */
  getDirectRelatedIds(productId: number): number[] {
    if (!productId) return [];

    const storedData = this.localStorageService.getItem<Record<string, number[]>>(this.STORAGE_KEY) || {};

    // الحصول على الـ IDs ذات الصلة بهذا المنتج بشكل مباشر
    const relatedIds = storedData[productId.toString()] || [];

    // استبعاد المنتج نفسه للتأكد
    return relatedIds.filter(id => id !== productId);
  }

  /**
   * الحصول على كل الـ IDs ذات الصلة المخزنة
   * @returns مصفوفة من كل الـ IDs المخزنة
   */
  getAllRelatedIds(): number[] {
    const storedData = this.localStorageService.getItem<Record<string, number[]>>(this.STORAGE_KEY) || {};

    // دمج كل الـ IDs من كل المنتجات في مصفوفة واحدة
    const allIds = Object.values(storedData).flat();

    // إزالة التكرار
    const uniqueIds = [...new Set(allIds)];

    // ترتيب المصفوفة بشكل عشوائي
    return this.shuffleArray(uniqueIds);
  }

  /**
   * الحصول على عدد محدد من الـ IDs العشوائية من القائمة المخزنة
   * @param count عدد الـ IDs المطلوبة
   * @param excludeIds ID أو مصفوفة من الـ IDs التي يجب استبعادها
   * @returns مصفوفة من الـ IDs العشوائية
   */
  getRandomRelatedIds(count: number = 8, excludeIds?: number | number[]): number[] {
    const allIds = this.getAllRelatedIds();

    // استبعاد المنتج المحدد أو المنتجات المحددة
    let filteredIds = allIds;
    if (excludeIds) {
      const idsToExclude = Array.isArray(excludeIds) ? excludeIds : [excludeIds];
      filteredIds = allIds.filter(id => !idsToExclude.includes(id));
    }

    // إذا كان العدد المطلوب أكبر من عدد الـ IDs المتاحة، نعيد كل المصفوفة
    if (count >= filteredIds.length) {
      return filteredIds;
    }

    // اختيار عدد معين من العناصر بشكل عشوائي
    return this.shuffleArray(filteredIds).slice(0, count);
  }

  /**
   * الحصول على الـ IDs ذات الصلة بمنتج معين مع خيار الجمع مع IDs أخرى عشوائية
   * @param productId ID المنتج
   * @param count عدد الـ IDs المطلوبة
   * @param includeRandom تحديد ما إذا كان يجب تضمين IDs عشوائية إذا لم يكن هناك ما يكفي من IDs ذات الصلة
   * @returns مصفوفة من الـ IDs ذات الصلة بالمنتج
   */
  getRelatedIdsForProduct(productId: number, count: number = 8, includeRandom: boolean = true): number[] {
    if (!productId) return [];

    const storedData = this.localStorageService.getItem<Record<string, number[]>>(this.STORAGE_KEY) || {};
    const productRelatedIds = storedData[productId.toString()] || [];

    // تجنب استرجاع المنتج نفسه
    const filteredIds = productRelatedIds.filter(id => id !== productId);

    // إذا كان لدينا IDs كافية، نختار منها بشكل عشوائي
    if (filteredIds.length >= count) {
      return this.shuffleArray([...filteredIds]).slice(0, count);
    }

    // إذا طلب المستخدم تضمين IDs عشوائية وليس لدينا ما يكفي
    if (includeRandom) {
      // إذا لم يكن لدينا IDs كافية، نكمل من الـ IDs الأخرى
      const neededCount = count - filteredIds.length;
      const otherIds = this.getRandomRelatedIds(neededCount, productId);

      // دمج القوائم وإزالة التكرار
      return [...new Set([...filteredIds, ...otherIds])];
    }

    // إذا لم يطلب المستخدم تضمين IDs عشوائية، نعيد ما لدينا فقط
    return filteredIds;
  }

  /**
   * الحصول على المنتجات ذات الصلة الأكثر شيوعًا
   * @param count عدد الـ IDs المطلوبة
   * @param excludeId ID المنتج الذي يجب استبعاده
   * @returns مصفوفة من الـ IDs الأكثر شيوعًا
   */
  getMostCommonRelatedIds(count: number = 8, excludeId?: number): number[] {
    const storedData = this.localStorageService.getItem<Record<string, number[]>>(this.STORAGE_KEY) || {};

    // إنشاء قاموس لتسجيل عدد مرات ظهور كل ID
    const idFrequency: Record<number, number> = {};

    // حساب عدد مرات ظهور كل ID
    Object.values(storedData).flat().forEach(id => {
      if (id !== excludeId) {
        idFrequency[id] = (idFrequency[id] || 0) + 1;
      }
    });

    // تحويل القاموس إلى مصفوفة وترتيبها تنازليًا حسب عدد مرات الظهور
    const sortedIds = Object.entries(idFrequency)
      .sort((a, b) => b[1] - a[1])  // ترتيب تنازلي
      .map(entry => parseInt(entry[0]));  // استخراج الـ ID كرقم

    // إعادة العدد المطلوب من الـ IDs
    return sortedIds.slice(0, count);
  }

  /**
   * تنظيف وإزالة المدخلات القديمة إذا تجاوز العدد الإجمالي الحد الأقصى
   */
  private pruneOldEntries(): void {
    const storedData = this.localStorageService.getItem<Record<string, number[]>>(this.STORAGE_KEY) || {};
    const totalEntries = Object.keys(storedData).length;

    // التحقق مما إذا كان العدد الإجمالي يتجاوز الحد الأقصى
    if (totalEntries > this.MAX_STORED_IDS) {
      // الحصول على قائمة بالمفاتيح وترتيبها عشوائيًا
      const keys = Object.keys(storedData);
      const shuffledKeys = this.shuffleArray(keys);

      // إنشاء قاموس جديد مع عدد محدود من المدخلات
      const prunedData: Record<string, number[]> = {};
      shuffledKeys.slice(0, this.MAX_STORED_IDS).forEach(key => {
        prunedData[key] = storedData[key];
      });

      // تحديث القائمة في localStorage
      this.localStorageService.setItem(this.STORAGE_KEY, prunedData);

    }
  }

  /**
   * تحميل البيانات من localStorage
   */
  private loadFromLocalStorage(): void {
    try {
      const storedData = this.localStorageService.getItem<Record<string, number[]>>(this.STORAGE_KEY);
      if (storedData) {
        // تحديث الـ BehaviorSubject
        this.relatedProductsSubject.next(this.getAllRelatedIds());
      } else {
        // إذا لم توجد بيانات، نهيئ قاموس فارغ
        this.localStorageService.setItem(this.STORAGE_KEY, {});
      }
    } catch (error) {
      
      // في حالة وجود خطأ، نبدأ مع مصفوفة فارغة
      this.localStorageService.setItem(this.STORAGE_KEY, {});
    }
  }

  /**
   * خلط المصفوفة بشكل عشوائي (خوارزمية Fisher-Yates)
   * @param array المصفوفة المراد خلطها
   * @returns المصفوفة بعد الخلط
   */
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

