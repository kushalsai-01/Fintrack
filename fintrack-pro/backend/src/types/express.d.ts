/**
 * Global type declarations for Express and Passport
 */

import { TokenPayload } from '../utils/jwt.js';

// Define authenticated user type
export interface AuthUser extends TokenPayload {
  _id: string;
}

// Augment Express Request to include our user type
declare global {
  namespace Express {
    interface User extends AuthUser {}
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
