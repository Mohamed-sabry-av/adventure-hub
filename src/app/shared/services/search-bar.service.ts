import { Injectable } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SearchBarService {


  constructor(
    private wooApi: ApiService
  ){}

  SearchProducts(searchTerm:string):Observable<any>{
    return this.wooApi.getRequest(`products?search=${searchTerm}`)
  }

}
