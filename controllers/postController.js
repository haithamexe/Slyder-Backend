const mongoose = require("mongoose");
const User = require("../models/User");
const Post = require("../models/Post");
const Like = require("../models/Like");
const Comment = require("../models/Comment");
const Saved = require("../models/Saved");
const cloudinary = require("../config/cloudinaryConfig");
const Notification = require("../models/Notification");
const { io } = require("../socket");
// const { Redis } = require("@upstash/redis");

// const redis = new Redis({
//   url: process.env.UPSTASH_REDIS_URL,
//   token: process.env.UPSTASH_REDIS_TOKEN,
// });

// const CACHE_KEY_PREFIX = "user_feed:";
// const CACHE_TTL = 60 * 60;

// const invalidateUserFeedCache = async (userId) => {
//   try {
//     const cacheKey = `${CACHE_KEY_PREFIX}${userId}`;
//     await redis.del(cacheKey);
//   } catch (error) {
//     console.error("Error invalidating cache:", error);
//   }
// };

// const invalidateUserPostCache = async (postId) => {
//   try {
//     const cacheKey = `post:${postId}`;
//     await redis.del(cacheKey);
//   } catch (error) {
//     console.error("Error invalidating cache:", error);
//   }
// };

const createPost = async (req, res) => {
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

    // const userFollowers = await User.findById(userId)
    //   .select("followers -_id")
    //   .exec();

    // userFollowers.followers.map((follower) =>
    //   invalidateUserFeedCache(follower)
    // );

    // await invalidateUserFeedCache(user._id);

    await newPost.save();

    return res.status(201).json(newPost);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// const getPosts = async (req, res) => {
//   try {
//     const posts = await Post.find().select("_id").exec();
//     if (!posts) {
//       return res.status(404).json({ message: "Posts not found" });
//     }
//     return res.status(200).json([]);
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

const getPosts = async (req, res) => {
  try {
    const user = req.user;

    // const cacheKey = `${CACHE_KEY_PREFIX}${user._id}`;

    // const cachedPosts = await redis.get(cacheKey);
    // if (cachedPosts) {
    //   const postData =
    //     typeof cachedPosts === "string" ? JSON.parse(cachedPosts) : cachedPosts;
    //   // console.log("Cache hit", cacheKey, cachedPosts);
    //   return res.status(200).json(postData);
    // }

    const followingPosts = await Post.find({ user: { $in: user.following } })
      .lean()
      .exec();
    const userPosts = await Post.find({ user: user._id }).lean().exec();
    const posts = [...followingPosts, ...userPosts];
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const sendPostsIds = posts.map((post) => post._id);

    // await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(sendPostsIds));

    return res.status(200).json(sendPostsIds);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Server error while getting home posts" });
  }
};

const getPost = async (req, res) => {
  try {
    const { postId } = req.params;
    if (!postId) {
      return res.status(400).json({ message: "Please provide an id" });
    }

    // const cacheKey = `post:${postId}`;

    // const cachedPost = await redis.get(cacheKey);
    // if (cachedPost) {
    //   const postData =
    //     typeof cachedPost === "string" ? JSON.parse(cachedPost) : cachedPost;
    //   // console.log("Cache hit", cacheKey, cachedPost);
    //   return res.status(200).json(postData);
    // }

    const post = await Post.findById(postId)
      .populate([
        {
          path: "user",
          select: "username firstName surName picture",
        },
        {
          path: "likes",
          select: "user",
        },
        {
          path: "comments",
          select: "content author likes createdAt ",
          populate: {
            path: "author",
            select: "username firstName surName picture",
          },
        },
        {
          path: "savedBy",
          select: "user",
        },
      ])
      .exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(post));

    return res.status(200).json(post);
  } catch (error) {
    console.error(error?.message);
    return res.status(500).json({ message: error?.message });
  }
};

const updatePost = async (req, res) => {
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

const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId).exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    if (post.image) {
      await cloudinary.uploader.destroy(post.image);
    }

    // const userFollowers = await User.findById(post.user)
    //   .select("followers -_id")
    //   .exec();

    // userFollowers.followers.map((follower) =>
    //   invalidateUserFeedCache(follower)
    // );

    // invalidateUserFeedCache(post.user);
    // invalidateUserPostCache(postId);

    await Like.deleteMany({ post: post._id }).exec();
    await Comment.deleteMany({ post: post._id }).exec();
    await Post.findByIdAndDelete(post._id);

    return res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

const likePost = async (req, res) => {
  try {
    // const { userId } = req.body;
    const { postId } = req.params;
    if (!postId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const post = await Post.findById(postId).exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    const user = req.user;
    const existingLike = await Like.findOne({
      post: postId,
      user: user._id,
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
    post.likes.push(like._id);

    // invalidateUserPostCache(postId);

    if (post.user.toString() !== user._id.toString()) {
      const notification = new Notification({
        receiver: post.user,
        sender: user._id,
        type: "like",
        post: post._id,
      });
      await notification.save();
      const socketNotification = {
        _id: notification._id,
        sender: {
          _id: user._id,
          username: user.username,
          firstName: user.firstName,
          surName: user.surName,
        },
        post: {
          _id: post._id,
          image: post.image,
        },
        type: "like",
        createdAt: notification.createdAt,
      };

      io.to(post.user.toString()).emit("newNotification", socketNotification);
    }

    // await like.save();
    // await post.save();

    await Promise.all([like.save(), post.save()]);

    // io.to(post.user.toString()).emit("newNotification", notification);

    return res.status(201).json({ message: "Post liked successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

const unlikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    if (!postId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const post = await Post.findById(postId).exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    const user = req.user;
    const currentLike = await Like.findOneAndDelete({
      post: post._id,
      user: user._id,
    }).exec();
    if (!currentLike) {
      return res.status(404).json({ message: "Like not found" });
    }
    post.likes = post.likes.filter(
      (like) => like.toString() !== currentLike._id.toString()
    );

    // invalidateUserPostCache(postId);

    // const notification = await Notification.findOneAndDelete({
    //   receiver: post.user,
    //   sender: user._id,
    //   type: "like",
    //   post: post._id,
    // }).exec();
    await post.save();

    res.status(201).json({ message: "Post unliked successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const commentPost = async (req, res) => {
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
    post.comments.push(newComment._id);
    // await newComment.save();
    // await post.save();

    // invalidateUserPostCache(postId);

    await Promise.all([newComment.save(), post.save()]);

    if (post.user.toString() !== user._id.toString()) {
      const notification = new Notification({
        receiver: post.user,
        sender: user._id,
        type: "comment",
        post: post._id,
      });
      await notification.save();

      const socketNotification = {
        _id: notification._id,
        sender: {
          _id: user._id,
          username: user.username,
          firstName: user.firstName,
          surName: user.surName,
        },
        post: {
          _id: post._id,
          image: post.image,
        },
        type: "comment",
        createdAt: notification.createdAt,
      };
      io.to(post.user.toString()).emit("newNotification", socketNotification);
    }

    return res.status(201).json({ message: "Comment added successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

const uncommentPost = async (req, res) => {
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

    // invalidateUserPostCache(postId);

    await comment.remove();
    await post.save();

    res.status(200).json({ message: "Comment removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getPostComments = async (req, res) => {
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

const getPostLikes = async (req, res) => {
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
    let userHasLiked = false;
    const userHasLikedQuery = await Like.findOne({
      post: post._id,
      user: user._id,
    })
      .lean()
      .exec();
    if (userHasLikedQuery) {
      userHasLiked = true;
    }
    res.status(200).json({ likes, userHasLiked });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getPostCommentById = async (req, res) => {
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

const getHomePosts = async (req, res) => {
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

const getTrendingPosts = async (req, res) => {
  try {
    const { paging } = req.params;
    const posts = await Post.find()
      .skip(parseInt(paging) * 10)
      .limit(10)
      .lean()
      .exec();
    // const posts = await Post.find().limit().exec();
    if (!posts || posts.length === 0) {
      return res.status(404).json({ message: "Posts not found" });
    }

    posts.sort((a, b) => b.likes.length - a.likes.length);
    const postsId = posts.map((post) => post?._id);
    return res.status(200).json(postsId);
  } catch (error) {
    console.error(error.message, "error");
    return res.status(500).json({ message: "Server error" });
  }
};

const savePost = async (req, res) => {
  try {
    const { postId, userId } = req.params;

    if (!postId || !userId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(userId).lean().exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const post = await Post.findById(postId).exec();
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    let saved = await Saved.findOne({ user: user._id }).exec();
    if (!saved) {
      saved = new Saved({
        user: user._id,
      });
    }

    // invalidateUserPostCache(postId);

    saved.posts.push(post._id);
    post.savedBy.push(saved._id);
    await Promise.all([saved.save(), post.save()]);
    return res.status(200).json({ message: "Post saved successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

const unsavePost = async (req, res) => {
  try {
    const { postId, userId } = req.params;
    if (!postId || !userId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(userId).lean().exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const post = await Post.findById(postId).exec();
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

    post.savedBy = post.savedBy.filter(
      (savedBy) => savedBy.toString() !== saved._id.toString()
    );

    // invalidateUserPostCache(postId);

    await Promise.all([saved.save(), post.save()]);
    return res.status(200).json({ message: "Post unsaved successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getPostsByUserName = async (req, res) => {
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

const getSavedPosts = async (req, res) => {
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

const getPostSavedByPostId = async (req, res) => {
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

const getPostsLikedByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "Please provide an id" });
    }
    const user = await User.findById(userId).lean().exec();
    const likes = await Like.find({ user: user._id }).lean().exec();
    if (!likes) {
      return res.status(404).json({ message: "Likes not found" });
    }
    const posts = await Post.find({
      _id: { $in: likes.map((like) => like.post) },
    })
      .lean()
      .exec();

    return res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// const getPostsWithAlgorithm = async (req, res) => {
//   try {
//     const { userId, algo } = req.body;
//     if (!userId) {
//       return res.status(400).json({ message: "Please provide an id" });
//     }
//     const user = await User.findById(userId).lean().exec();
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const sugPost = algo.sort((a, b) => b.number - a.number);

//     tobePosts = sugPost.map

module.exports = {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  commentPost,
  uncommentPost,
  getPostComments,
  getPostLikes,
  getPostCommentById,
  getHomePosts,
  getTrendingPosts,
  savePost,
  unsavePost,
  getPostsByUserName,
  getSavedPosts,
  getPostSavedByPostId,
  getPostsLikedByUser,
};
