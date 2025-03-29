/**
 * Calculate the prorated amount for a payment based on enrollment date
 */
export function calculateProratedAmount(monthlyFee: number, enrollmentDate: Date, month: number, year: number, useSimpleProration: boolean = false): number {
  // Create date objects for the first and last day of the target month
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0); 
  const daysInMonth = endOfMonth.getDate();
  
  console.log('Start of month:', startOfMonth);
  console.log('End of month:', endOfMonth);
  console.log('Enrollment date:', enrollmentDate);
  
  // If enrollment is before the month starts, charge full fee
  if (enrollmentDate < startOfMonth) {
    console.log('Enrollment before month - full fee:', monthlyFee);
    return monthlyFee;
  }
  
  // If enrollment is after the month ends, no charge
  if (enrollmentDate > endOfMonth) {
    console.log('Enrollment after month - no fee');
    return 0;
  }

  // Calculate the number of weeks in the month (rounded up)
  const weeksInMonth = Math.ceil(daysInMonth / 7);
  console.log('Weeks in month:', weeksInMonth);
  
  // Calculate which week of the month the enrollment falls in (1-based)
  const dayOfMonth = enrollmentDate.getDate();
  const enrollmentWeek = Math.ceil(dayOfMonth / 7);
  console.log('Enrollment week:', enrollmentWeek);
  
  // SIMPLE WEEKLY PRORATION SYSTEM:
  // First week = full fee
  if (enrollmentWeek === 1) {
    console.log('Enrolled in first week - full fee:', monthlyFee);
    return monthlyFee;
  }
  
  // For other weeks, prorate based on remaining weeks
  const remainingWeeks = weeksInMonth - enrollmentWeek + 1;
  const weeklyRate = monthlyFee / weeksInMonth;
  const proratedAmount = Math.round(remainingWeeks * weeklyRate);
  
  console.log('Enrollment week:', enrollmentWeek);
  console.log('Total weeks in month:', weeksInMonth);
  console.log('Remaining weeks:', remainingWeeks);
  console.log('Weekly rate:', weeklyRate);
  console.log('Prorated amount:', proratedAmount);
  
  return proratedAmount;
}