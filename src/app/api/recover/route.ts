import { NextRequest, NextResponse } from 'next/server';
import connect from '@/utils/db';
import PaymentGenerationStatus from '@/utils/models/paymentGenerationStatusSchema';

// Connect to database
connect();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkMissed = searchParams.get('checkMissed') === 'true';
    
    if (checkMissed) {
      // Get the current month and year
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 0-indexed to 1-indexed
      const currentYear = now.getFullYear();
      
      // Create an array of the last 3 months to check
      const monthsToCheck = [];
      for (let i = 0; i < 3; i++) {
        let month = currentMonth - i;
        let year = currentYear;
        
        if (month <= 0) {
          month = 12 + month; // e.g., currentMonth=1, i=1 => month=12
          year = year - 1;
        }
        
        monthsToCheck.push({ month, year });
      }
      
      // Check if each month has completed payment generation
      const statuses = await Promise.all(
        monthsToCheck.map(async ({ month, year }) => {
          const status = await PaymentGenerationStatus.findOne({ month, year });
          return {
            month,
            year,
            generated: !!status,
            complete: status ? status.isComplete : false,
            count: status ? status.count : 0,
          };
        })
      );
      
      return NextResponse.json({
        currentDate: now.toISOString(),
        paymentGenerationStatus: statuses,
        message: "Payment generation status check complete"
      });
    }
    
    // Return system status
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Payment system is operational'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST endpoint to trigger missing payment generation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.month || !body.year) {
      return NextResponse.json({
        error: 'Month and year are required'
      }, { status: 400 });
    }
    
    // Make a request to the payment generation endpoint
    const paymentGenUrl = new URL('/api/payment', request.url);
    const result = await fetch(paymentGenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        generateMonthly: true,
        month: body.month,
        year: body.year,
        force: body.force
      })
    });
    
    const paymentGenResult = await result.json();
    
    return NextResponse.json({
      success: true,
      message: `Recovery process executed for ${body.month}/${body.year}`,
      result: paymentGenResult
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}