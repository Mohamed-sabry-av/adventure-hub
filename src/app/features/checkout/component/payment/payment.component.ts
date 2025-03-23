import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StripeService } from 'ngx-stripe';


@Component({
  selector: 'app-payment',
  imports: [CommonModule,FormsModule],
  templateUrl: './payment.component.html',
  styleUrl: './payment.component.css'
})
export class PaymentComponent implements OnInit{
  stripe: any
  card: any
  error: string | null = null;


  constructor(private stripeService: StripeService) {}

  ngOnInit(){
    this.stripe = this.stripeService.stripe;
    if(!this.stripe){
      console.log("stripe is not loded yet")
      return
    }

    const elements = this.stripe.elements();

    this.card = elements - this.stripe.elements.create('card',{
      style:{
        base:{
          fontSize: '16px',
          color: '#32325d',
        }
      }
    })

    this.card.mount('#card-element')
  }



  pay(amount:number){
    this.stripe.createToken(this.card).then((result:any)=>{
      if(result.error){
        this.error = result.error.message
        console.log('Error:', result.error)
      }else{
        this.error = null
        console.log('Token:', result.token)
      }
    })
  }
}
