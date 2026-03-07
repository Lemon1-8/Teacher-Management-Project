const db = require("../models");
const TrainingType = db.trainingType;
const Response = require("../utils/response");

/**
 * 获取所有培训类型
 */
exports.findAll = async (req, res) => {
  try {
    const types = await TrainingType.findAll({
      where: { status: 1 },
      order: [['sort', 'ASC']]
    });
    return Response.success(res, types);
  } catch (error) {
    return Response.error(res, "获取培训类型失败!", 500, error.message);
  }
};

/**
 * 创建培训类型
 */
exports.create = async (req, res) => {
  try {
    const type = await TrainingType.create(req.body);
    return Response.success(res, type, "创建成功", 201);
  } catch (error) {
    return Response.error(res, "无法创建培训类型!", 500, error.message);
  }
};

/**
 * 更新培训类型
 */
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    await TrainingType.update(req.body, { where: { id } });
    return Response.success(res, {}, "更新成功");
  } catch (error) {
    return Response.error(res, "更新失败!", 500, error.message);
  }
};

/**
 * 删除培训类型
 */
exports.delete = async (req, res) => {
  try {
    const id = req.params.id;
    await TrainingType.destroy({ where: { id } });
    return Response.success(res, {}, "删除成功");
  } catch (error) {
    return Response.error(res, "删除失败!", 500, error.message);
  }
};
