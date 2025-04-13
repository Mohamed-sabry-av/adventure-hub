export interface User {
  username:string;
  email:string;
  password?:string;
}


export interface LoginResponse {
  token?: string;
  user_email?: string;
  user_username?: string;
  headers?: any;
  user_id:any;
}
