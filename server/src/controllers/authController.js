const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { User } = require('../models/User');

function signToken(user) {
  if (!env.jwtSecret) {
    throw new ApiError(500, 'JWT_SECRET no configurado en el servidor.');
  }

  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      employeeId: user.employeeId
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

async function register(req, res, next) {
  try {
    const { employeeId, name, role, pin } = req.body;

    if (!employeeId || !name || !pin) {
      throw new ApiError(400, 'employeeId, name y pin son obligatorios.');
    }

    const exists = await User.findOne({ employeeId: employeeId.toUpperCase() });
    if (exists) {
      throw new ApiError(409, 'Ya existe un usuario con ese ID de empleado.');
    }

    const passwordHash = await User.hashPassword(pin);
    const user = await User.create({
      employeeId,
      name,
      role,
      passwordHash
    });

    return res.status(201).json({
      ok: true,
      data: {
        id: user.id,
        employeeId: user.employeeId,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { employeeId, pin } = req.body;

    if (!employeeId || !pin) {
      throw new ApiError(400, 'employeeId y pin son obligatorios.');
    }

    const user = await User.findOne({ employeeId: employeeId.toUpperCase() });

    if (!user) {
      throw new ApiError(401, 'Credenciales inválidas.');
    }

    const isValidPin = await user.validatePassword(pin);
    if (!isValidPin) {
      throw new ApiError(401, 'Credenciales inválidas.');
    }

    const token = signToken(user);

    return res.status(200).json({
      ok: true,
      data: {
        token,
        user: {
          id: user.id,
          employeeId: user.employeeId,
          name: user.name,
          role: user.role
        }
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login
};
