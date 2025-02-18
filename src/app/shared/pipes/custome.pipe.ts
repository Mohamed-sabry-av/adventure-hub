import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'custome',
})
export class CustomePipe implements PipeTransform {
  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }
}
