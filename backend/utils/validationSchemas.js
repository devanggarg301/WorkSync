const Joi = require("joi");

const registerSchema = Joi.object({
  username: Joi.string().trim().min(3).max(30).required(),
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().min(3).max(72).required(),
});

module.exports = { registerSchema };

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().min(3).max(72).required(),
});

const createWorkspaceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  description: Joi.string().trim().max(500).allow("").default(""),
});

const updateWorkspaceSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  description: Joi.string().trim().max(500).allow(""),
}).min(1);

const updateWorkspaceMemberRoleSchema = Joi.object({
  role: Joi.string().valid("admin", "member").required(),
});

const addWorkspaceMemberSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
});


const createProjectSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  key: Joi.string().trim().uppercase().pattern(/^[A-Z][A-Z0-9]{1,9}$/).required(),
  description: Joi.string().trim().max(1000).allow("").default(""),
});


const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).required(),
  description: Joi.string().trim().max(5000).allow("").default(""),
  status: Joi.string().valid("backlog", "todo", "in_progress", "in_review", "done").default("todo"),
  priority: Joi.string().valid("low", "medium", "high", "urgent").default("medium"),
  assigneeId: Joi.string().hex().length(24).allow(null).optional(),
  dueDate: Joi.date().iso().allow(null).optional(),
  labels: Joi.array().items(  Joi.string().trim().min(1).max(30)).max(10).default([]),
});

const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200),
  description: Joi.string().trim().max(5000).allow(""),
  status: Joi.string().valid("backlog", "todo", "in_progress", "in_review", "done"),
  priority: Joi.string().valid("low", "medium", "high", "urgent"),
  assigneeId: Joi.string().hex().length(24).allow(null),
  dueDate: Joi.date().iso().allow(null),
  labels: Joi.array().items(Joi.string().trim().min(1).max(30)).max(10),
}).min(1);

const taskMoveSchema = Joi.object({
  status: Joi.string().valid("backlog", "todo", "in_progress", "in_review", "done").required(),
  position: Joi.number().integer().min(0).required(),
});

const taskCommentSchema = Joi.object({
  body: Joi.string().trim().min(1).max(3000).required(),
});

module.exports = {registerSchema,loginSchema,createWorkspaceSchema,updateWorkspaceSchema,updateWorkspaceMemberRoleSchema,addWorkspaceMemberSchema,createProjectSchema,createTaskSchema,updateTaskSchema,taskMoveSchema,taskCommentSchema };