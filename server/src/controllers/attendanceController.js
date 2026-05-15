const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const WorkSession = require('../models/WorkSession');
const {
  closeWorkSession,
  enforceDailyCutoff,
  isPastDailyCutoff
} = require('../services/timeControlService');

function toGeoPoint(location) {
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    throw new ApiError(400, 'La ubicación debe incluir lat y lng numéricos.');
  }

  return {
    type: 'Point',
    coordinates: [location.lng, location.lat]
  };
}

async function checkIn(req, res, next) {
  try {
    await enforceDailyCutoff({ force: true });

    if (isPastDailyCutoff()) {
      throw new ApiError(409, 'Después de las 6:00 p.m. no se puede iniciar una jornada nueva.');
    }

    const workerId = req.user.id;
    const existingOpenSession = await WorkSession.findOne({
      workerId,
      status: 'OPEN'
    });

    if (existingOpenSession) {
      throw new ApiError(409, 'Ya existe una jornada abierta. Debes hacer Check-out primero.');
    }

    const checkInLocation = toGeoPoint(req.body.location);

    const session = await WorkSession.create({
      workerId,
      startTime: new Date(),
      checkInLocation,
      status: 'OPEN'
    });

    return res.status(201).json({
      ok: true,
      message: 'Check-in registrado correctamente.',
      data: session
    });
  } catch (error) {
    return next(error);
  }
}

async function checkOut(req, res, next) {
  try {
    await enforceDailyCutoff({ force: true });

    const workerId = req.user.id;

    const session = await WorkSession.findOne({
      workerId,
      status: 'OPEN'
    });

    if (!session) {
      throw new ApiError(404, 'No hay una jornada activa para cerrar.');
    }

    const checkOutLocation = toGeoPoint(req.body.location);
    await closeWorkSession(session, {
      closedAt: new Date(),
      checkOutLocation,
      closedBy: req.user.id,
      closedByRole: req.user.role,
      reason: 'Cerrada por el trabajador.'
    });

    return res.status(200).json({
      ok: true,
      message: 'Check-out registrado correctamente.',
      data: session
    });
  } catch (error) {
    return next(error);
  }
}

async function getMyCurrentSession(req, res, next) {
  try {
    await enforceDailyCutoff();

    const session = await WorkSession.findOne({
      workerId: req.user.id,
      status: 'OPEN'
    });

    return res.status(200).json({
      ok: true,
      data: session
    });
  } catch (error) {
    return next(error);
  }
}

async function closeSessionBySupervisor(req, res, next) {
  try {
    await enforceDailyCutoff({ force: true });

    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new ApiError(400, 'id de jornada inválido.');
    }

    const session = await WorkSession.findOne({
      _id: req.params.id,
      status: 'OPEN'
    });

    if (!session) {
      throw new ApiError(404, 'No hay una jornada activa con ese identificador.');
    }

    await closeWorkSession(session, {
      closedAt: new Date(),
      closedBy: req.user.id,
      closedByRole: req.user.role,
      reason: req.body.reason || 'Cerrada por supervisor.'
    });

    return res.status(200).json({
      ok: true,
      message: 'Jornada detenida por supervisor.',
      data: session
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  closeSessionBySupervisor,
  checkIn,
  checkOut,
  getMyCurrentSession
};
