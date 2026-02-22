import mongoose from "mongoose";

const hrInterviewScheduleSchema = new mongoose.Schema(
  {
    hrUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    candidateName: {
      type: String,
      required: true,
      trim: true,
    },
    candidateEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      required: true,
      trim: true,
    },
    mode: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      required: true,
      trim: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
    inviteToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    invitationSentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const HrInterviewSchedule = mongoose.model(
  "HrInterviewSchedule",
  hrInterviewScheduleSchema,
  "hrInterviewSchedules"
);

export default HrInterviewSchedule;
