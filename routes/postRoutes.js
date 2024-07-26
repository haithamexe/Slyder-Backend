const router = require("express").Router();
const {
  createPost,
  getPostById,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  commentPost,
  uncommentPost,
  savePost,
  unsavePost,
  getPostLikes,
  getPostComments,
  getHomePosts,
  getPostsByUserName,
  getPostCommentById,
  getPostSavedByPostId,
  getTrendingPosts,
  getSavedPosts,
  getPostsLikedByUser,
  getPosts,
  getPost,
} = require("../controllers/postController");

const protectRoute = require("../middleware/protectRoute");

router.get("/posts", protectRoute, getPosts);
router.get("/userLiked/:userId", getPostsLikedByUser);
router.get("/trend", getTrendingPosts);
router.post("/create", createPost);
router.put("/:postId", updatePost);
router.delete("/:postId", deletePost);
router.put("/:postId/like", protectRoute, likePost);
router.put("/:postId/unlike", protectRoute, unlikePost);
router.put("/:postId/comment", commentPost);
router.put("/:postId/uncomment", uncommentPost);
router.get("/:postId/likes/:userId", getPostLikes);
router.get("/:postId/comments", getPostComments);
router.get("/home/:userId", getHomePosts);
router.get("/user/:userName", getPostsByUserName);
router.get("/comment/:commentId", getPostCommentById);
router.get("/saved/user/:userId", getSavedPosts);
router.get("/saved/:postId/:userId", getPostSavedByPostId);
router.put("/save/:postId/:userId", savePost);
router.delete("/save/:postId/:userId", unsavePost);
router.get("/:postId", getPost);
// router.get("/:postId", getPostById);

module.exports = router;
