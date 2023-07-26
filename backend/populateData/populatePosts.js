const path = require('path')
// do this because the .env file is a level above the current directory
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { faker } = require('@faker-js/faker');
const Post = require('../models/post');

// these are users' object id
users_id = ["6467feda6d2b79c88cef554e", 
"6467fedb6d2b79c88cef5551", "6467fedb6d2b79c88cef5553", 
"6467fedc6d2b79c88cef5555", "6467fedc6d2b79c88cef5557"]

const generatePosts = async (count) => {
    for (let i = 0; i < count; i++){
        const randNum = Math.floor(Math.random() * 5);
        let post = new Post({
            content: faker.lorem.paragraph({
                min: 1,
                max: 4
            }),
            author: users_id[randNum],
            timestamp: faker.date.anytime()
        });

        await post.save();
    }
}

// make connection to MongoDB
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true , useUnifiedTopology: true});
const db = mongoose.connection;
db.on('on', console.error.bind(console, "MongoDB Connection Error"));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

generatePosts(10)
    .then(() => {
        console.log("Faker posts created!");
        process.exit(0);
    })
    .catch((error) => {
        console.log("Error creating fake posts: ", error);
        process.exit(1);
    });
