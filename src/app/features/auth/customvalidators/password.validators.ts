import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export class passwordValidator{
    static passStrength():ValidatorFn{
        return(control:AbstractControl): ValidationErrors| null=>{
            const value = control.value;
            if(!value){
                return null 
            }else{
                const hasNum = /[0-9]/.test(value);
                const hasupper = /[A-Z]/.test(value);
                const hasLower = /[a-z]/.test(value);
                const isValidLength = value.length >=8;
                const passValid = hasNum&&hasLower&&hasupper&&isValidLength
                return passValid ?null:{passwordstrength:true}
            }
        }
    }

    static matchPassword():ValidatorFn{
        return (control:AbstractControl):ValidationErrors | null=>{
            const retypepassword = control.value;
            const password = control.parent?.get('password')?.value
            if(!retypepassword){
                return null 
            }
            if(password === retypepassword){
                return null;
            }else{
               return {passworddismatch:true}
            }
        }
    }
        static matchpasswordForm(form:AbstractControl): ValidationErrors| null{
            const password = form.get('password') !.value;
            const retypepassword = form.get('retypepassword')!.value;
            if(password ==='' || retypepassword === ''){
                return null;
            } 
            if(password === 'retypepassword'){
                return null
            }else{
            return{passworddismatch:true}
        }
    }

}