const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { Task, TASK_STATUS } = require('../models/Task');
const { USER_ROLES } = require('../models/User');
const {
  calculateDurationMinutes,
  enforceDailyCutoff,
  isPastDailyCutoff,
  stopTaskTimer
} = require('../services/timeControlService');

const VALID_TASK_STATUSES = Object.values(TASK_STATUS);

function isSupervisor(user) {
  return user.role === USER_ROLES.SUPERVISOR;
}

async function findTaskForUser(taskId, user) {
  if (!mongoose.isValidObjectId(taskId)) {
    throw new ApiError(400, 'id de tarea inválido.');
  }

  const query = isSupervisor(user) ? { _id: taskId } : { _id: taskId, workerId: user.id };
  const task = await Task.findOne(query);

  if (!task) {
    throw new ApiError(404, 'No se encontró la tarea indicada.');
  }

  return task;
}

function getElapsedTaskMinutes(task, endTime) {
  const storedMinutes = Number(task.taskDurationMinutes) || 0;

  if (task.status !== TASK_STATUS.IN_PROGRESS || !task.startedAt) {
    return storedMinutes;
  }

  return storedMinutes + calculateDurationMinutes(task.startedAt, endTime);
}

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
      status: TASK_STATUS.PENDING
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
    await enforceDailyCutoff({ force: true });

    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_TASK_STATUSES.includes(status)) {
      throw new ApiError(400, 'status inválido.');
    }

    const task = await findTaskForUser(id, req.user);

    if (status === TASK_STATUS.IN_PROGRESS && isPastDailyCutoff()) {
      throw new ApiError(409, 'Después de las 6:00 p.m. no se puede iniciar una tarea.');
    }

    if (status === TASK_STATUS.PENDING) {
      task.status = TASK_STATUS.PENDING;
      task.startedAt = null;
      task.completedAt = null;
      task.stoppedAt = null;
      task.stoppedBy = null;
      task.stopReason = null;
      task.taskDurationMinutes = 0;
    }

    if (status === TASK_STATUS.IN_PROGRESS) {
      const wasAlreadyInProgress = task.status === TASK_STATUS.IN_PROGRESS;

      task.status = TASK_STATUS.IN_PROGRESS;
      task.startedAt = wasAlreadyInProgress && task.startedAt ? task.startedAt : new Date();
      task.completedAt = null;
      task.stoppedAt = null;
      task.stoppedBy = null;
      task.stopReason = null;
    }

    if (status === TASK_STATUS.STOPPED) {
      await stopTaskTimer(task, {
        stoppedAt: new Date(),
        stoppedBy: isSupervisor(req.user) ? req.user.id : undefined,
        reason: isSupervisor(req.user) ? 'Detenida por supervisor.' : 'Detenida por trabajador.'
      });

      return res.status(200).json({
        ok: true,
        data: task
      });
    }

    if (status === TASK_STATUS.COMPLETED) {
      const completedAt = new Date();
      const startedAt = task.startedAt || completedAt;
      const durationMinutes = getElapsedTaskMinutes(task, completedAt);

      task.status = TASK_STATUS.COMPLETED;
      task.startedAt = startedAt;
      task.completedAt = completedAt;
      task.stoppedAt = null;
      task.stopReason = null;
      task.taskDurationMinutes = durationMinutes;
    }

    await task.save();

    return res.status(200).json({
      ok: true,
      data: task
    });
  } catch (error) {
    return next(error);
  }
}

async function addTaskComment(req, res, next) {
  try {
    const { id } = req.params;
    const { text, source } = req.body;

    const normalizedText = String(text || '').trim();
    if (!normalizedText) {
      throw new ApiError(400, 'El comentario no puede estar vacío.');
    }

    const task = await findTaskForUser(id, req.user);

    task.comments.push({
      text: normalizedText,
      source: source === 'voice' ? 'voice' : 'typed',
      createdBy: req.user.id,
      createdByName: req.user.name,
      createdByRole: req.user.role
    });

    await task.save();

    return res.status(201).json({
      ok: true,
      data: task
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  addTaskComment,
  createTask,
  listMyTasks,
  updateTaskStatus
};
