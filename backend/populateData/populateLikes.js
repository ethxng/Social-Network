const path = require('path')
// do this because the .env file is a level above the current directory
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const Like = require('../models/like');
const { faker } = require('@faker-js/faker');
const mongoose = require('mongoose');

posts_id = ['646805e0bfc88ed6a4f6ab21', "646805e2bfc88ed6a4f6ab24", 
'646805e2bfc88ed6a4f6ab26', '646805e2bfc88ed6a4f6ab28', '646805e2bfc88ed6a4f6ab2a', '646805e2bfc88ed6a4f6ab2c', 
'646805e2bfc88ed6a4f6ab2e', '646805e2bfc88ed6a4f6ab30', '646805e3bfc88ed6a4f6ab32', '646805e3bfc88ed6a4f6ab34']

users_id = ["6467feda6d2b79c88cef554e", 
"6467fedb6d2b79c88cef5551", "6467fedb6d2b79c88cef5553", 
"6467fedc6d2b79c88cef5555", "6467fedc6d2b79c88cef5557"]

const generateLikes = async (count) => {
    for (let i = 0; i < count; i++){
        const users_randNum = Math.floor(Math.random() * 5);
        const posts_randNum = Math.floor(Math.random() * 10);
        let like = new Like({
            post: posts_id[posts_randNum],
            liked_by: users_id[users_randNum]
        });

        await like.save();
    }
}


// make connection to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true , useUnifiedTopology: true});
const db = mongoose.connection;
db.on('on', console.error.bind(console, "MongoDB Connection Error"));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

generateLikes(30)
    .then(() => {
        console.log("Faker likes created!");
        process.exit(0);
    })
    .catch((error) => {
        console.log("Error creating fake likes: ", error);
        process.exit(1);
    });