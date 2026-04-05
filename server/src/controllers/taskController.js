const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const Task = require('../models/Task');

async function createTask(req, res, next) {
  try {
    const { description, workSessionId, workerId } = req.body;

    if (!description) {
      throw new ApiError(400, 'description es obligatorio.');
    }

    if (req.user.role === 'SUPERVISOR' && workerId && !mongoose.isValidObjectId(workerId)) {
      throw new ApiError(400, 'workerId inválido.');
    }

    const ownerWorkerId = req.user.role === 'SUPERVISOR' && workerId ? workerId : req.user.id;

    if (workSessionId && !mongoose.isValidObjectId(workSessionId)) {
      throw new ApiError(400, 'workSessionId debe ser un ObjectId válido.');
    }

    const task = await Task.create({
      workerId: ownerWorkerId,
      description,
      workSessionId: workSessionId || null,
      status: 'PENDING'
    });

    return res.status(201).json({
      ok: true,
      data: task
    });
  } catch (error) {
    return next(error);
  }
}

async function listMyTasks(req, res, next) {
  try {
    const { status, workerId } = req.query;
    let targetWorkerId = req.user.id;

    if (req.user.role === 'SUPERVISOR' && workerId) {
      if (!mongoose.isValidObjectId(workerId)) {
        throw new ApiError(400, 'workerId inválido.');
      }

      targetWorkerId = workerId;
    }

    const query = {
      workerId: targetWorkerId
    };

    if (status) {
      query.status = status;
    }

    const tasks = await Task.find(query).sort({ createdAt: -1 }).limit(100);

    return res.status(200).json({
      ok: true,
      data: tasks
    });
  } catch (error) {
    return next(error);
  }
}

async function updateTaskStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      throw new ApiError(400, 'status inválido.');
    }

    const task = await Task.findOneAndUpdate(
      { _id: id, workerId: req.user.id },
      { status },
      { new: true }
    );

    if (!task) {
      throw new ApiError(404, 'No se encontró la tarea indicada.');
    }

    return res.status(200).json({
      ok: true,
      data: task
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createTask,
  listMyTasks,
  updateTaskStatus
};
