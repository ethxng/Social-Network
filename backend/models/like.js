const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const likeSchema = new Schema({
    post: { // like belongs to which post
        type: Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    liked_by: { // user who liked that post
        type: Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    }
});

likeSchema.virtual("url").get(() => {
    return `/like/${this._id}`;
});

const Like = mongoose.model('Like', likeSchema);

module.exports = Like;