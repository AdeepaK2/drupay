import PaymentGenerationMonitor from '@/components/system/PaymentGenerationMonitor';

export default function SystemPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">System Administration</h1>
      
      <div className="mb-8">
        <PaymentGenerationMonitor />
      </div>
      
      {/* Add other system monitoring components here */}
    </div>
  );
}