/**
 * Standardized API response helpers
 */

class ApiResponse {
  static success(res, data = null, message = "Success", statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static created(res, data = null, message = "Created successfully") {
    return res.status(201).json({
      success: true,
      message,
      data,
    });
  }

  static error(
    res,
    message = "Something went wrong",
    statusCode = 500,
    errors = null,
  ) {
    const response = {
      success: false,
      message,
    };
    if (errors) response.errors = errors;
    return res.status(statusCode).json(response);
  }

  static paginated(res, data, page, limit, total) {
    return res.status(200).json({
      success: true,
      message: "Success",
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
}

module.exports = ApiResponse;
