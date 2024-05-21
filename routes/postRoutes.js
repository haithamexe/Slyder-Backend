const router = require("express").Router();
const {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  commentPost,
  uncommentPost,
  getPostsByUser,
  getPostsByFollowing,
  savePost,
  unsavePost,
  getPostLikes,
  getPostComments,
  getSavedPostsByUser,
  getHomePosts,
} = require("../controllers/postController");

router.post("/create", createPost);
router.get("/", getPosts);
router.get("/:postId", getPostById);
router.put("/:postId", updatePost);
router.delete("/:postId", deletePost);
router.put("/:postId/like", likePost);
router.put("/:postId/unlike", unlikePost);
router.put("/:postId/comment", commentPost);
router.put("/:postId/uncomment", uncommentPost);
router.get("/user/:userId", getPostsByUser);
router.get("/following", getPostsByFollowing);
router.put("/:postId/save", savePost);
router.put("/:postId/unsave", unsavePost);
router.get("/:postId/likes", getPostLikes);
router.get("/:postId/comments", getPostComments);
router.get("/saved/:userId", getSavedPostsByUser);
router.get("/home/:userId", getHomePosts);

module.exports = router;
