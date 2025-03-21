import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Select } from 'primeng/select';
import { RouterLink } from '@angular/router';
import { RadioButtonModule } from 'primeng/radiobutton';

@Component({
  selector: 'app-checkout-form',
  imports: [ReactiveFormsModule, RadioButtonModule, RouterLink, Select],
  templateUrl: './checkout-form.component.html',
  styleUrl: './checkout-form.component.css',
})
export class CheckoutFormComponent {
  form = new FormGroup({
    email: new FormControl('', {
      validators: [Validators.email, Validators.required],
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
    city: new FormControl('', {
      validators: [Validators.maxLength(30), Validators.required],
    }),
    state: new FormControl('', {
      validators: [Validators.maxLength(30), Validators.required],
    }),
    phone: new FormControl('', {
      validators: [Validators.maxLength(30), Validators.required],
    }),
    cardNumber: new FormControl('', {
      validators: [Validators.maxLength(30), Validators.required],
    }),
    expDate: new FormControl('', {
      validators: [Validators.maxLength(30), Validators.required],
    }),
    securityCode: new FormControl('', {
      validators: [Validators.maxLength(10), Validators.required],
    }),
    nameOnCard: new FormControl('', {
      validators: [Validators.maxLength(10), Validators.required],
    }),
  });

  paymentRadiosValue: string = 'creditCard';

  onPayment(event: Event) {
    const radionBtn = event.target as HTMLInputElement;
    this.paymentRadiosValue = radionBtn.value;
    console.log(this.paymentRadiosValue);
  }
}
