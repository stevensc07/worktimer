const mongoose = require('mongoose');
const WorkSession = require('../models/WorkSession');
const Task = require('../models/Task');
const { User, USER_ROLES } = require('../models/User');
const ApiError = require('../utils/ApiError');

function toHours(minutes = 0) {
  return Number((minutes / 60).toFixed(2));
}

function toObjectId(value) {
  return new mongoose.Types.ObjectId(value);
}

function getStartOfWeek(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const day = (start.getDay() + 6) % 7; // lunes = 0
  start.setDate(start.getDate() - day);

  return start;
}

function getStartOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function mapGeoPoint(geoPoint) {
  if (!geoPoint?.coordinates || geoPoint.coordinates.length !== 2) {
    return null;
  }

  return {
    lng: geoPoint.coordinates[0],
    lat: geoPoint.coordinates[1]
  };
}

function periodKey(value) {
  return new Date(value).toISOString();
}

function periodEnd(periodStart, granularity) {
  const end = new Date(periodStart);

  if (granularity === 'daily') {
    end.setDate(end.getDate() + 1);
  } else if (granularity === 'weekly') {
    end.setDate(end.getDate() + 7);
  } else {
    end.setMonth(end.getMonth() + 1);
  }

  end.setMilliseconds(end.getMilliseconds() - 1);
  return end;
}

function mergePeriodRows(hoursRows = [], taskRows = [], granularity) {
  const hoursByPeriod = new Map(hoursRows.map((row) => [periodKey(row._id), row]));
  const tasksByPeriod = new Map(taskRows.map((row) => [periodKey(row._id), row]));

  const orderedKeys = [...new Set([...hoursByPeriod.keys(), ...tasksByPeriod.keys()])]
    .sort((a, b) => new Date(b) - new Date(a));

  return orderedKeys.map((key) => {
    const hours = hoursByPeriod.get(key);
    const tasks = tasksByPeriod.get(key);
    const start = new Date(key);

    const totalMinutes = hours?.totalMinutes || 0;
    const totalTaskCompletionMinutes = tasks?.totalTaskCompletionMinutes || 0;
    const avgTaskCompletionMinutes = tasks?.avgTaskCompletionMinutes
      ? Number(tasks.avgTaskCompletionMinutes.toFixed(2))
      : 0;

    return {
      periodStart: start,
      periodEnd: periodEnd(start, granularity),
      totalMinutes,
      totalHours: toHours(totalMinutes),
      sessions: hours?.sessions || 0,
      completedTasks: tasks?.completedTasks || 0,
      totalTaskCompletionMinutes,
      totalTaskCompletionHours: toHours(totalTaskCompletionMinutes),
      avgTaskCompletionMinutes,
      avgTaskCompletionHours: toHours(avgTaskCompletionMinutes)
    };
  });
}

async function getHoursMetrics(req, res, next) {
  try {
    let { workerId } = req.query;

    if (req.user.role === USER_ROLES.WORKER) {
      workerId = req.user.id;
    }

    if (req.user.role === USER_ROLES.SUPERVISOR && (!workerId || !mongoose.isValidObjectId(workerId))) {
      throw new ApiError(400, 'Debes enviar workerId válido en query params.');
    }

    if (!workerId || !mongoose.isValidObjectId(workerId)) {
      throw new ApiError(400, 'No se pudo determinar el trabajador para consultar métricas.');
    }

    const workerObjectId = new mongoose.Types.ObjectId(workerId);

    const [hoursAggregation = [], tasksAggregation = []] = await Promise.all([
      WorkSession.aggregate([
        {
          $match: {
            workerId: workerObjectId,
            startTime: { $ne: null }
          }
        },
        {
          $addFields: {
            effectiveEndTime: {
              $ifNull: ['$endTime', '$$NOW']
            },
            effectiveDurationMinutes: {
              $max: [
                0,
                {
                  $dateDiff: {
                    startDate: '$startTime',
                    endDate: {
                      $ifNull: ['$endTime', '$$NOW']
                    },
                    unit: 'minute'
                  }
                }
              ]
            },
            dayStart: {
              $dateTrunc: {
                date: '$startTime',
                unit: 'day',
                timezone: 'America/Bogota'
              }
            },
            weekStart: {
              $dateTrunc: {
                date: '$startTime',
                unit: 'week',
                timezone: 'America/Bogota'
              }
            },
            monthStart: {
              $dateTrunc: {
                date: '$startTime',
                unit: 'month',
                timezone: 'America/Bogota'
              }
            }
          }
        },
        {
          $facet: {
            daily: [
              {
                $group: {
                  _id: '$dayStart',
                  totalMinutes: { $sum: '$effectiveDurationMinutes' },
                  sessions: { $sum: 1 }
                }
              },
              { $sort: { _id: -1 } }
            ],
            weekly: [
              {
                $group: {
                  _id: '$weekStart',
                  totalMinutes: { $sum: '$effectiveDurationMinutes' },
                  sessions: { $sum: 1 }
                }
              },
              { $sort: { _id: -1 } }
            ],
            monthly: [
              {
                $group: {
                  _id: '$monthStart',
                  totalMinutes: { $sum: '$effectiveDurationMinutes' },
                  sessions: { $sum: 1 }
                }
              },
              { $sort: { _id: -1 } }
            ],
            sessions: [
              {
                $project: {
                  _id: 1,
                  startTime: 1,
                  endTime: '$effectiveEndTime',
                  isOpen: { $eq: ['$endTime', null] },
                  durationMinutes: '$effectiveDurationMinutes'
                }
              },
              { $sort: { startTime: -1 } },
              { $limit: 200 }
            ]
          }
        }
      ]),
      Task.aggregate([
        {
          $match: {
            workerId: workerObjectId,
            status: 'COMPLETED',
            updatedAt: { $ne: null }
          }
        },
        {
          $addFields: {
            completionMinutes: {
              $max: [
                0,
                {
                  $dateDiff: {
                    startDate: '$createdAt',
                    endDate: '$updatedAt',
                    unit: 'minute'
                  }
                }
              ]
            },
            dayStart: {
              $dateTrunc: {
                date: '$updatedAt',
                unit: 'day',
                timezone: 'America/Bogota'
              }
            },
            weekStart: {
              $dateTrunc: {
                date: '$updatedAt',
                unit: 'week',
                timezone: 'America/Bogota'
              }
            },
            monthStart: {
              $dateTrunc: {
                date: '$updatedAt',
                unit: 'month',
                timezone: 'America/Bogota'
              }
            }
          }
        },
        {
          $facet: {
            daily: [
              {
                $group: {
                  _id: '$dayStart',
                  completedTasks: { $sum: 1 },
                  totalTaskCompletionMinutes: { $sum: '$completionMinutes' },
                  avgTaskCompletionMinutes: { $avg: '$completionMinutes' }
                }
              },
              { $sort: { _id: -1 } }
            ],
            weekly: [
              {
                $group: {
                  _id: '$weekStart',
                  completedTasks: { $sum: 1 },
                  totalTaskCompletionMinutes: { $sum: '$completionMinutes' },
                  avgTaskCompletionMinutes: { $avg: '$completionMinutes' }
                }
              },
              { $sort: { _id: -1 } }
            ],
            monthly: [
              {
                $group: {
                  _id: '$monthStart',
                  completedTasks: { $sum: 1 },
                  totalTaskCompletionMinutes: { $sum: '$completionMinutes' },
                  avgTaskCompletionMinutes: { $avg: '$completionMinutes' }
                }
              },
              { $sort: { _id: -1 } }
            ],
            taskCompletions: [
              {
                $project: {
                  _id: 1,
                  description: 1,
                  createdAt: 1,
                  completedAt: '$updatedAt',
                  completionMinutes: 1
                }
              },
              { $sort: { completedAt: -1 } },
              { $limit: 200 }
            ]
          }
        }
      ])
    ]);

    const hoursResult = hoursAggregation[0] || {};
    const tasksResult = tasksAggregation[0] || {};

    const daily = mergePeriodRows(hoursResult.daily, tasksResult.daily, 'daily');
    const weekly = mergePeriodRows(hoursResult.weekly, tasksResult.weekly, 'weekly');
    const monthly = mergePeriodRows(hoursResult.monthly, tasksResult.monthly, 'monthly');

    const taskCompletions = (tasksResult.taskCompletions || []).map((task) => ({
      taskId: task._id,
      description: task.description,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
      completionMinutes: task.completionMinutes,
      completionHours: toHours(task.completionMinutes)
    }));
    const sessions = (hoursResult.sessions || []).map((session) => ({
      sessionId: session._id,
      startTime: session.startTime,
      endTime: session.endTime,
      isOpen: session.isOpen,
      durationMinutes: session.durationMinutes,
      durationHours: toHours(session.durationMinutes)
    }));

    const totalWorkedMinutes = daily.reduce((acc, item) => acc + item.totalMinutes, 0);
    const totalCompletedTasks = taskCompletions.length;
    const totalTaskCompletionMinutes = taskCompletions.reduce(
      (acc, item) => acc + item.completionMinutes,
      0
    );
    const avgTaskCompletionMinutes = totalCompletedTasks
      ? Number((totalTaskCompletionMinutes / totalCompletedTasks).toFixed(2))
      : 0;

    return res.status(200).json({
      ok: true,
      data: {
        workerId,
        daily,
        weekly,
        monthly,
        sessions,
        taskCompletions,
        totals: {
          totalWorkedMinutes,
          totalWorkedHours: toHours(totalWorkedMinutes),
          totalCompletedTasks,
          totalTaskCompletionMinutes,
          totalTaskCompletionHours: toHours(totalTaskCompletionMinutes),
          avgTaskCompletionMinutes,
          avgTaskCompletionHours: toHours(avgTaskCompletionMinutes)
        }
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getWorkersOverview(req, res, next) {
  try {
    const { workerId } = req.query;

    const workerFilter = { role: USER_ROLES.WORKER };

    if (workerId) {
      if (!mongoose.isValidObjectId(workerId)) {
        throw new ApiError(400, 'workerId inválido.');
      }

      workerFilter._id = toObjectId(workerId);
    }

    const workers = await User.find(workerFilter)
      .select('_id employeeId name role')
      .sort({ name: 1 })
      .lean();

    if (!workers.length) {
      return res.status(200).json({
        ok: true,
        data: {
          summary: {
            totalWorkers: 0,
            activeWorkers: 0,
            totalWeekHours: 0,
            totalMonthHours: 0,
            totalPendingTasks: 0,
            totalCompletedTasks: 0,
            completionRate: 0
          },
          workers: []
        }
      });
    }

    const workerObjectIds = workers.map((worker) => worker._id);
    const now = new Date();
    const startOfWeek = getStartOfWeek(now);
    const startOfMonth = getStartOfMonth(now);

    const [hoursMetrics, taskMetrics, activeSessions] = await Promise.all([
      WorkSession.aggregate([
        {
          $match: {
            workerId: { $in: workerObjectIds },
            startTime: { $ne: null }
          }
        },
        {
          $addFields: {
            effectiveDurationMinutes: {
              $max: [
                0,
                {
                  $dateDiff: {
                    startDate: '$startTime',
                    endDate: {
                      $ifNull: ['$endTime', '$$NOW']
                    },
                    unit: 'minute'
                  }
                }
              ]
            }
          }
        },
        {
          $group: {
            _id: '$workerId',
            weekMinutes: {
              $sum: {
                $cond: [
                  {
                    $gte: ['$startTime', startOfWeek]
                  },
                  '$effectiveDurationMinutes',
                  0
                ]
              }
            },
            monthMinutes: {
              $sum: {
                $cond: [
                  {
                    $gte: ['$startTime', startOfMonth]
                  },
                  '$effectiveDurationMinutes',
                  0
                ]
              }
            },
            totalMinutes: { $sum: '$effectiveDurationMinutes' }
          }
        }
      ]),
      Task.aggregate([
        {
          $match: {
            workerId: { $in: workerObjectIds }
          }
        },
        {
          $group: {
            _id: '$workerId',
            totalTasks: { $sum: 1 },
            pendingTasks: {
              $sum: {
                $cond: [{ $eq: ['$status', 'PENDING'] }, 1, 0]
              }
            },
            inProgressTasks: {
              $sum: {
                $cond: [{ $eq: ['$status', 'IN_PROGRESS'] }, 1, 0]
              }
            },
            completedTasks: {
              $sum: {
                $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0]
              }
            }
          }
        }
      ]),
      WorkSession.find({
        workerId: { $in: workerObjectIds },
        status: 'OPEN'
      })
        .select('workerId startTime checkInLocation')
        .lean()
    ]);

    const hoursByWorker = new Map(
      hoursMetrics.map((item) => [item._id.toString(), item])
    );

    const tasksByWorker = new Map(
      taskMetrics.map((item) => [item._id.toString(), item])
    );

    const activeSessionsByWorker = new Map(
      activeSessions.map((session) => [session.workerId.toString(), session])
    );

    const workersWithMetrics = workers.map((worker) => {
      const key = worker._id.toString();
      const hours = hoursByWorker.get(key);
      const tasks = tasksByWorker.get(key);
      const activeSession = activeSessionsByWorker.get(key);

      return {
        id: worker._id,
        name: worker.name,
        employeeId: worker.employeeId,
        weekHours: toHours(hours?.weekMinutes || 0),
        monthHours: toHours(hours?.monthMinutes || 0),
        totalHours: toHours(hours?.totalMinutes || 0),
        tasks: {
          total: tasks?.totalTasks || 0,
          pending: tasks?.pendingTasks || 0,
          inProgress: tasks?.inProgressTasks || 0,
          completed: tasks?.completedTasks || 0
        },
        activeSession: activeSession
          ? {
              startTime: activeSession.startTime,
              checkInLocation: mapGeoPoint(activeSession.checkInLocation)
            }
          : null
      };
    });

    const totalWorkers = workersWithMetrics.length;
    const activeWorkers = workersWithMetrics.filter((item) => Boolean(item.activeSession)).length;
    const totalWeekHours = Number(
      workersWithMetrics.reduce((acc, item) => acc + item.weekHours, 0).toFixed(2)
    );
    const totalMonthHours = Number(
      workersWithMetrics.reduce((acc, item) => acc + item.monthHours, 0).toFixed(2)
    );
    const totalPendingTasks = workersWithMetrics.reduce((acc, item) => acc + item.tasks.pending, 0);
    const totalCompletedTasks = workersWithMetrics.reduce((acc, item) => acc + item.tasks.completed, 0);
    const totalTasks = workersWithMetrics.reduce((acc, item) => acc + item.tasks.total, 0);

    const completionRate = totalTasks ? Number(((totalCompletedTasks / totalTasks) * 100).toFixed(1)) : 0;

    return res.status(200).json({
      ok: true,
      data: {
        summary: {
          totalWorkers,
          activeWorkers,
          totalWeekHours,
          totalMonthHours,
          totalPendingTasks,
          totalCompletedTasks,
          completionRate
        },
        workers: workersWithMetrics
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getActiveLocations(req, res, next) {
  try {
    const workers = await User.find({ role: USER_ROLES.WORKER }).select('_id employeeId name').lean();

    if (!workers.length) {
      return res.status(200).json({
        ok: true,
        data: []
      });
    }

    const workerIds = workers.map((worker) => worker._id);
    const workerById = new Map(workers.map((worker) => [worker._id.toString(), worker]));

    const activeSessions = await WorkSession.find({
      workerId: { $in: workerIds },
      status: 'OPEN'
    })
      .select('workerId startTime checkInLocation')
      .lean();

    const locations = activeSessions.map((session) => {
      const worker = workerById.get(session.workerId.toString());

      return {
        workerId: session.workerId,
        employeeId: worker?.employeeId,
        name: worker?.name,
        startTime: session.startTime,
        location: mapGeoPoint(session.checkInLocation)
      };
    });

    return res.status(200).json({
      ok: true,
      data: locations
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getHoursMetrics,
  getWorkersOverview,
  getActiveLocations
};
