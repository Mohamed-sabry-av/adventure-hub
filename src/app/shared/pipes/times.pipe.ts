import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'times' })
export class TimesPipe implements PipeTransform {
  transform(value: number): number[] {
    return Array(value).fill(0).map((x, i) => i);
  }
}