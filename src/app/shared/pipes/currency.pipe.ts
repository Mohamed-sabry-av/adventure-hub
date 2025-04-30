import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'currencySvg',
  standalone: true
})
export class CurrencySvgPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | number | null | undefined): SafeHtml {
    if (value == null || value === '' || value === 'Unavailable') {
      return this.sanitizer.bypassSecurityTrustHtml('<span>Unavailable</span>');
    }

    const formattedValue = typeof value === 'number' ? value.toString() : value;
    const html = `
      <span class="flex items-center">
        <img src="/icons/UAE_Dirham_Symbol.svg" alt="UAE Dirham" class="h-5 w-5 mr-1">
        ${formattedValue}
      </span>
    `;

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}