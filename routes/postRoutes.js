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
  savePost,
  unsavePost,
  getPostLikes,
  getPostComments,
  getHomePosts,
  getPostsByUserName,
  getPostCommentById,
  getPostSavedByPostId,
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
router.get("/:postId/likes/:userId", getPostLikes);
router.get("/:postId/comments", getPostComments);
router.get("/home/:userId", getHomePosts);
router.get("/user/:userName", getPostsByUserName);
router.get("/comment/:commentId", getPostCommentById);
router.get("/saved/:postId/:userId", getPostSavedByPostId);
router.put("/save/:postId/:userId", savePost);
router.delete("/save/:postId/:userId", unsavePost);

module.exports = router;
