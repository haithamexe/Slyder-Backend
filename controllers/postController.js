const mongoose = require("mongoose");
const User = require("../models/User");
const Post = require("../models/Post");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const Community = require("../models/Community");
const Saved = require("../models/Saved");
const cloudinary = require("../config/cloudinaryConfig");

exports.createPost = async (req, res) => {
  try {
    const { content, userId } = req.body;
    let { image } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (image) {
      const cloudinaryResponse = await cloudinary.uploader.upload(image, {
        folder: "slyder",
      });
      image = cloudinaryResponse.secure_url;
    }
    const newPost = new Post({
      content,
      image,
      user: user._id,
    });
    await newPost.save();
    return res.status(201).json(newPost);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find().lean().exec();
    return res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getPostById = async (req, res) => {
  try {
    const { postId } = req.params;
    if (!postId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const post = await Post.findById(postId).exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    return res.status(200).json(post);
  } catch (error) {
    console.error(error?.message);
    return res.status(500).json({ message: error?.message });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, description } = req.body;
    const post = await Post.findById(postId).exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (title) {
      post.title = title;
    }
    if (description) {
      post.description = description;
    }
    await post.save();
    res.status(201).json({ message: "Post updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId).exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (post.image) {
      await cloudinary.uploader.destroy(post.image);
    }
    await Post.findByIdAndDelete(post._id);
    return res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.likePost = async (req, res) => {
  try {
    const { userId } = req.body;
    const { postId } = req.params;
    if (!userId || !postId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const post = await Post.findById(postId).exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    const user = await User.findById(userId).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const existingLike = await Like.findOne({
      post: postId,
      user: userId,
    }).exec();
    if (existingLike) {
      return res
        .status(400)
        .json({ message: "Post already liked by this user" });
    }
    const like = new Like({
      post: post._id,
      user: user._id,
    });
    await like.save();
    post.likes.push(like._id);
    await post.save();
    return res.status(201).json({ message: "Post liked successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.unlikePost = async (req, res) => {
  try {
    const { userId } = req.body;
    const { postId } = req.params;
    if (!userId || !postId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const post = await Post.findById(postId).exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    const user = await User.findById(userId).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const currentLike = await Like.findOneAndDelete({
      post: post._id,
      user: user._id,
    }).exec();
    if (!currentLike) {
      return res.status(404).json({ message: "Like not found" });
    }
    post.likes = post.likes.filter((like) => currentLike._id !== like._id);
    await post.save();
    res.status(201).json({ message: "Post unliked successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.commentPost = async (req, res) => {
  try {
    const { userId, comment } = req.body;
    const { postId } = req.params;
    if (!userId || !postId || !comment) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const post = await Post.findById(postId).exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    const user = await User.findById(userId).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const newComment = new Comment({
      content: comment,
      author: user._id,
      post: post._id,
    });
    await newComment.save();
    post.comments.push(newComment._id);
    await post.save();
    return res.status(201).json({ message: "Comment added successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.uncommentPost = async (req, res) => {
  try {
    const { commentId } = req.body;
    const { postId } = req.params;
    if (!commentId || !postId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const post = await Post.findById(postId).exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    const comment = await Comment.findById(commentId).exec();
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    post.comments = post.comments.filter(
      (comment) => comment.toString() !== commentId.toString()
    );
    await comment.remove();
    await post.save();
    res.status(200).json({ message: "Comment removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    if (!postId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const post = await Post.findById(postId).exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    const comments = await Comment.find({ post: post?._id }).lean().exec();
    if (!comments) {
      return res.status(404).json({ message: "Comments not found" });
    }
    const commentsIds = comments.map((comment) => comment?._id);
    return res.status(200).json(commentsIds);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getPostLikes = async (req, res) => {
  try {
    const { postId, userId } = req.params;
    if (!userId || !postId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(userId).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const post = await Post.findById(postId).exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    const likes = await Like.find({ post: post._id }).lean().exec();
    const userHasLiked = likes.some(
      (like) => like.user.toString() === user._id.toString()
    );
    res.status(200).json({ likes, userHasLiked });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getPostCommentById = async (req, res) => {
  try {
    const { commentId } = req.params;
    if (!commentId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const comment = await Comment.findById(commentId).lean().exec();
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    const user = await User.findById(comment.author).lean().exec();

    const commentData = {
      user: {
        username: user.username,
        picture: user.picture,
      },
      content: comment.content,
      createdAt: comment.createdAt,
      likesCount: comment.likes.length,
      id: comment._id,
    };
    return res.status(200).json(commentData);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Server error " + error.message });
  }
};

exports.getHomePosts = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(userId).lean().exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const following = user.following;
    const followingPosts = await Post.find({ user: { $in: following } })
      .lean()
      .exec();
    const userPosts = await Post.find({ user: user._id }).lean().exec();
    const posts = [...followingPosts, ...userPosts];
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const sendPostsIds = posts.map((post) => post._id);
    return res.status(200).json(sendPostsIds);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Server error while getting home posts" });
  }
};

exports.getTrendingPosts = async (req, res) => {
  try {
    const posts = await Post.find({}).exec();
    posts.sort((a, b) => b.likes.length - a.likes.length);
    const postsId = posts.map((post) => post?._id);
    console.log(postsId);
    return res.status(200).json(postsId);
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.savePost = async (req, res) => {
  try {
    const { postId, userId } = req.params;

    if (!postId || !userId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(userId).lean().exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const post = await Post.findById(postId).lean().exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    let saved = await Saved.findOne({ user: user._id }).exec();
    if (!saved) {
      saved = new Saved({
        user: user._id,
      });
    }
    saved.posts.push(post._id);
    await saved.save();
    return res.status(200).json({ message: "Post saved successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.unsavePost = async (req, res) => {
  try {
    const { postId, userId } = req.params;
    if (!postId || !userId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(userId).lean().exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const post = await Post.findById(postId).lean().exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    const saved = await Saved.findOne({ user: user._id }).exec();
    if (!saved) {
      return res.status(404).json({ message: "Saved posts not found" });
    }
    saved.posts = saved.posts.filter(
      (post) => post.toString() !== postId.toString()
    );
    await saved.save();
    return res.status(200).json({ message: "Post unsaved successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getPostsByUserName = async (req, res) => {
  try {
    const { userName } = req.params;
    if (!userName) {
      return res.status(400).json({ message: "Please provide a username" });
    }
    const user = await User.findOne({ username: userName }).lean().exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const posts = await Post.find({ user: user._id }).lean().exec();
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getSavedPosts = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(userId).lean().exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const saved = await Saved.findOne({ user: user._id }).lean().exec();
    if (!saved) {
      return res.status(404).json({ message: "Saved posts not found" });
    }
    const posts = await Post.find({ _id: { $in: saved.posts } })
      .lean()
      .exec();
    return res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getPostSavedByPostId = async (req, res) => {
  try {
    const { postId, userId } = req.params;
    if (!postId || !userId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const post = await Post.findById(postId).lean().exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    const user = await User.findById(userId).lean().exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const saved = await Saved.findOne({
      user: user._id,
    })
      .lean()
      .exec();

    if (!saved) {
      return res.status(404).json({ message: "Saved posts not found" });
    }

    const postSaved = saved.posts.some(
      (savedPost) => savedPost.toString() === postId.toString()
    );

    if (!postSaved) {
      return res.status(200).json({ saved: false });
    }
    return res.status(200).json({ saved: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};
