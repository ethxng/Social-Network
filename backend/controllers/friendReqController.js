const FriendRequest = require("../models/friendRequest");
const User = require('../models/user');
const async = require('async');
const mongoose = require('mongoose');

// POST request that sends a FriendReq to someone from the user
exports.send_request = async (req, res, next) => {
    try {
        let receiver_id = req.params.receiver_id; 
        if (receiver_id.length < 12) {
            res.status(400).send("Your Receiver's ID is not valid");
            return;
        }
        let newFriendReq = new FriendRequest({
            sender: req.user._id, 
            receiver: receiver_id,
            status: 'pending'
        });
        const result = await newFriendReq.save();
        if (result !== null){ // if the friendReq is saved successfully
            res.status(200).send("Success!");
        } else {
            throw new Error("error saving friendReq");
        }
    } catch(error) {
        console.error('Error saving the friend request:', error);
        res.status(500).send("Internal server error");
    }
}

// PATCH request
exports.modify_request = async (req, res, next) => {
    // the new status of the friend request is attached in the body: req.body.status
    // the friend request object id is attached in the body: req.body.friendReq
    // if the new status is accept, add friends to each other friend list (both side) 
    // and remove the object in the Friend Request DB
    // if the new status is reject, remove the object in the Friends Request DB
    try {
        console.log(req.body);
        if (req.body.status.toLowerCase() === "accepted"){
            // req.user._id is the receiver, req.params.receiver_id is the sender
            const receiver = req.user._id, sender = req.params.receiver_id, friendReqId = req.body.friendReq;
            async.series([
                function(callback){ // add the sender into the receiver's friends list
                    User.findByIdAndUpdate(
                        {_id: receiver},
                        {$push: {friends: sender}},
                        {new: true}
                    ).then(updatedObj => {
                        callback(null, updatedObj);
                    }).catch(error => {
                        console.error("Error", error);
                    });
                },
                function(callback){ // add the receiver into the sender's friends list
                    User.findByIdAndUpdate(
                        {_id: sender},
                        {$push: {friends: receiver}},
                        {new: true}
                    ).then(updatedObj => {
                        callback(null, updatedObj);
                    }).catch(error => {
                        console.error("Error", error);
                    });
                }, 
                function(callback){ // remove the FriendReq obj after it's no longer pending
                    FriendRequest.findByIdAndRemove(friendReqId)
                    .then((removedDocument) => {
                        if (removedDocument) { // document removed
                          callback(null, removedDocument);
                        } else {
                          console.log('Document not found');
                          // Handle case when document doesn't exist
                        }
                      })
                      .catch((error) => {
                        console.error('Error removing document:', error);
                        // Handle error
                      });                    
                }
            ])
            .then(results => {
                console.log(results);
                res.status(200).send("Success!")
            }).catch(error => {
                console.error(error);
                res.status(500).send("Internal server error");
            });
        }
        else if (req.body.status.toLowerCase() === "rejected"){
            FriendRequest.findByIdAndRemove(req.body.friendReq) // remove FriendReq since its status is now rejected
            .then((removedDocument) => {
                if (removedDocument) { // document removed
                  res.status(200).send('Success!');
                } else { // Handle case when document doesn't exist
                  console.log('Document not found');
                  res.status(404).send("Document not found");
                }
              })
              .catch((error) => { // handle error
                console.error('Error removing document:', error);
                res.status(500).send("Internal server error");
              });
        }
    } catch(error) {
        console.error(error);
        res.status(500).send("Internal server error");
    };
}

// GET request that returns all friend req for a user
exports.getAllFriendReqs = (req, res, next) => {
    try {
        const user_id = req.user._id;
        FriendRequest.find({"receiver": user_id}).populate('sender')
            .then(result => res.status(200).json(result))
            .catch(err => {
                console.error("Error getting all friend requests: ", err);
                res.status(500).send("Internal server error");
            });
    } catch(error) {
        console.error("Error getting all friend requests: ", error);
        res.status(500).send("Internal server error");
    }
}

exports.getNewFriends = (req, res, next) => {
    // if a user has friends, then suggest friends of friends 
    // (that are not already friends with the user or have sent/received friendReq to/from the user)
    // if a user doesn't have any friends, then suggests strangers
    try {
        friends = []
        async.series([
            // Step 1: Get all friends of a user and pass it onto the next step
            function(callback){
                const user_id = req.user._id;
                User.findById(user_id).select('friends').populate('friends')
                    .then(result => {
                        // set the result equal to the friends array outside of async.series
                        friends = result.friends; 
                        callback(null, result.friends);
                    })
                    .catch(error => {
                        console.error("Error retrieving all friends of a user: ", error);
                        callback(error);
                    });
            }, 
            // Step 2: Retrieve all friends of friends (if user has any friends), 
            // or strangers if user has no friends
            function(callback){
                if (friends.length > 0){ // if user has friends
                    const friendsIds = friends.map(friend => friend._id);
                    User.find({"friends": {$in: friendsIds}}).select('-password')
                        .then(result => {
                            callback(null, result);
                        })
                        .catch(error => {
                            console.error("Error retrieving all friends of friends: ", error);
                            callback(error);
                        });
                } else { // if user has no friendss
                    User.find().limit(3)
                        .then(result => callback(null, result))
                        .catch(error => {
                            console.error("Error retrieving new friends for a user: ", error);
                            callback(error);
                        });
                }
            }, 
            // Step 3: we have to find the friends of friends that are already in the FriendReq, so we can 
            // eliminate them as well
            function(callback){
                const user_id = req.user._id;
                FriendRequest.find({$or: [
                    {"sender": user_id}, // condition 1
                    {"receiver": user_id} // condition 2
                ]}).populate(['sender', 'receiver'])
                    .then(data => {
                        let result = [];
                        // take only the friend of friend that is either in the sender or receiver
                        // we can disregard the user himself in the friendReq so it is easier
                        // to filter in the final async.series callback
                        for (let i = 0; i < data.length; i++){
                            // if user_id is in sender, take receiver (the friend of friend) & vice versa
                            if (data[i].sender._id.toString() === user_id){
                                result.push(data[i].receiver);
                            } else if (data[i].receiver._id.toString() === user_id){
                                result.push(data[i].sender);
                            }
                        }
                        callback(null, result)
                    })
                    .catch(error => {
                        console.error("Error retrieving all friendReq of a user: ", error);
                        callback(error);
                    }); 
            }
        ], (error, results) => {
            if (error){
                console.error("Error recommending new friends: ", error);
                res.status(500).send("Internal server error");
            } else{
                const curr_friends = results[0];
                const friends_of_friends = results[1];
                const friendsOfFriends_in_friendReqs = results[2];
                const user_id = req.user._id;
                // this is to remove the friends of friends that are already friends with the user
                // and to remove friends of friends that are already in the Friend Request 
                // to the user (either as sender or receiver). This will work even if the user has no friends
                let newFriends = friends_of_friends.filter(newFriend => {
                    return !curr_friends.find(friend => friend._id.toString() === newFriend._id.toString())
                    // this line below is just a prevention in case the friend of friend is already inside friendReqs 
                    && !friendsOfFriends_in_friendReqs.find(friend => friend._id.toString() === newFriend._id.toString())
                    // this is not to include the user himself in the friends of friends
                    && newFriend._id.toString() !== user_id.toString() 
                });
                res.status(200).json(newFriends);
            }
        });
    } catch (error) {
        console.error("Error recommending new friends: ", error);
        res.status(500).send("Internal server error");   
    }
}