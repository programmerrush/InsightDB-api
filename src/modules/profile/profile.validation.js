const Joi = require("joi");

const updateProfile = {
  body: Joi.object({
    fullName: Joi.string().min(2).max(100),
    avatar: Joi.string().uri().allow(null),
  }).min(1),
};

const updateEmail = {
  body: Joi.object({
    email: Joi.string().email().required(),
  }),
};

module.exports = { updateProfile, updateEmail };
