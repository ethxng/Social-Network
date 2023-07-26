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
const FriendReq = require('../../models/friendRequest');
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

describe("GET /send/:receiver_id", () => {
    test("assumed valid id attached in req.params, should send a friendReq to the receiver", async () => {
        const user = { username: "LeGoat2", password: "jjames06" };

        const loginRes = await logIn(user);

        // random receiver id from the DB
        const receiver_id = "646930a0a887e86f86be74b8";

        const total = await FriendReq.countDocuments({receiver: receiver_id});

        const res = await request(app)
            .post(`/friendReq/send/${receiver_id}`)
            .set("Cookie", loginRes.headers['set-cookie']);

        expect(res.status).toBe(200);
        expect(res.text).toBe("Success!");

        const confirm = await FriendReq.countDocuments({receiver: receiver_id}); 

        // remove the test FriendReq after it is created through the route
        const all = await FriendReq.find({receiver: receiver_id}).populate('sender');
        for (let i = 0; i < all.length; i++) {
            const sender = all[i].sender;
            if (sender.username === user.username) {
                await FriendReq.findOneAndRemove({sender: sender._id.toString(), receiver: receiver_id});
            }
        }
    }, 10000);
});

describe("PATCH /modify/:receiver_id", () => {
    // 2 case: reject and accept 
    test("assumed valid receiver_id and reject the friendReq, should delete the friendReq obj from DB", async () => {
        const user = { username: "LeGoat2", password: "jjames06" };

        const loginRes = await logIn(user);

        // random receiver id from the DB
        const receiver_id = "646930a0a887e86f86be74b8";

        const sendRequest = await request(app)
            .post(`/friendReq/send/${receiver_id}`)
            .set('Cookie', loginRes.headers['set-cookie']);

        expect(res.status).toBe(200);
        expect(res.text).toBe("Success!");

        const modifyRequest = await request(app)
            .patch('/friendReq/')
    }, 10000)
})

//describe()

afterAll((done) => {
    mongoose.connection.close();
    server.close();
    done();
});