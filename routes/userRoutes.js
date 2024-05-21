const router = require("express").Router();
const {
  login,
  register,
  activateAccount,
  logout,
  refresh,
  auth,
  refreshActivationToken,
  deleteUser,
  updateUser,
  getUsers,
  getUserByUsername,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  forgotPassword,
  resetPassword,
  updateUserEmail,
  updateUserPassword,
  suspendUser,
  unsuspendUser,
  getUserById,
} = require("../controllers/userController");

router.post("/register", register);
router.post("/activate", activateAccount);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.post("/auth", auth);
router.post("/refreshActivation", refreshActivationToken);
router.delete("/delete", deleteUser);
router.put("/update", updateUser);
router.get("/", getUsers);
router.get("/username/:username", getUserByUsername);
router.put("/:userId/follow", followUser);
router.put("/:userId/unfollow", unfollowUser);
router.get("/:userId/followers", getFollowers);
router.get("/:userId/following", getFollowing);
router.post("/forgotPassword", forgotPassword);
router.post("/resetPassword", resetPassword);
router.put("/updateEmail", updateUserEmail);
router.put("/updatePassword", updateUserPassword);
router.put("/:userId/suspend", suspendUser);
router.put("/:userId/unsuspend", unsuspendUser);
router.get("/:id", getUserById);

module.exports = router;
