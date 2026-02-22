const Joi = require("joi");

const executeQuery = {
  body: Joi.object({
    connectionId: Joi.string().uuid().required(),
    sql: Joi.string().min(1).max(50000).required(),
    title: Joi.string().max(200).default("Untitled Query"),
  }),
};

const saveQuery = {
  body: Joi.object({
    connectionId: Joi.string().uuid().required(),
    sql: Joi.string().min(1).max(50000).required(),
    title: Joi.string().min(1).max(200).required(),
  }),
};

module.exports = { executeQuery, saveQuery };
