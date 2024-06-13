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
    res.status(201).json(newPost);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find().lean().exec();
    res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getPostById = async (req, res) => {
  try {
    const { postId } = req.params;
    if (!postId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const post = await Post.findById(postId).lean().exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    res.status(200).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
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
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.likePost = async (req, res) => {
  try {
    const { postId, userId } = req.body;
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
    res.status(201).json({ message: "Post liked successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.unlikePost = async (req, res) => {
  try {
    const { postId, userId } = req.body;
    const post = await Post.findById(postId).exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    const user = await User.findById(userId).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    post.likes = post.likes.filter(
      (like) => like.toString() !== user._id.toString()
    );
    const like = await Like.findOne({ post: post._id, user: user._id }).exec();
    if (like) {
      await like.remove();
    }
    await post.save();
    res.status(201).json({ message: "Post unliked successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.commentPost = async (req, res) => {
  try {
    const { postId, userId, comment } = req.body;
    const post = await Post.findById(postId).exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    const user = await User.findById(userId).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const newComment = new Comment({
      comment,
      user: user._id,
      post: post._id,
    });
    await newComment.save();
    post.comments.push(newComment._id);
    await post.save();
    res.status(201).json({ message: "Comment added successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.uncommentPost = async (req, res) => {
  try {
    const { postId, commentId } = req.body;
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
    const post = await Post.findById(postId).exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    const comments = await Comment.find({ post: post._id }).lean().exec();
    res.status(200).json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getPostLikes = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId).exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    const likes = await Like.find({ post: post._id }).lean().exec();
    res.status(200).json(likes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getPostsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(userId).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const posts = await Post.find({ user: user }).lean().exec();
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getSavedPostsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
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
    res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getHomePosts = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).lean().exec();
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
    res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getPostsByFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).lean().exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const following = user.following;
    const posts = await Post.find({ user: { $in: following } })
      .lean()
      .exec();
    res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.savePost = async (req, res) => {
  try {
    const { postId, userId } = req.body;
    const user = await User.findById(userId).lean().exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const saved = await Saved.findOne({ user: user._id }).lean().exec();
    if (!saved) {
      return res.status(404).json({ message: "Saved posts not found" });
    }
    saved.posts.push(postId);
    await saved.save();
    res.status(200).json({ message: "Post saved successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.unsavePost = async (req, res) => {
  try {
    const { postId, userId } = req.body;
    const user = await User.findById(userId).lean().exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const saved = await Saved.findOne({ user: user._id }).lean().exec();
    if (!saved) {
      return res.status(404).json({ message: "Saved posts not found" });
    }
    saved.posts = saved.posts.filter(
      (post) => post.toString() !== postId.toString()
    );
    await saved.save();
    res.status(200).json({ message: "Post unsaved successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// exports.getPostsByCommunity = async (req, res) => {
//   try {
//     const { communityId } = req.params;
//     const posts = await Post.find({ community: communityId }).lean().exec();
//     res.status(200).json(posts);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };
