const path = require('path')
// do this because the .env file is a level above the current directory
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const User = require("../models/user");
const Post = require('../models/post');
const Like = require('../models/like');
const Comment = require('../models/comment');
const multer  = require('multer');
const upload = multer({ dest: 'uploads/' });
const { uploadFileToS3, getFileFromS3, removeFileFromS3 } = require('../s3');
const async = require('async');
const fs = require('fs');
const util = require('util');
const unlinkFile = util.promisify(fs.unlink);

exports.getUserProfile = async (req, res, next) => {
    // return this to the frontend, which will include user's profile and all user's posts (and likes/comments associated with all posts)
    let profile = {}; 
    async.waterfall([
        function(callback) { // retrieving the user's profile
            const user_id = req.user._id;
            User.findById(user_id).select("name username DOB photo_key friends").populate({path: "friends", select: "name username DOB"})
                .then(result => {
                    if (!result) {
                        callback(new Error("User not found"));
                    } else {
                        profile.profile = result;
                        callback(null, result);
                    }
                }).catch(err => {
                    console.log("error occured while retrieving user: ", err);
                    callback(err);
                });
        }, function(user, callback) { // retrieving all posts associated with that user
            Post.find({author: user._id}).then(posts => callback(null, posts))
                .catch(err => {
                    console.log("Error occured while retrieving all posts from user: ", err);
                    callback(err);
                });
        }, function(posts, callback) { // retrieving all likes and comments associated with all posts from user
            const postIds = posts.map(post => post._id);
            Promise.all([Like.find({ post: { $in: postIds } }).populate({path: "liked_by", select: "name username"}), Comment.find({ post: { $in: postIds } }).populate({path: 'commenter', select: "name username"})])
                .then(results => {
                    const likes = results[0];
                    const comments = results[1];
                    console.log("Have retrieved all data, will now combine posts with corresponding Likes and Comments");
                    const postsWithLikesAndComments = posts.map(post => {
                        const post_id = post._id.toString();
                        return {
                            ...post.toObject(), 
                            likes: likes.filter(like => like.post.toString() === post_id),
                            commments: comments.filter(comment => comment.post.toString() === post_id)
                        }
                    });
                    callback(null, postsWithLikesAndComments);
                }).catch(err => {
                    console.log("error retrieving likes and comments: ", err);
                    callback(err);
                });
        }
    ], function(err, results) {
        if (err) {
            console.log("error retrieving the user's profile: ", err);
            res.status(500).send("Internal server error");
        } else{
            profile.posts = results;
            res.status(200).json(profile);
        }
    });
}

// perform the same action as getUserProfile, but do this for other profile (besides the user himself)
exports.getOthersProfile = async (req, res, next) => {
    // return the name, usename, DOB, photo, friends, posts, all likes and comments associated with all posts
    let profile = {}; 
    async.waterfall([
        function(callback) { // retrieving the user's profile
            const user_id = req.params.id;
            User.findById(user_id).select("name username DOB photo_key friends").populate({path: "friends", select: "name username DOB"})
                .then(result => {
                    if (!result) {
                        callback(new Error("User not found"));
                    } else {
                        profile.profile = result;
                        callback(null, result);
                    }
                }).catch(err => {
                    console.log("error occured while retrieving user: ", err);
                    callback(err);
                });
        }, function(user, callback) { // retrieving all posts (from newest to oldest) associated with that user
            Post.find({author: user._id}).sort({timestamp: -1}).then(posts => callback(null, posts))
                .catch(err => {
                    console.log("Error occured while retrieving all posts from user: ", err);
                    callback(err);
                });
        }, function(posts, callback) { // retrieving all likes and comments associated with all posts from user
            const postIds = posts.map(post => post._id);
            Promise.all([Like.find({ post: { $in: postIds } }).populate({path: "liked_by", select: "name username"}), Comment.find({ post: { $in: postIds } }).populate({path: 'commenter', select: "name username"})])
                .then(results => {
                    const likes = results[0];
                    const comments = results[1];
                    console.log("Have retrieved all data, will now combine posts with corresponding Likes and Comments");
                    const postsWithLikesAndComments = posts.map(post => {
                        const post_id = post._id.toString();
                        return {
                            ...post.toObject(), 
                            likes: likes.filter(like => like.post.toString() === post_id),
                            commments: comments.filter(comment => comment.post.toString() === post_id)
                        }
                    });
                    callback(null, postsWithLikesAndComments);
                }).catch(err => {
                    console.log("error retrieving likes and comments: ", err);
                    callback(err);
                });
        }
    ], function(err, results) {
        if (err) {
            console.log("error retrieving the user's profile: ", err);
            res.status(500).send("Internal server error");
        } else{
            profile.posts = results;
            res.status(200).json(profile); // this profile variable is from the previously declared variable above
        }
    });
}

exports.updateProfile = [upload.single("updated_pic"), async (req, res, next) => {
    // THE KEY IN THE FRONT-END MUST BE "UPDATED_PIC"
    // NOTE: user can update their name or photo, THAT'S IT!
    // the new name will be stored in req.body.newName
    
    // remove the old photo (if not default) from S3
    // upload the new photo to S3 bucket (and remove it from /uploads)
    async.series([
        function(callback) { // remove the file from s3
            if (req.file) {
                // only remove the photo if it is not the blank profile pic that is given at the beginning
                if (req.user.photo_key !== process.env.BLANK_PROFILE_PIC_KEY) {
                    removeFileFromS3(req.user.photo_key).then(() => {
                        console.log("Remove file from S3 succesfully");
                        callback(null);
                    }).catch(err => {
                        console.log("error deleting photo: ", err);
                        callback(err);
                    });
                } else { // current profile photo is the blank profile pic (no action needed, move on)
                    callback(null);
                }
            } else {
                callback(null);
            }
        }, function(callback) { // upload new profile photo to s3
            if (req.file) { // only upload if the photo is given
                uploadFileToS3(req.file).then(confirmationFromS3 => {
                    console.log("Upload photo to S3 bucket successful", confirmationFromS3);
                    callback(null);
                }).catch(err => {
                    console.log("Error uploading photo to S3 bucket: ", err);
                    callback(err);
                });
            } else { // if photo not given
                callback(null);
            }
        }, function(callback) { // remove the newly added photo from /uploads (if attached)
            if (req.file) { // only remove if the new photo is given
                unlinkFile(`./${req.file.path}`).then(() => {
                    console.log("Deletion of photo from /uploads successful");
                    callback(null);
                    })
                    .catch(err => {
                        console.error("Error deleting file from /uploads: ", err);
                        callback(err);
                    });
            } else {
                callback(null);
            }
        }, function(callback) { // update the user in the DB
            let updatedData = {};
            if (req.body.newName) {
                updatedData.name = req.body.newName;
            }
            if (req.file) {
                updatedData.photo_key = req.file.filename;
            }
            const user_id = req.user._id;
            User.findByIdAndUpdate(user_id, updatedData, {new: true}).then(result => {
                callback(null, result);
            }).catch(err => {
                callback(err);
            });
        }
    ], (err, results) => {
        if (err) {
            console.error("Error updating the user's profile: ", err);
            res.status(500).send("Internal server error");
        } else{
            // since we are doing async.series, and our update action is the fourth task, so the updatedUser will be in results[3]
            res.status(200).json({"status": "Update successful", "updatedUser": results[3]});
        }
    });
}]