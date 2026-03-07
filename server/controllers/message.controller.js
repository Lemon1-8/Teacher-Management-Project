const db = require("../models");
const Message = db.message;
const User = db.user;
const Response = require("../utils/response");
const { Op } = require("sequelize");

/**
 * 发送消息
 */
exports.send = async (req, res) => {
  try {
    const { receiver_id, content } = req.body;
    
    if (!content) {
      return Response.error(res, "消息内容不能为空", 400);
    }

    const message = await Message.create({
      sender_id: req.userId,
      receiver_id,
      content
    });

    return Response.success(res, message, "发送成功");
  } catch (error) {
    return Response.error(res, "发送失败!", 500, error.message);
  }
};

/**
 * 获取联系人列表 (包含未读数和最后一条消息)
 */
exports.getContacts = async (req, res) => {
  try {
    const userId = req.userId;

    // 1. 找出所有与我聊过天的用户ID (无论发送还是接收)
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { sender_id: userId },
          { receiver_id: userId }
        ]
      },
      attributes: ['sender_id', 'receiver_id', 'created_at', 'content', 'is_read'],
      order: [['created_at', 'DESC']]
    });

    const contactMap = new Map();

    messages.forEach(msg => {
      const contactId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      
      if (!contactMap.has(contactId)) {
        contactMap.set(contactId, {
          contactId,
          lastMessage: msg.content,
          lastTime: msg.created_at,
          unreadCount: 0
        });
      }

      // 统计未读数 (仅统计对方发给我且未读的)
      if (msg.sender_id === contactId && msg.receiver_id === userId && !msg.is_read) {
        const contact = contactMap.get(contactId);
        contact.unreadCount++;
      }
    });

    const contactIds = Array.from(contactMap.keys());
    
    // 2. 获取联系人详情
    const users = await User.findAll({
      where: { id: contactIds },
      attributes: ['id', 'username', 'employee_id', 'role_id'],
      include: [{ model: db.role, attributes: ['name'] }]
    });

    const contacts = users.map(user => {
      const info = contactMap.get(user.id);
      if (!info) {
        // 理论上不会发生，因为 users 是根据 contactIds 查出来的
        console.warn(`User ${user.id} not found in contactMap`);
        return null;
      }
      return {
        id: user.id,
        username: user.username,
        role: user.role ? user.role.name : 'user', 
        ...info
      };
    }).filter(c => c !== null) // 过滤掉异常数据
    .sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));

    return Response.success(res, contacts);
  } catch (error) {
    console.error("Get contacts error:", error); // 打印详细错误堆栈
    return Response.error(res, "获取联系人失败!", 500, error.message);
  }
};

/**
 * 获取与某人的聊天记录
 */
exports.getMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const targetId = req.params.userId;

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { sender_id: userId, receiver_id: targetId },
          { sender_id: targetId, receiver_id: userId }
        ]
      },
      order: [['created_at', 'ASC']]
    });

    // 标记为已读
    await Message.update({ is_read: true }, {
      where: {
        sender_id: targetId,
        receiver_id: userId,
        is_read: false
      }
    });

    return Response.success(res, messages);
  } catch (error) {
    return Response.error(res, "获取消息记录失败!", 500, error.message);
  }
};
