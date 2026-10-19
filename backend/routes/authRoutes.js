const express = require("express");
const router = express.Router();

const { register,login,getCurrentUser,logout,firebaseLogin } = require("../controllers/authController");
const validateRequest = require("../middleware/validateRequest");
const { registerSchema,loginSchema } = require("../utils/validationSchemas");
const ensureAuthenticated = require("../middleware/ensureAuthenticated");


router.post("/register",validateRequest(registerSchema),register);
router.post("/login",validateRequest(loginSchema),login);
router.get("/me",ensureAuthenticated,getCurrentUser);
router.post("/logout",logout);
router.post("/firebase", firebaseLogin);

module.exports = router;