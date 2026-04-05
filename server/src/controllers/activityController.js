const ApiError = require('../utils/ApiError');
const Task = require('../models/Task');
const WorkSession = require('../models/WorkSession');
const { uploadToDrive } = require('../services/googleDriveService');

function buildFileName({ employeeId, originalname }) {
  const safeName = (originalname || 'evidencia.jpg').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '');
  return `${employeeId}_${Date.now()}_${safeName}`;
}

async function uploadActivityPhoto(req, res, next) {
  try {
    if (!req.file) {
      throw new ApiError(400, 'Debes enviar una imagen en el campo "photo".');
    }

    const { taskId, workSessionId } = req.body;

    if (!taskId && !workSessionId) {
      throw new ApiError(400, 'Debes enviar taskId o workSessionId para asociar la evidencia.');
    }

    const uploaded = await uploadToDrive(req.file.buffer, {
      fileName: buildFileName({
        employeeId: req.user.employeeId,
        originalname: req.file.originalname
      }),
      mimeType: req.file.mimetype
    });

    let linkedEntity = null;

    if (taskId) {
      const task = await Task.findOneAndUpdate(
        { _id: taskId, workerId: req.user.id },
        { $push: { googleDriveFileIds: uploaded.fileId } },
        { new: true }
      );

      if (!task) {
        throw new ApiError(404, 'No se encontró la tarea para asociar la evidencia.');
      }

      linkedEntity = { type: 'task', id: task.id };
    }

    if (workSessionId) {
      const session = await WorkSession.findOneAndUpdate(
        { _id: workSessionId, workerId: req.user.id },
        { $push: { activityPhotoFileIds: uploaded.fileId } },
        { new: true }
      );

      if (!session) {
        throw new ApiError(404, 'No se encontró la sesión para asociar la evidencia.');
      }

      linkedEntity = { type: 'workSession', id: session.id };
    }

    return res.status(201).json({
      ok: true,
      message: 'Evidencia subida correctamente.',
      data: {
        ...uploaded,
        linkedEntity
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  uploadActivityPhoto
};
