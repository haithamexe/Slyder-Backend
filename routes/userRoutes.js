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
  getUserContacts,
  getUserSearched,
} = require("../controllers/userController");

const protectRoute = require("../middleware/protectRoute");

router.post("/register", register);
router.post("/activate", activateAccount);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.post("/auth", auth);
router.post("/refreshActivation", refreshActivationToken);
router.delete("/delete", deleteUser);
router.put("/update/:id", updateUser);
// router.get("/", getUsers);
router.get("/username/:username", getUserByUsername);
router.put("/:userId/follow", protectRoute, followUser);
router.put("/:userId/unfollow", protectRoute, unfollowUser);
router.get("/:userId/followers", getFollowers);
router.get("/:userId/following", getFollowing);
router.get("/followers/:userId", getFollowers);
router.get("/following/:userId", getFollowing);
router.put("/follow/:userId", followUser);
router.put("/unfollow/:userId", unfollowUser);
router.post("/forgotPassword", forgotPassword);
router.post("/resetPassword", resetPassword);
router.put("/updateEmail", updateUserEmail);
router.put("/updatePassword", updateUserPassword);
router.put("/:userId/suspend", suspendUser);
router.put("/:userId/unsuspend", unsuspendUser);
// router.get("/get/:userId", getUserById);
router.get("/contacts/:userId", getUserContacts);
router.get("/search/:query", getUserSearched);

module.exports = router;

//reworker

// // Public routes (no auth required)
// router.post("/register", register);
// router.post("/activate", activateAccount);
// router.post("/login", login);
// router.post("/refreshActivation", refreshActivationToken);
// router.post("/forgotPassword", forgotPassword);
// router.post("/resetPassword", resetPassword);

// // Protected routes (auth required)
// router.post("/logout", protectRoute, logout);
// router.post("/refresh", refresh);  // Keep this unprotected as it needs to work with expired tokens
// router.post("/auth", protectRoute, auth);
// router.delete("/delete", protectRoute, deleteUser);
// router.put("/update/:id", protectRoute, updateUser);
// router.get("/username/:username", protectRoute, getUserByUsername);

// // User interaction routes
// router.put("/:userId/follow", protectRoute, followUser);
// router.put("/:userId/unfollow", protectRoute, unfollowUser);
// router.get("/:userId/followers", protectRoute, getFollowers);
// router.get("/:userId/following", protectRoute, getFollowing);

// // Remove duplicate routes
// // router.get("/followers/:userId", getFollowers);  // Duplicate
// // router.get("/following/:userId", getFollowing);  // Duplicate
// // router.put("/follow/:userId", followUser);       // Duplicate
// // router.put("/unfollow/:userId", unfollowUser);  // Duplicate

// // User management routes
// router.put("/updateEmail", protectRoute, updateUserEmail);
// router.put("/updatePassword", protectRoute, updateUserPassword);
// router.put("/:userId/suspend", protectRoute, suspendUser);
// router.put("/:userId/unsuspend", protectRoute, unsuspendUser);
// router.get("/contacts/:userId", protectRoute, getUserContacts);
// router.get("/search/:query", protectRoute, getUserSearched);
