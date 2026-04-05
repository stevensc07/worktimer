const { User, USER_ROLES } = require('../models/User');

async function listWorkers(req, res, next) {
  try {
    const workers = await User.find({ role: USER_ROLES.WORKER })
      .select('_id employeeId name role createdAt')
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      ok: true,
      data: workers
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listWorkers
};
