const path = require('path')
// do this because the .env file is a level above the current directory
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const async = require('async');

const users_id = ["6467feda6d2b79c88cef554e", "6467fedb6d2b79c88cef5551", "6467fedb6d2b79c88cef5553",
                "6467fedc6d2b79c88cef5555", "6467fedc6d2b79c88cef5557"]

const hashPassword = (old_pass) => {
    bcrypt.hash(old_pass, 15)
        .then(hashed => {
            console.log(hashed);
            return hashed;
        }).catch(err => {
            console.error(err);
        })
}

const hashAndChangePassword = () => {
    for (const id of users_id){
        async.waterfall([
            function(callback){
                User.findById(id).select('password')
                    .then(user => callback(null, user.password));
            },
            function(old_pass, callback){
                bcrypt.hash(old_pass, 10)
                    .then(hashed => callback(null, hashed));
            },
            function(new_pass, callback){
                const newData = {
                    "password": new_pass
                };
                User.findByIdAndUpdate(id, newData, {new: true})
                    .then(result => callback(null, result));
            }
        ], (err, result) => {
            if (err){
                console.error("Error: ", err); 
            } else {
                console.log("change a user's password finished!");
                console.log(result);
            }
        });
    }
    process.exit(0);
}
// oLfxIZbfXzYr8Vc
// make connection to MongoDB
// mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true , useUnifiedTopology: true});
// const db = mongoose.connection;
// db.on('on', console.error.bind(console, "MongoDB Connection Error"));
// db.once('open', () => {
//   console.log('Connected to MongoDB');
// });
//hashAndChangePassword();
//hashPassword("p&DLk@94p08V");

bcrypt.compare('p&DLk@94p08V', "$2a$15$tUurtEiB6cgJBs7BSWeyQusCvQ6WT24T5nn1w8icJlR9VOOSvacca")
    .then(result => {
        if (result) {
            console.log("pass is correct"); 
        } else{
            console.log("pass is incorrect");
        }
    })