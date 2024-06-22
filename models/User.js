const mongoose = require("mongoose");

const { ObjectId } = mongoose.Schema;

const userSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      min: 3,
      max: 15,
      trim: true,
      text: true,
    },
    surName: {
      type: String,
      required: true,
      min: 3,
      max: 15,
      trim: true,
      text: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      text: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      min: 6,
    },
    picture: {
      type: String,
      default:
        "https://res.cloudinary.com/dcfy1isux/image/upload/f_auto,q_auto/placeholder-pic",
    },
    cover: {
      type: String,
    },
    gender: {
      type: String,
      required: true,
      enum: ["male", "female", "Other"],
    },
    pronoun: {
      type: String,
    },
    year: {
      type: Number,
      required: true,
    },
    month: {
      type: Number,
      required: true,
    },
    day: {
      type: Number,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    following: {
      type: Array,
      default: [],
    },
    followers: {
      type: Array,
      default: [],
    },
    contacts: {
      type: Array,
      default: [],
    },
    requests: {
      type: Array,
      default: [],
    },
    notifications: {
      type: Array,
      default: [],
    },
    suspended: {
      type: Boolean,
      default: false,
    },
    posts: [
      {
        type: ObjectId,
        ref: "Post",
      },
    ],
    notes: [
      {
        type: ObjectId,
        ref: "Note",
      },
    ],

    community: {
      type: ObjectId,
      ref: "Community",
    },

    search: [
      {
        user: {
          type: ObjectId,
          ref: "user",
        },
      },
    ],
    details: {
      skills: {
        type: Array,
        default: [],
      },
      bio: {
        type: String,
        default: "",
      },
      job: {
        type: String,
      },
      workPlace: {
        type: String,
      },
      highSchool: {
        type: String,
      },
      college: {
        type: String,
      },
      currentCity: {
        type: String,
      },
      relationship: {
        type: String,
      },
      instagram: {
        type: String,
      },
      website: {
        type: String,
        default: "",
      },
    },
    saved: {
      type: ObjectId,
      ref: "Saved",
    },
  },
  {
    timestamps: true,
    strictQuery: true,
  }
);

module.exports = mongoose.model("users", userSchema);
