// Add to your imports:
import { usePaymentGeneration } from '@/hooks/usePaymentGeneration';

export default function DashboardLayout({ children }) {
  // Add this line to enable automatic payment generation
  usePaymentGeneration();
  
  // Rest of your component...
}