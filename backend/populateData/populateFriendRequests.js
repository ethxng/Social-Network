const path = require('path')
// do this because the .env file is a level above the current directory
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const friendRequest = require('../models/friendRequest');
const { faker } = require('@faker-js/faker');
const mongoose = require('mongoose');

users_id = ["6467feda6d2b79c88cef554e", 
"6467fedb6d2b79c88cef5551", "6467fedb6d2b79c88cef5553", 
"6467fedc6d2b79c88cef5555", "6467fedc6d2b79c88cef5557"]

// in the order: Sylvester, Glen, Mr. Frankie, Kari, Lorraine

const generateFriendRequests = async () => {
    let friendReq1 = new friendRequest({
        sender: users_id[0],
        receiver: users_id[1]
    });
    await friendReq1.save();

    let friendReq2 = new friendRequest({
        sender: users_id[4],
        receiver: users_id[2]
    });
    await friendReq2.save();
}

// make connection to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true , useUnifiedTopology: true});
const db = mongoose.connection;
db.on('on', console.error.bind(console, "MongoDB Connection Error"));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

generateFriendRequests()
    .then(() => {
        console.log("Faker friend requests created!");
        process.exit(0);
    })
    .catch((error) => {
        console.log("Error creating fake friend requests: ", error);
        process.exit(1);
    });
