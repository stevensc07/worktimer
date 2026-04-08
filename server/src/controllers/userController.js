const ApiError = require('../utils/ApiError');
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

async function createUser(req, res, next) {
  try {
    const { employeeId, name, role, pin } = req.body;

    if (!employeeId || !name || !pin) {
      throw new ApiError(400, 'employeeId, name y pin son obligatorios.');
    }

    const normalizedEmployeeId = String(employeeId).trim().toUpperCase();
    const normalizedName = String(name).trim();
    const normalizedRole = role || USER_ROLES.WORKER;

    if (!Object.values(USER_ROLES).includes(normalizedRole)) {
      throw new ApiError(400, 'Rol inválido. Debe ser OBRERO o SUPERVISOR.');
    }

    if (String(pin).length < 4) {
      throw new ApiError(400, 'El pin debe tener al menos 4 caracteres.');
    }

    const exists = await User.findOne({ employeeId: normalizedEmployeeId });
    if (exists) {
      throw new ApiError(409, 'Ya existe un usuario con ese ID de empleado.');
    }

    const passwordHash = await User.hashPassword(String(pin));
    const user = await User.create({
      employeeId: normalizedEmployeeId,
      name: normalizedName,
      role: normalizedRole,
      passwordHash
    });

    return res.status(201).json({
      ok: true,
      data: {
        id: user.id,
        employeeId: user.employeeId,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listWorkers,
  createUser
};
