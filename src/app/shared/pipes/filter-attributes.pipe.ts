import { Pipe, PipeTransform } from '@angular/core';
import { Attribute } from '../../interfaces/product';
@Pipe({
  name: 'filter-attributes',
  pure:true,
})
export class FilterAttributesPipe implements PipeTransform {
  transform(attributes: Attribute[], searchTerm: string): Attribute[] {
    if (!attributes || !searchTerm) {
      return attributes;
    }
    return attributes.filter((attr:any) =>
      attr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attr.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
}

