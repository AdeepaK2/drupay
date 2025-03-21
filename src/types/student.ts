// src/types/student.ts
export interface Student {
  _id: string;
  name: string;
  sid: string;
  email: string;
  grade?: string;
  contactNumber: string;
  classes?: string[];
  parent?: {
    name: string;
    email?: string;
    contactNumber?: string;
  };
  admissionFeeStatus?: {
    paid: boolean;
    amount?: number;
    paidDate?: string;
    receiptNumber?: string;
  };
  paymentMethod?: "Cash" | "Invoice"; // Using the specific values
  notes?: string;
  createdAt?: string;
}

export interface StudentEditModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Student) => void;
}