const router = require("express").Router();
const {
  login,
  register,
  activateAccount,
  logout,
  refresh,
  auth,
  refreshActivationToken,
} = require("../controllers/userController");

router.post("/register", register);
router.post("/activate", activateAccount);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.post("/auth", auth);
router.post("/refreshActivation", refreshActivationToken);

module.exports = router;
