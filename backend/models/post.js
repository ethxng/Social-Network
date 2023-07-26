const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const postSchema = new Schema({
    content: { // content of post
        type: String,
        required: true,
        minlength: 1,
        trim: true
    },
    author: { // who made the post
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    timestamp: { // timestamp of the post
        type: Date, 
        default: Date.now,
        required: true
    },
    photo_key: { // this string will be the key to the photo in S3 bucket (optional)
        type: String
    }
});

postSchema.virtual('url').get(() => {
    return `/post/${this._id}`;
});

const Post = mongoose.model("Post", postSchema);

module.exports = Post;