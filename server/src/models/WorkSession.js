const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length === 2;
        },
        message: 'Las coordenadas deben seguir el formato [lng, lat].'
      }
    }
  },
  { _id: false }
);

const workSessionSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now
    },
    endTime: {
      type: Date,
      default: null
    },
    durationMinutes: {
      type: Number,
      min: 0,
      default: null
    },
    status: {
      type: String,
      enum: ['OPEN', 'CLOSED'],
      default: 'OPEN',
      index: true
    },
    checkInLocation: {
      type: locationSchema,
      required: true
    },
    checkOutLocation: {
      type: locationSchema,
      default: null
    },
    activityPhotoFileIds: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

workSessionSchema.index({ checkInLocation: '2dsphere' });
workSessionSchema.index({ checkOutLocation: '2dsphere' });

module.exports = mongoose.model('WorkSession', workSessionSchema);
