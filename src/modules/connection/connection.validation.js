const Joi = require("joi");

const createConnection = {
  body: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    dbType: Joi.string().valid("postgresql", "mysql").required(),
    host: Joi.string().required(),
    port: Joi.number().integer().min(1).max(65535).required(),
    database: Joi.string().required(),
    username: Joi.string().required(),
    password: Joi.string().required(),
    ssl: Joi.boolean().default(false),
  }),
};

const testConnection = {
  body: Joi.object({
    dbType: Joi.string().valid("postgresql", "mysql").required(),
    host: Joi.string().required(),
    port: Joi.number().integer().min(1).max(65535).required(),
    database: Joi.string().required(),
    username: Joi.string().required(),
    password: Joi.string().required(),
    ssl: Joi.boolean().default(false),
  }),
};

const updateConnection = {
  body: Joi.object({
    name: Joi.string().min(1).max(100),
    host: Joi.string(),
    port: Joi.number().integer().min(1).max(65535),
    database: Joi.string(),
    username: Joi.string(),
    password: Joi.string(),
    ssl: Joi.boolean(),
  }).min(1),
};

module.exports = { createConnection, testConnection, updateConnection };
