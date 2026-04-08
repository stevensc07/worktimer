const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    workSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkSession',
      default: null,
      index: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
      default: 'PENDING',
      index: true
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    taskDurationMinutes: {
      type: Number,
      min: 0,
      default: 0
    },
    googleDriveFileIds: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = mongoose.model('Task', taskSchema);
