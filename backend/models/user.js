const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: { // full name
        type: String,
        required: true,
        minlength: 1,
        trim: true
    },
    username: {
        type: String,
        required: true,
        minlength: 1,
        trim: true
    },
    DOB: { // not required because FB doesn't give us that
        type: Date,
        trim: true
    },
    password: { // this will be hashed, not necessarily required if user logs in with facebook
        // because then you can just find if there is a facebook id in the DB
        type: String,
        minlength: 1,
        trim: true
    },
    friends: [{ // not required to have friends
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    facebookId: { // this depends on whether the user logged in with facebook or not
        type: String, 
        minlength: 1
    },
    photo_key: { // if user have a photo in their profile
        type: String,
        minlength: 1,
    }
});

userSchema.virtual("url").get(() => {
    return `/user/${this._id}`;
});

const User = mongoose.model('User', userSchema);

module.exports = User;