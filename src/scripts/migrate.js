// Add this temporary code to your route.ts file
// Run once and then remove
import connect from '../utils/db';

async function migrateScheduleData() {
    await connect();
    const classes = await Class.find({});
    for (const classObj of classes) {
      if (typeof classObj.schedule === 'string') {
        try {
          // Try to parse if it's a JSON string
          const scheduleObj = JSON.parse(classObj.schedule);
          await Class.updateOne(
            { _id: classObj._id },
            { $set: { schedule: scheduleObj } }
          );
        } catch (e) {
          // If not a JSON string, create a default structure
          await Class.updateOne(
            { _id: classObj._id },
            { 
              $set: { 
                schedule: {
                  days: ['Monday'],
                  startTime: '09:00',
                  endTime: '10:00'
                } 
              } 
            }
          );
        }
      }
    }
    console.log('Migration completed');
  }
  
  // Call this function once when your app starts
  migrateScheduleData();
  