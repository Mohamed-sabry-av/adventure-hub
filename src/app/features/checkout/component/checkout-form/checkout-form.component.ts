import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Select } from 'primeng/select';
import { RouterLink } from '@angular/router';
import { RadioButtonModule } from 'primeng/radiobutton';
import { FormValidationService } from '../../../../shared/services/form-validation.service';
import { CheckoutService } from '../../services/checkout.service';

@Component({
  selector: 'app-checkout-form',
  imports: [ReactiveFormsModule, RadioButtonModule, RouterLink, Select],
  templateUrl: './checkout-form.component.html',
  styleUrl: './checkout-form.component.css',
})
export class CheckoutFormComponent {
  private formValidationService = inject(FormValidationService);
  private checkoutService = inject(CheckoutService);

  form = new FormGroup({
    email: new FormControl('', {
      validators: [Validators.email, Validators.required],
    }),
    countrySelect: new FormControl('', {
      validators: [Validators.required],
    }),
    firstName: new FormControl('', {
      validators: [Validators.maxLength(30), Validators.required],
    }),
    lastName: new FormControl('', {
      validators: [Validators.maxLength(30), Validators.required],
    }),
    address: new FormControl('', {
      validators: [Validators.maxLength(30), Validators.required],
    }),
    apartment: new FormControl('', {
      validators: [Validators.maxLength(30)],
    }),
    city: new FormControl('', {
      validators: [Validators.maxLength(30), Validators.required],
    }),
    state: new FormControl('', {
      validators: [Validators.maxLength(30), Validators.required],
    }),
    phone: new FormControl('', {
      validators: [Validators.maxLength(30), Validators.required],
    }),
    postCode: new FormControl('', {
      validators: [Validators.maxLength(30), Validators.required],
    }),
    // -------------------------------------------
    // cardNumber: new FormControl('', {
    //   validators: [Validators.maxLength(30), Validators.required],
    // }),
    // expDate: new FormControl('', {
    //   validators: [Validators.maxLength(30), Validators.required],
    // }),
    // securityCode: new FormControl('', {
    //   validators: [Validators.maxLength(10), Validators.required],
    // }),
    // nameOnCard: new FormControl('', {
    //   validators: [Validators.maxLength(10), Validators.required],
    // }),
  });

  paymentRadiosValue: string = 'creditCard';

  avaliableCountries(): any[] {
    const countries = [
      { country: 'Bahrain' },
      { country: 'Egypt' },
      { country: 'Kuwait' },
      { country: 'Oman' },
      { country: 'Saudi Arabia' },
      { country: 'Qatar' },
      { country: 'Singapore' },
      { country: 'United Arab Emirates' },
    ];

    return countries.sort((a, b) => a.country.localeCompare(b.country));
  }

  onPayment(event: Event) {
    const radionBtn = event.target as HTMLInputElement;
    this.paymentRadiosValue = radionBtn.value;
  }

  onSubmit() {
    const billingAddress = {
      first_name: this.form.value.firstName,
      last_name: this.form.value.lastName,
      address_1: this.form.value.address,
      city: this.form.value.city,
      state: this.form.value.state,
      postcode: `${this.form.value.postCode}`,
      country: this.form.value.countrySelect,
      email: this.form.value.email,
      phone: `${this.form.value.phone}`,
    };

    const shippingAddress = {
      first_name: this.form.value.firstName,
      last_name: this.form.value.lastName,
      address_1: this.form.value.address,
      city: this.form.value.city,
      state: this.form.value.state,
      postcode: `${this.form.value.postCode}`,
      country: this.form.value.countrySelect,
    };

    this.checkoutService.createOrder({
      billing: billingAddress,
      shipping: shippingAddress,
    });
  }

  get emailIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(this.form, 'email');
  }

  get firstNameIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.form,
      'firstName'
    );
  }

  get lastNameIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.form,
      'lastName'
    );
  }

  get addressIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.form,
      'address'
    );
  }

  get cityIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(this.form, 'city');
  }

  get stateIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(this.form, 'state');
  }

  get phoneIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(this.form, 'phone');
  }

  get postCodeIsInvalid() {
    return this.formValidationService.controlFieldIsInvalid(
      this.form,
      'postCode'
    );
  }
}
