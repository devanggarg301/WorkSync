const jwt = require("jsonwebtoken");
const User = require("../models/User");

const ensureAuthenticated = async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session",
    });
  }

  // checking the token's subject(sub)-->the payload of token
  if (!decoded.sub) {
    return res.status(401).json({
      success: false,
      message: "Invalid session",
    });
  }

  try {
    const user = await User.findById(decoded.sub).select(
      "_id username email avatarUrl"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    req.user = user;

    return next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = ensureAuthenticated;