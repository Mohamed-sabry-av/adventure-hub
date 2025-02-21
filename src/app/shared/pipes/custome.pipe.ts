import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'custome',
})
export class CustomePipe implements PipeTransform {
  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }
}




import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export const handleError = <T>(defaultValue: T, logMessage: string) => 
  (source: Observable<T>): Observable<T> =>
    source.pipe(
      catchError(error => {
        console.error(logMessage, error);
        return of(defaultValue);
      })
    );

export const mapFirstItem = <T>() => 
  (source: Observable<T[]>): Observable<T | null> =>
    source.pipe(
      map(response => (response.length > 0 ? response[0] : null))
    );
    

    