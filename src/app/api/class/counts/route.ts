import { NextResponse } from 'next/server';
import connect from '@/utils/db';
import Enrollment from '@/utils/models/enrollmentSchema';

export async function GET() {
  try {
    await connect();
    
    // Use MongoDB's aggregation framework to get counts efficiently
    const enrollmentCounts = await Enrollment.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$class.classId', count: { $sum: 1 } } },
      { $project: { _id: 0, classId: '$_id', count: 1 } }
    ]);
    
    // Convert array to object for easier frontend consumption
    const countsMap = enrollmentCounts.reduce((acc: {[key: string]: number}, curr: any) => {
      acc[curr.classId] = curr.count;
      return acc;
    }, {});
    
    return NextResponse.json(countsMap);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}