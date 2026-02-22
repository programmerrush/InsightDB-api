const ApiResponse = require("../utils/apiResponse");

/**
 * Request validation middleware using Joi schemas
 * @param {Object} schema - Joi validation schema object { body, params, query }
 */
function validate(schema) {
  return (req, res, next) => {
    const errors = [];

    if (schema.body) {
      const { error } = schema.body.validate(req.body, { abortEarly: false });
      if (error) {
        errors.push(
          ...error.details.map((d) => ({
            field: d.path.join("."),
            message: d.message,
          })),
        );
      }
    }

    if (schema.params) {
      const { error } = schema.params.validate(req.params, {
        abortEarly: false,
      });
      if (error) {
        errors.push(
          ...error.details.map((d) => ({
            field: d.path.join("."),
            message: d.message,
          })),
        );
      }
    }

    if (schema.query) {
      const { error } = schema.query.validate(req.query, { abortEarly: false });
      if (error) {
        errors.push(
          ...error.details.map((d) => ({
            field: d.path.join("."),
            message: d.message,
          })),
        );
      }
    }

    if (errors.length > 0) {
      return ApiResponse.error(res, "Validation failed", 400, errors);
    }

    next();
  };
}

module.exports = validate;
