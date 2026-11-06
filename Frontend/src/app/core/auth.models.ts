export type UserType = 'admin' | 'user';

export interface AuthUser {
  fullName: string;
  email: string;
  type: UserType;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  payload: {
    token: string;
    user: AuthUser;
  };
}

export interface StoredSession {
  token: string;
  user: AuthUser;
}
