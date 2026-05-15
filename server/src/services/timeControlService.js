const WorkSession = require('../models/WorkSession');
const { Task, TASK_STATUS } = require('../models/Task');
const logger = require('../utils/logger');

const BOSTON_TIME_ZONE = 'America/New_York';
const DAILY_CUTOFF_HOUR = 18;
const CUTOFF_REASON = 'Cierre automático de las 6:00 p.m. horario de Boston.';
const ENFORCE_THROTTLE_MS = 30 * 1000;

let lastEnforcedAt = 0;

function calculateDurationMinutes(startTime, endTime) {
  if (!startTime || !endTime) {
    return 0;
  }

  return Math.max(0, Math.round((new Date(endTime) - new Date(startTime)) / 60000));
}

function getBostonDateParts(date = new Date(), timeZone = BOSTON_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)])
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second
  };
}

function getTimeZoneOffsetMs(date, timeZone = BOSTON_TIME_ZONE) {
  const parts = getBostonDateParts(date, timeZone);
  const localTimeAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return localTimeAsUtc - date.getTime();
}

function zonedDateTimeToUtc({ year, month, day, hour, minute = 0, second = 0 }, timeZone = BOSTON_TIME_ZONE) {
  const localTimeAsUtc = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  let utcTime = localTimeAsUtc;

  for (let index = 0; index < 3; index += 1) {
    const offset = getTimeZoneOffsetMs(new Date(utcTime), timeZone);
    const nextUtcTime = localTimeAsUtc - offset;

    if (nextUtcTime === utcTime) {
      break;
    }

    utcTime = nextUtcTime;
  }

  return new Date(utcTime);
}

function getTodayCutoffBoston(date = new Date()) {
  const { year, month, day } = getBostonDateParts(date);

  return zonedDateTimeToUtc({
    year,
    month,
    day,
    hour: DAILY_CUTOFF_HOUR
  });
}

function getBostonStartOfDay(date = new Date()) {
  const { year, month, day } = getBostonDateParts(date);

  return zonedDateTimeToUtc({ year, month, day, hour: 0 });
}

function getBostonStartOfWeek(date = new Date()) {
  const { year, month, day } = getBostonDateParts(date);
  const localDate = new Date(Date.UTC(year, month - 1, day));
  const daysFromMonday = (localDate.getUTCDay() + 6) % 7;

  localDate.setUTCDate(localDate.getUTCDate() - daysFromMonday);

  return zonedDateTimeToUtc({
    year: localDate.getUTCFullYear(),
    month: localDate.getUTCMonth() + 1,
    day: localDate.getUTCDate(),
    hour: 0
  });
}

function getBostonStartOfMonth(date = new Date()) {
  const { year, month } = getBostonDateParts(date);

  return zonedDateTimeToUtc({
    year,
    month,
    day: 1,
    hour: 0
  });
}

function getBostonPeriodEnd(periodStart, granularity) {
  const { year, month, day } = getBostonDateParts(periodStart);
  const localStart = new Date(Date.UTC(year, month - 1, day));

  if (granularity === 'daily') {
    localStart.setUTCDate(localStart.getUTCDate() + 1);
  } else if (granularity === 'weekly') {
    localStart.setUTCDate(localStart.getUTCDate() + 7);
  } else {
    localStart.setUTCMonth(localStart.getUTCMonth() + 1);
  }

  const nextStart = zonedDateTimeToUtc({
    year: localStart.getUTCFullYear(),
    month: localStart.getUTCMonth() + 1,
    day: localStart.getUTCDate(),
    hour: 0
  });

  return new Date(nextStart.getTime() - 1);
}

function isPastDailyCutoff(date = new Date()) {
  return date.getTime() >= getTodayCutoffBoston(date).getTime();
}

async function closeWorkSession(session, options = {}) {
  const closedAt = options.closedAt || new Date();

  session.endTime = closedAt;
  session.durationMinutes = calculateDurationMinutes(session.startTime, closedAt);
  session.status = 'CLOSED';
  session.closeReason = options.reason || null;
  session.autoClosed = Boolean(options.autoClosed);

  if (options.closedBy) {
    session.closedBy = options.closedBy;
    session.closedByRole = options.closedByRole || null;
  }

  if (options.checkOutLocation) {
    session.checkOutLocation = options.checkOutLocation;
  }

  await session.save();
  return session;
}

async function stopTaskTimer(task, options = {}) {
  const stoppedAt = options.stoppedAt || new Date();
  const previousMinutes = Number(task.taskDurationMinutes) || 0;
  const activeMinutes = task.startedAt ? calculateDurationMinutes(task.startedAt, stoppedAt) : 0;

  task.status = TASK_STATUS.STOPPED;
  task.stoppedAt = stoppedAt;
  task.stopReason = options.reason || null;
  task.taskDurationMinutes = previousMinutes + activeMinutes;
  task.completedAt = null;

  if (options.stoppedBy) {
    task.stoppedBy = options.stoppedBy;
  }

  await task.save();
  return task;
}

async function enforceDailyCutoff(options = {}) {
  const now = options.now || new Date();

  if (!options.force && now.getTime() - lastEnforcedAt < ENFORCE_THROTTLE_MS) {
    return { ran: false, workSessionsClosed: 0, tasksStopped: 0 };
  }

  lastEnforcedAt = now.getTime();

  const [openSessions, activeTasks] = await Promise.all([
    WorkSession.find({ status: 'OPEN' }),
    Task.find({ status: TASK_STATUS.IN_PROGRESS })
  ]);

  const sessionsToClose = openSessions
    .map((session) => ({
      session,
      cutoff: getTodayCutoffBoston(session.startTime || now)
    }))
    .filter(({ cutoff }) => now.getTime() >= cutoff.getTime());

  const tasksToStop = activeTasks
    .map((task) => ({
      task,
      cutoff: getTodayCutoffBoston(task.startedAt || now)
    }))
    .filter(({ cutoff }) => now.getTime() >= cutoff.getTime());

  await Promise.all(
    sessionsToClose.map(({ session, cutoff }) =>
      closeWorkSession(session, {
        closedAt: session.startTime && new Date(session.startTime) <= cutoff ? cutoff : now,
        reason: CUTOFF_REASON,
        autoClosed: true
      })
    )
  );

  await Promise.all(
    tasksToStop.map(({ task, cutoff }) =>
      stopTaskTimer(task, {
        stoppedAt: task.startedAt && new Date(task.startedAt) <= cutoff ? cutoff : now,
        reason: CUTOFF_REASON,
        autoClosed: true
      })
    )
  );

  if (sessionsToClose.length || tasksToStop.length) {
    logger.info('Corte automático de jornada aplicado.', {
      now: now.toISOString(),
      workSessionsClosed: sessionsToClose.length,
      tasksStopped: tasksToStop.length
    });
  }

  return {
    ran: true,
    workSessionsClosed: sessionsToClose.length,
    tasksStopped: tasksToStop.length
  };
}

module.exports = {
  BOSTON_TIME_ZONE,
  CUTOFF_REASON,
  DAILY_CUTOFF_HOUR,
  calculateDurationMinutes,
  closeWorkSession,
  enforceDailyCutoff,
  getBostonDateParts,
  getBostonPeriodEnd,
  getBostonStartOfDay,
  getBostonStartOfMonth,
  getBostonStartOfWeek,
  getTodayCutoffBoston,
  isPastDailyCutoff,
  stopTaskTimer
};
