import mongoose, { Schema } from 'mongoose';

const EmailLogSchema = new Schema({
  studentId: {
    type: String,
    required: true,
  },
  parentEmail: {
    type: String,
    required: true,
  },
  subject: {
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
    enum: ['success', 'failed'],
    required: true,
  },
  errorMessage: String,
});

// Check if model exists to prevent recompilation errors
const EmailLog = mongoose.models.EmailLog || mongoose.model('EmailLog', EmailLogSchema);

export default EmailLog;