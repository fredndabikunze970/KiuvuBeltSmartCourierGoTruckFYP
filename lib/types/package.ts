export interface PackageFormData {
  // Sender Information
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  origin_branch_id: string;

  // Receiver Information
  receiver_name: string;
  receiver_phone: string;
  receiver_address: string;
  destination_branch_id: string;

  // Package Details
  package_description: string;
  weight: number;
  dimensions: string;
  declared_value: number;
  priority: 'normal' | 'express' | 'urgent';

  // Calculated Fields
  delivery_fee?: number;
}

export interface Branch {
  branch_id: string;
  branch_name: string;
  latitude: number;
  longitude: number;
  address: string;
}

export interface PackageResponse extends PackageFormData {
  package_id: string;
  pickup_code: string;
  status: 'pending' | 'processing' | 'in_transit' | 'delivered' | 'cancelled';
  agent_id: string;
  created_at: string;
  updated_at: string;
  delivered_at?: string;
  assigned_car?: string;
  assigned_driver?: string;
  delivery_time?: string;
}

export type FormStep = 'sender' | 'receiver' | 'package' | 'review';

export interface StepConfig {
  title: string;
  description: string;
}

export const FORM_STEPS: Record<FormStep, StepConfig> = {
  sender: {
    title: 'Sender Information',
    description: 'Enter the sender\'s details and pickup location'
  },
  receiver: {
    title: 'Receiver Information',
    description: 'Enter the receiver\'s details and delivery location'
  },
  package: {
    title: 'Package Details',
    description: 'Enter package specifications and shipping options'
  },
  review: {
    title: 'Review & Confirm',
    description: 'Review package details and confirm registration'
  }
};