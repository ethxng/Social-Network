const path = require('path')
// do this because the .env file is a level above the current directory
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { faker } = require('@faker-js/faker');
const User = require('../models/user');
const mongoose = require('mongoose');
// or, if desiring a different locale
// const { fakerDE: faker } = require('@faker-js/faker');

const generateFakeUsers = async (count) => {
    for (let i = 0; i < count; i++) {
      const user = new User({
        name: faker.person.fullName(),
        username: faker.internet.userName(),
        DOB: faker.date.birthdate(),
        password: faker.internet.password(),
      });
  
      await user.save();
    }
};

// make connection to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true , useUnifiedTopology: true});
const db = mongoose.connection;
db.on('on', console.error.bind(console, "MongoDB Connection Error"));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// generate fake users
generateFakeUsers(5)
    .then(() => {
        console.log("Faker users created!");
        process.exit(0);
    })
    .catch((error) => {
        console.log("Error creating fake user: ", error);
        process.exit(1);
    });