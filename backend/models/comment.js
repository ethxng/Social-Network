const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const commentSchema = new Schema({
    post: { // helps identify which post
        type: Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    content: { // what the commenter said
        type: String, 
        minlength: 1,
        trim: true,
        required: true
    },
    commenter: { // who the commenter is
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
});

commentSchema.virtual('url').get(() => {
    return `/comment/${this._id}`;
});

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;