const mongoose = require('mongoose');

const TASK_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  STOPPED: 'STOPPED',
  COMPLETED: 'COMPLETED'
};

const taskCommentSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdByName: {
      type: String,
      trim: true,
      default: ''
    },
    createdByRole: {
      type: String,
      trim: true,
      default: ''
    },
    source: {
      type: String,
      enum: ['typed', 'voice'],
      default: 'typed'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

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
      enum: Object.values(TASK_STATUS),
      default: TASK_STATUS.PENDING,
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
    stoppedAt: {
      type: Date,
      default: null
    },
    stoppedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    stopReason: {
      type: String,
      trim: true,
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
    },
    comments: {
      type: [taskCommentSchema],
      default: []
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = {
  Task: mongoose.model('Task', taskSchema),
  TASK_STATUS
};
