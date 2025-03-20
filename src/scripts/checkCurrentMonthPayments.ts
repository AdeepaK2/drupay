import connect from '../utils/db';
import PaymentGenerationStatus from '../utils/models/paymentGenerationStatusSchema';

async function checkAndGenerateCurrentMonthPayments() {
  try {
    await connect();
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 0-indexed to 1-indexed
    const currentYear = currentDate.getFullYear();
    
    console.log(`Checking payment generation for ${currentMonth}/${currentYear}...`);
    
    // Check if payments were already generated
    const status = await PaymentGenerationStatus.findOne({
      month: currentMonth,
      year: currentYear
    });
    
    if (!status || !status.isComplete) {
      console.log(`Payments not generated for current month. Initiating generation...`);
      
      // Make a request to your API to generate payments
      // When running in production, you'll need to handle this differently
      // For example, by directly importing and calling your generation function
      
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/payment`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          generateMonthly: true,
          month: currentMonth,
          year: currentYear
        })
      });
      
      const result = await response.json();
      console.log('Payment generation result:', result);
    } else {
      console.log(`Payments already generated for ${currentMonth}/${currentYear}`);
    }
    
    console.log('Payment check complete');
  } catch (error) {
    console.error('Error checking current month payments:', error);
  }
}

// Execute if called directly
if (require.main === module) {
  checkAndGenerateCurrentMonthPayments()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

export default checkAndGenerateCurrentMonthPayments;