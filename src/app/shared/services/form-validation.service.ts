import { inject, Injectable } from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';

@Injectable({
  providedIn: 'root',
})
export class FormValidationService {
  equalValues(controlName1: string, controlName2: string) {
    return (control: AbstractControl) => {
      const val1 = control.get(controlName1)?.value;
      const val2 = control.get(controlName2)?.value;
      if (val1 === val2) {
        return null;
      }
      return { valuesNotEqual: true };
    };
  }

  controlFieldIsInvalid(form: FormGroup, controlName: string) {
    const control = form.get(controlName)!;
    return control.dirty && control.touched && control.invalid;
  }
}
