const { registerUser,loginUser,loginWithFirebase } = require("../services/authService");

const setSessionCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000,
    path: "/",
  });
};

const register = async (req, res) => {
  try {
    const user = await registerUser(req.body);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    // MongoDB duplicate-key error.
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];

      return res.status(409).json({
        success: false,
        message: `${field || "Username or email"} already exists`,
      });
    }

    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const login = async (req, res) => {
  try {
    const result = await loginUser(req.body);

    if (!result) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const { token, user } = result;

    setSessionCookie(res, token);

    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getCurrentUser = (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};

const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

const firebaseLogin = async (req, res) => {
  const { idToken } = req.body;

  if (typeof idToken !== "string" || !idToken.trim()) {
    return res.status(400).json({
      success: false,
      message: "Firebase ID token is required.",
    });
  }

  try {
    const result = await loginWithFirebase(idToken);

    setSessionCookie(res, result.token);

    return res.status(200).json({
      success: true,
      message: "Google login successful.",
      user: result.user,
    });
  } catch (error) {
    const statusCode =
      error.statusCode || (error.code === 11000 ? 409 : 500);

    if (statusCode === 500) {
      console.error("Firebase login error:", error.message);
    }

    const message =
      statusCode === 401
        ? "Google sign-in could not be verified. Please try again."
        : statusCode === 403 || statusCode === 409
          ? error.message
          : statusCode === 400
            ? error.message
            : "Unable to sign in with Google. Please try again.";

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
};

module.exports = { register,login,getCurrentUser,logout,firebaseLogin};