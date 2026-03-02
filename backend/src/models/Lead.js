import mongoose from 'mongoose';

const SOURCES = ['Instagram', 'Referral', 'Ads'];
const STATUSES = ['NEW', 'CONTACTED', 'INTERESTED', 'CONVERTED', 'LOST'];

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    source: { type: String, enum: SOURCES },
    status: { type: String, enum: STATUSES, default: 'NEW' },
    tags: [{ type: String, trim: true }],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    nextFollowUpAt: { type: Date },
    aiFollowup: { type: mongoose.Schema.Types.Mixed }, // { whatsappMessage, callScript, objectionHandling }
  },
  { timestamps: true }
);

// Indexes (documented in README)
leadSchema.index({ status: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ nextFollowUpAt: 1 });
leadSchema.index({ name: 'text', phone: 'text' });

export default mongoose.model('Lead', leadSchema);
export { SOURCES, STATUSES };
