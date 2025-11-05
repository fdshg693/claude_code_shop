export enum UserRole {
  CUSTOMER = "customer",
  ADMIN = "admin",
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at?: string;
}

export interface UserCreate {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
}

export interface UserLogin {
  email: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}
