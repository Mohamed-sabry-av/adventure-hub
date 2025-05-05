import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { LocalStorageService } from './local-storage.service';
import { ProductService } from './product.service';

@Injectable({
  providedIn: 'root'
})
export class RelatedProductsService {
  private readonly STORAGE_KEY = 'relatedProductsIds';
  private readonly MAX_STORED_IDS = 100; // الحد الأقصى لعدد الـIDs التي سيتم تخزينها

  // خاص بالمنتجات ذات الصلة المحملة حالياً
  private relatedProductsSubject = new BehaviorSubject<number[]>([]);

  constructor(
    private localStorageService: LocalStorageService,
    private productService: ProductService
  ) {
    this.loadFromLocalStorage();
  }

  /**
   * الحصول على المنتجات ذات الصلة كـ Observable
   */
  get relatedProductsIds$(): Observable<number[]> {
    return this.relatedProductsSubject.asObservable();
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
    storedData[productId.toString()] = filteredIds;

    // تحديث القائمة في localStorage
    this.localStorageService.setItem(this.STORAGE_KEY, storedData);

    // تحديث الـ BehaviorSubject
    this.relatedProductsSubject.next(this.getAllRelatedIds());
  }

  /**
   * الحصول على كل الـ IDs ذات الصلة المخزنة
   * @returns مصفوفة من كل الـ IDs المخزنة
   */
  getAllRelatedIds(): number[] {
    const storedData = this.localStorageService.getItem<Record<string, number[]>>(this.STORAGE_KEY) || {};

    // دمج كل الـ IDs من كل المنتجات في مصفوفة واحدة
    const allIds = Object.values(storedData).flat();

    // إزالة التكرار وترتيب المصفوفة بشكل عشوائي
    return this.shuffleArray([...new Set(allIds)]);
  }

  /**
   * الحصول على عدد محدد من الـ IDs العشوائية من القائمة المخزنة
   * @param count عدد الـ IDs المطلوبة
   * @param excludeId ID المنتج الذي يجب استبعاده (مثلاً المنتج الحالي)
   * @returns مصفوفة من الـ IDs العشوائية
   */
  getRandomRelatedIds(count: number = 8, excludeId?: number): number[] {
    const allIds = this.getAllRelatedIds();

    // استبعاد المنتج المحدد إذا كان موجوداً
    const filteredIds = excludeId ? allIds.filter(id => id !== excludeId) : allIds;

    // إذا كان العدد المطلوب أكبر من عدد الـ IDs المتاحة، نعيد كل المصفوفة
    if (count >= filteredIds.length) {
      return filteredIds;
    }

    // اختيار عدد معين من العناصر بشكل عشوائي
    return this.shuffleArray(filteredIds).slice(0, count);
  }

  /**
   * الحصول على الـ IDs ذات الصلة بمنتج معين
   * @param productId ID المنتج
   * @param count عدد الـ IDs المطلوبة
   * @returns مصفوفة من الـ IDs ذات الصلة بالمنتج
   */
  getRelatedIdsForProduct(productId: number, count: number = 8): number[] {
    if (!productId) return [];

    const storedData = this.localStorageService.getItem<Record<string, number[]>>(this.STORAGE_KEY) || {};
    const productRelatedIds = storedData[productId.toString()] || [];

    // إذا كان لدينا IDs كافية، نختار منها بشكل عشوائي
    if (productRelatedIds.length >= count) {
      return this.shuffleArray([...productRelatedIds]).slice(0, count);
    }

    // إذا لم يكن لدينا IDs كافية، نكمل من الـ IDs الأخرى
    const otherIds = this.getRandomRelatedIds(count - productRelatedIds.length, productId);
    return [...productRelatedIds, ...otherIds].slice(0, count);
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
      }
    } catch (error) {
      console.error('Error loading related products IDs from localStorage:', error);
      // في حالة وجود خطأ، نبدأ مع مصفوفة فارغة
      this.localStorageService.setItem(this.STORAGE_KEY, {});
    }
  }

  /**
   * خلط المصفوفة بشكل عشوائي (خوارزمية Fisher-Yates)
   * @param array المصفوفة المراد خلطها
   * @returns المصفوفة بعد الخلط
   */
  private shuffleArray(array: number[]): number[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
