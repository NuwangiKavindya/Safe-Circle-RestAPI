import { TrustedContact, Alert as ApiAlert } from '../services/api';

export type ScreenType =
  | 'WELCOME'
  | 'SIGNUP'
  | 'DASHBOARD'
  | 'BIND_DEVICE'
  | 'ADD_CONTACT'
  | 'TRACKER_AUTH'
  | 'TRACKER_DASHBOARD'
  | 'GOOGLE_PHONE_REGISTER';

export interface UserData {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
}

export interface BoundDevice {
  id: string;
  deviceName: string;
  deviceModel: string;
  imeiNumber: string;
  deviceOs: string;
  createdAt: string;
}

export type { TrustedContact, ApiAlert };

export interface SignUpFormState {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

export interface SignInFormState {
  email: string;
  password: string;
}

export interface DeviceFormState {
  deviceName: string;
  deviceModel: string;
  imeiNumber: string;
  deviceOs: string;
}

export interface ContactFormState {
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  relationship: string;
}
