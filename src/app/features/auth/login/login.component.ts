import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountAuthService } from '../../../core/services/account-auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule,ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm!:FormGroup;
  loginError:string='';

  constructor(
    private fb:FormBuilder,
    private router:Router,
    private accountService: AccountAuthService
  ){}

  ngOnInit() {
    this.loginFormValidator()
  }

  loginFormValidator(){
    this.loginForm = this.fb.group({
      username:['',Validators.required],
      password:['',[Validators.required, Validators.minLength(6)]]
    })
  }

  onLoginSubmit():void{
    if(this.loginForm.invalid){
      this.loginError = 'Please fill all required faileds correctly'
      // المفروض نحط نوتفيكيشن ماسدج هنا
      return;
    }

    const credentials = this.loginForm.value;
    this.accountService.login(credentials).subscribe({
      next:()=>{
        this.loginError = '';
        this.router.navigate(['/']) // go to home after login
      },
      error:(err)=>{
        this.loginError = err.error?.message || 'Login faield try again';
      }
    })
  }



}
