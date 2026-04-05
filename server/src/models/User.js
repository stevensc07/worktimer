const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const USER_ROLES = {
  WORKER: 'OBRERO',
  SUPERVISOR: 'SUPERVISOR'
};

const userSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      required: true,
      default: USER_ROLES.WORKER
    },
    passwordHash: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

userSchema.methods.validatePassword = function validatePassword(plainPin) {
  return bcrypt.compare(plainPin, this.passwordHash);
};

userSchema.statics.hashPassword = function hashPassword(plainPin) {
  return bcrypt.hash(plainPin, 10);
};

module.exports = {
  User: mongoose.model('User', userSchema),
  USER_ROLES
};
