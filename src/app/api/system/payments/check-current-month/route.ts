import { NextResponse, NextRequest } from 'next/server';
import connect from '@/utils/db';
import PaymentGenerationStatus from '@/utils/models/paymentGenerationStatusSchema';
import { generateMonthlyPayments } from '@/app/api/payment/paymentHelpers';

export async function POST(request: NextRequest) {
  // Only allow server-side calls or calls with the correct header
  const systemCheck = request.headers.get('x-system-check');
  if (!systemCheck && !request.nextUrl.hostname.includes('localhost')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await connect();
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 0-indexed to 1-indexed
    const currentYear = currentDate.getFullYear();
    
    // Check if payments were already generated for current month
    const status = await PaymentGenerationStatus.findOne({
      month: currentMonth,
      year: currentYear
    });
    
    // If no status exists or generation was incomplete, generate payments
    if (!status || !status.isComplete) {
      console.log(`Starting payment generation for ${currentMonth}/${currentYear}`);
      
      const result = await generateMonthlyPayments(currentMonth, currentYear);
      
      return NextResponse.json({
        success: true,
        message: `Auto-generated payments for ${currentMonth}/${currentYear}`,
        result
      });
    } else {
      return NextResponse.json({
        success: true,
        message: `Payments already generated for ${currentMonth}/${currentYear}`,
        status
      });
    }
  } catch (error: any) {
    console.error("Error checking current month payments:", error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}