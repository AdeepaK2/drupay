import mongoose, { Schema } from 'mongoose';

const SMSLogSchema = new Schema({
  studentId: {
    type: String,
    required: true,
  },
  parentPhone: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    required: true,
  },
  errorMessage: String,
  messageId: String, // ClickSend message ID for tracking
  cost: Number,      // Message cost if available from API
});

// Check if model exists to prevent recompilation errors
const SMSLog = mongoose.models.SMSLog || mongoose.model('SMSLog', SMSLogSchema);

export default SMSLog;