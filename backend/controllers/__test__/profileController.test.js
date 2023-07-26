const path = require('path')
// do this because the .env file is a level above the current directory
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const request = require('supertest');
const app = require('../../index'); // Your Express app
const server = require('../../server');
const mongoose = require('mongoose');
const User = require("../../models/user");
const Post = require("../../models/post");
const Like = require("../../models/like");
const Comment = require("../../models/comment");
const {removeFileFromS3} = require('../../s3');

async function logIn(user) {
    const loginRes = await request(app)
        .post("/auth/sign-in")
        .send(user);

    // expect the user to log in successfully and redirect to /success
    expect(loginRes.status).toBe(302);
    expect(loginRes.headers['location']).toBe("/success");

    // return the whole response
    return loginRes;
}

// test index route, which return the profile of the user
// test /:id route, which return the profile of any user (including himself)
// test /update route, which updates a user

describe("GET /profile", () => {
    test("should return the profile of the signed in user", async () => {
        const user = { username: "LeGoat2", password: "jjames06" };

        const loginRes = await logIn(user);

        const res = await request(app)
            .get('/profile')
            .set("Cookie", loginRes.headers['set-cookie']);
        
        // expect profile and posts field to be there
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('profile');
        expect(res.body).toHaveProperty('posts');
    }, 10000);
});

describe("GET /profile/:id", () => {
    test("given a user's id, should return that user's profile", async () => {
        const user = { username: "LeGoat2", password: "jjames06" };

        const loginRes = await logIn(user);

        // random user id
        const randomUserId = "6467feda6d2b79c88cef554e";

        const res = await request(app)
            .get(`/profile/${randomUserId}`)
            .set('Cookie', loginRes.headers['set-cookie']);

        // expect profile and posts field to be there
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('profile');
        expect(res.body).toHaveProperty('posts');
    }, 10000);
});

describe('PATCH /update', () => {
    // 2 case: update with and without photo
    const old_data = {
        name: "Lebron James", 
        photo_key: "68542296b14ea8d45a736b1242970ca3"
    };
    const new_data = {
        newName: "LeFamous James"
    }
    test("update a user's profile with no new photo", async () => {
        const user = { username: "LeGoat2", password: "jjames06" };

        const loginRes = await logIn(user);
        const res = await request(app)
            .patch('/profile/update')
            .send(new_data)
            .set("Cookie", loginRes.headers['set-cookie']);
        
        expect(res.status).toBe(200);
        expect(res.body.updatedUser.name).toEqual(new_data.newName);

        // return to the original object state after passing expect statment
        await User.findOneAndUpdate({username: user.username}, {name: old_data.name});
    }, 10000);

    test("update a user profile with a new photo", async () => {
        const user = { username: "LeGoat2", password: "jjames06" };

        const loginRes = await logIn(user);

        const beforeUpdate = await User.findOne({ username: user.username });
        const photo_key = beforeUpdate.photo_key;

        const res = await request(app)
            .patch('/profile/update')
            .field('newName', new_data.newName)
            .attach('updated_pic', 'peter_parker.jpeg')
            .set("Cookie", loginRes.headers['set-cookie']);

        expect(res.status).toBe(200);
        expect(res.body.updatedUser.name).toEqual(new_data.newName);

        // if the photo_key are not equal to each other, then photo has been successfully updated
        expect(res.body.photo_key).not.toEqual(photo_key);
    }, 10000);
});

afterAll((done) => {
    mongoose.connection.close();
    server.close();
    done();
});

