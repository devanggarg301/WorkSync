const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../models/User");
const { firebaseAuth } = require("../config/firebaseAdmin");

const getPublicUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  avatarUrl: user.avatarUrl,
  createdAt: user.createdAt,
});

const createSessionToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    { sub: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

const registerUser = async ({ username, email, password }) => {
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    username,
    email: email.trim().toLowerCase(),
    passwordHash,
  });

  return getPublicUser(user);
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({
    email: email.trim().toLowerCase(),
  }).select("+passwordHash");

  if (!user || !user.passwordHash) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordMatches) {
    return null;
  }

  return {
    token: createSessionToken(user),
    user: getPublicUser(user),
  };
};

const createGoogleUsername = async (displayName, email, uid) => {
  const base = (displayName || email.split("@")[0])
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 30);

  const safeBase =
    base.length >= 3
      ? base
      : `user${uid.slice(0, 6).toLowerCase()}`;

  let username = safeBase;

  if (await User.exists({ username })) {
    username = `${safeBase.slice(0, 23)}_${uid
      .slice(-6)
      .toLowerCase()}`;
  }
  while (await User.exists({ username })) {
    username = `${safeBase.slice(0, 20)}_${crypto
      .randomBytes(4)
      .toString("hex")}`;
  }

  return username;
};

const loginWithFirebase = async (idToken) => {
  let decodedToken;
  try {
    decodedToken = await firebaseAuth.verifyIdToken(idToken);
  } catch {
    const error = new Error("Invalid Firebase ID token");
    error.statusCode = 401;
    throw error;
  }

  if (decodedToken.firebase?.sign_in_provider !== "google.com") {
    const error = new Error("Please sign in using Google.");
    error.statusCode = 401;
    throw error;
  }

  if (
    !decodedToken.email ||
    decodedToken.email_verified !== true
  ) {
    const error = new Error(
      "A verified Google email address is required."
    );
    error.statusCode = 403;
    throw error;
  }

  const firebaseUid = decodedToken.uid;
  const email = decodedToken.email.trim().toLowerCase();

  
  let user = await User.findOne({ firebaseUid });

  if (!user) {
    
    
    user = await User.findOne({ email });

    if (user) {
      if (
        user.firebaseUid &&
        user.firebaseUid !== firebaseUid
      ) {
        const error = new Error(
          "This WorkSync account is linked to another Google account."
        );
        error.statusCode = 409;
        throw error;
      }

      user.firebaseUid = firebaseUid;

      if (!user.avatarUrl && decodedToken.picture) {
        user.avatarUrl = decodedToken.picture;
      }

      await user.save();
    } else {
      
      const username = await createGoogleUsername(
        decodedToken.name,
        email,
        firebaseUid
      );

      user = await User.create({
        username,
        email,
        firebaseUid,
        avatarUrl: decodedToken.picture || "",
      });
    }
  }

  return {
    token: createSessionToken(user),
    user: getPublicUser(user),
  };
};

module.exports = {registerUser,loginUser,loginWithFirebase,};