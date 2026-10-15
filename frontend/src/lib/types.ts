export type Role = "ADMIN" | "USER";

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresAt: string;
  user: User;
}

export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "TERMINATED";

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  jobTitle: string;
  salary: number;
  hireDate: string;
  status: EmployeeStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  jobTitle: string;
  salary: number;
  hireDate: string;
  status: EmployeeStatus;
  version?: number;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export type FieldErrors = Record<string, string>;
