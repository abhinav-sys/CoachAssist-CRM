import mongoose from 'mongoose';

const ACTIVITY_TYPES = ['CALL', 'WHATSAPP', 'NOTE', 'STATUS_CHANGE', 'AI_MESSAGE_GENERATED'];

const activitySchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    meta: { type: mongoose.Schema.Types.Mixed }, // e.g. { duration, previousStatus, newStatus, message, script, objection }
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Compound index for timeline queries (newest first by lead)
activitySchema.index({ leadId: 1, createdAt: -1 });

export default mongoose.model('Activity', activitySchema);
export { ACTIVITY_TYPES };
