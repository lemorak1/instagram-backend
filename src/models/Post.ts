import mongoose from "mongoose";

const PostSchema = new mongoose.Schema({
  id: String,
  caption: String,
  media_url: String,
  permalink: String,
  created_time: Date,
});

export const Post = mongoose.model("Post", PostSchema);
