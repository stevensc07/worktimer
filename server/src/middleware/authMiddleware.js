const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { User } = require('../models/User');

async function authRequired(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Token no enviado o formato inválido.');
    }

    if (!env.jwtSecret) {
      throw new ApiError(500, 'JWT_SECRET no configurado en el servidor.');
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const payload = jwt.verify(token, env.jwtSecret);

    const user = await User.findById(payload.sub);
    if (!user) {
      throw new ApiError(401, 'El usuario del token ya no existe.');
    }

    req.user = {
      id: user.id,
      role: user.role,
      employeeId: user.employeeId,
      name: user.name
    };

    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Token inválido o expirado.'));
    }

    return next(error);
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'No autenticado.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'No tienes permisos para esta operación.'));
    }

    return next();
  };
}

module.exports = {
  authRequired,
  authorizeRoles
};
