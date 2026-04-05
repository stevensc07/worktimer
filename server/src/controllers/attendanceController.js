const ApiError = require('../utils/ApiError');
const WorkSession = require('../models/WorkSession');

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
    const workerId = req.user.id;

    const session = await WorkSession.findOne({
      workerId,
      status: 'OPEN'
    });

    if (!session) {
      throw new ApiError(404, 'No hay una jornada activa para cerrar.');
    }

    const checkOutLocation = toGeoPoint(req.body.location);
    const now = new Date();
    const durationMinutes = Math.max(0, Math.round((now - session.startTime) / 60000));

    session.endTime = now;
    session.durationMinutes = durationMinutes;
    session.checkOutLocation = checkOutLocation;
    session.status = 'CLOSED';

    await session.save();

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

module.exports = {
  checkIn,
  checkOut,
  getMyCurrentSession
};
