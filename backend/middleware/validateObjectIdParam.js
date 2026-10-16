const mongoose = require("mongoose");

const validateObjectIdParam = (paramName) => {
  return (req, res, next) => {
    const value = req.params[paramName];

    if (!mongoose.isValidObjectId(value)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName}`,
      });
    }

    next();
  };
};

module.exports = validateObjectIdParam;