const Post = require('../models/post');
const Like = require('../models/like');
const Comment = require('../models/comment');
const User = require('../models/user');
const async = require('async');
const mongoose = require('mongoose');
const multer  = require('multer');
const upload = multer({ dest: 'uploads/' });
const { uploadFileToS3, getFileFromS3 } = require('../s3');
const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);

// add a like to a post
exports.addLike = async (req, res, next) => {
    try {
        const post_id = req.params.post_id;
        const user_id = req.user._id;
        // check to see this Like to this post from this user is already present in the DB
        const exists = await Like.findOne({
            post: post_id,
            liked_by: user_id
        });

        if (exists !== null) { // this Like object has already existed
            res.status(409).send("You have already liked this post");
        } else {
            let newLike = new Like({
                post: post_id, 
                liked_by: user_id
            });
        
            const result = await newLike.save();
            if (result !== null){ // if the new Like is added to the DB successfully
                res.status(200).send("Success!");
            }
        }
    } catch (error) {
        console.error('Error saving like:', error);
        res.status(500).send("Internal server error");
    }
}

// remove a like to a post
exports.removeLike = async (req, res, next) => {
    try {
        const post_id = req.params.post_id;
        const deletion = await Like.findOneAndDelete({
            post: post_id,
            liked_by: req.user._id
        });
        if (deletion !== null) {
            res.status(200).send("Success!");
        } else {
            res.status(404).send("Post not found!");
        }
    } catch (error) {
        console.log("Error deleting a Like: ", error);
        res.status(500).send("Internal server error");
    }
}

// add a new comment to a post
exports.addComment = async (req, res, next) => {
    try {
        const post_id = req.params.post_id;
        const user_id = req.user._id;
        const content = req.body.content; // content of the comment
        let newComment = new Comment({
            post: post_id, 
            content: content, 
            commenter: user_id
        });

        const result = await newComment.save();
        if (result !== null){
            res.status(200).send("Success!");
        }
    } catch(error){
        console.error('Error saving comment:', error);
        res.status(500).send("Internal server error! You cannot make a comment at this point.");
    }
}

// get a specific post, with all comments and total no. of likes
exports.getPost = async (req, res, next) => {
    // handles 2 cases where the user tries to input invalid Object Id
    let post_id = req.params.post_id;
    if (post_id.length < 12) {
        res.status(400).send("Your Post ID is not valid");
        return;
    }
    try {
        post_id = new mongoose.Types.ObjectId(post_id);
    } catch (err) {
        res.status(400).send("invalid ObjectId");
        return;
    }
    async.parallel({
        findPost: function(callback){ // get all posts 
            Post.findById(post_id).populate({path: 'author', select: "username"})
            .then(posts => callback(null, posts))
            .catch(err => {
                console.error("error finding post:", err);
                callback(err);
            });
        },
        getLikes: function(callback){ // get all the num of likes associated with that post
            Like.countDocuments({"post": post_id})
                .then(count => callback(null, count))
                .catch(err => {
                    console.error("error finding all like: ", err);
                    callback(err);
                });
        },
        // get all comments associated with that post, populate commenter so you know who said what
        getComments: function(callback){ 
            Comment.find({"post": post_id}).populate({path: "commenter", select: "username"}).select("-post")
                    .then(comments => callback(null, comments))
                    .catch(err => {
                        console.error("error finding all comments: ", err);
                        callback(err);
                    });
        }
    }, function(err, results) { // callback 
        if (err) {
            res.status(500).send("Internal server error!");
            return;
        }
        // if there is a photo, set the img tag in the frontend to /image/:photo_key
        // and the backend will give the photo straight from S3 bucket 
        res.status(200).json(results);
    });
}

// retrieve all posts, likes and comments associated with every posts from friends of users (not user)
exports.getIndexPage = async (req, res, next) => {
    try {
        async.waterfall([
            // Step 1: Retrieve all the friends of a user
            function(callback){
                const user_id = req.user._id;
                User.findById(user_id).select('friends').populate({path: 'friends', select: "name username"})
                    .then(result => callback(null, result.friends))
                    .catch(err => {
                        console.error("error finding friends of a user: ", err);
                        callback(err);
                    });
            },
            // Step 2: Retrieve all posts of each friend
            function(friends, callback){
                const friendIds = friends.map(friend => friend._id);
                // friendIds.push(req.user._id);
                // console.log("Friends ID: ");
                // console.log(friendIds);

                Post.find({"author": {$in: friendIds}}).populate({path: 'author', select: "username"}).sort({"timestamp": -1})
                    .then(posts => callback(null, posts))
                    .catch(err => {
                        console.error("error finding all posts of a friend: ", err);
                        callback(err);
                    });
            },
            // Step 3: Retrieve all likes and comments of a post
            function(posts, callback){
                const postIds = posts.map(post => post._id);
                // console.log("Post IDs: ");
                // console.log(postIds);
                
                // this is similar to async.parallel
                Promise.all([Like.find({ post: { $in: postIds } }).populate({path: "liked_by", select: "username"}), 
                            Comment.find({ post: { $in: postIds } }).populate({path: "commenter", select: "username"})]) 
                    .then(results => {
                        const likes = results[0];
                        const comments = results[1];
                        console.log("Have retrieved all data, will now combine posts with corresponding Likes and Comments");
                        const postsWithLikesAndComments = posts.map(post => {
                            const postId = post._id.toString();
                            return {
                                ...post.toObject(), // this is to make sure to convert the post into a readable object
                                likes: likes.filter(like => like.post.toString() === postId),
                                comments: comments.filter(comment => comment.post.toString() === postId)
                            };
                        });
                        callback(null, postsWithLikesAndComments);
                    })
                    .catch(error => {
                        console.error("error finding all likes and comments for a certain post: ", error);
                        callback(error);
                    })
            }
        ], function(error, results) { // callback after async.waterfall
            if (error){ // if encounter error
                console.error("Errror getting the index page: ", error);
                res.status(500).send("Internal server error");
            }
            res.status(200).json(results);
        })
    } catch (error){
        console.error("Error getting the index page: ", error);
        res.status(500).send("Internal server error");
    }
}

// your key tag should be _image so it matches up with the tag inside upload.single
exports.createPost = [upload.single("_image"), async (req, res, next) => {
    try {
        let photo_data = null;
        if (req.file) {
            photo_data = req.file;
            console.log("Photo is received ", photo_data);
        } else {
            console.log("No photo received. Text-only post");
        }
    
        // post needs attributes content, author, and timestamp
        // req.body.content is the content
        // req.user._id is the author
        // timestamp is date.now
        const content = req.body.content;
        const user_id = req.user._id;
        const data = {
            content: content,
            author: user_id,
            timestamp: Date.now()
        };
        // if photo is present 
        if (photo_data) {
            data.photo_key = photo_data.filename
            // upload the photo to S3 and remove it from /uploads
            async.series([
                function(callback) {
                    uploadFileToS3(photo_data).then(result => { // upload 
                        console.log("Upload photo to S3 successfully", result);
                        callback(null, result);
                    }).catch(err => {
                        console.error("Error sending data to S3 buckets: ", err);
                        callback(err);
                    });
                }, function(callback){ // delete the file from /uploads after finish sending (essentially our /uploads dir will always be empty)
                    unlinkFile(`./${photo_data.path}`).then(() => {
                        console.log("Deletion from local dir successful");
                        callback(null);
                    }).catch(err => console.error("Error deleting the file from /uploads: ", err));
                }
            ], (err, results) => {
                // results[0] has the confirmation that the photo has been uploaded to S3 (first task already printed it)
                if (err){
                    console.error("Error sending data to S3 bucket: ", err);
                } 
            });
        } 
        const newPost = new Post(data);
        const result = await newPost.save();
        if (result !== null) { // if the post is saved successfully
            res.status(200).send("Success! New post saved successfully");
        } else {
            throw new Error("Failed to save the new post");
        }
    } catch(error) {
        console.error("Error creating a new post: ", error);
        res.status(500).send("Internal server error");
    }
}];

exports.getImage = (req, res, next) => {
    const key = req.params.key;
    const readStream = getFileFromS3(key);

    // piping the readStream will send the actual photo to the frontend (might have to change this)
    readStream.pipe(res);
}