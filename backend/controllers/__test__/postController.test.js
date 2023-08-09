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

// TODO: consider using dynamic post ID instead of hard-coded post id
describe("POST /post/:post_id/addLike", () => {
    test("with given post_id, should add a like from signed in user to that post", async () => {
        // all routes need to be logged in first before you can access it 
        const user = { username: 'LeGoat2', password: 'jjames06' };

        const loginRes = await logIn(user);

        // pull post id straight from testing DB
        const post_id = "64840131601759bd6e97cbf6";

        const res = await request(app)
            .post(`/post/${post_id}/addLike`)
            .set('Cookie', loginRes.headers['set-cookie']);

        expect(res.status).toBe(200);
        expect(res.text).toEqual("Success!");

        await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        const result = await Like.find({post: post_id});
        expect(result).toHaveLength(1); // the only one like is from the user above;

        // remove after adding Like to the DB
        await Like.findOneAndRemove({post: post_id});

    }, 10000);
});

describe("POST /post/:post_id/addComment", () => {
    // test adding a comment to the DB
    test("with given post_id, should add a comment from signed in user to that post", async () => {
        const user = { username: "LeGoat2", password: "jjames06" };

        const loginRes = await logIn(user);
        
        const post_id = "64840131601759bd6e97cbf6";

        const res = await request(app)
            .post(`/post/${post_id}/addComment`)
            .send({ content: "OMG Lebron James preach!!!" })
            .set("Cookie", loginRes.headers['set-cookie']); // need this so ser ver can remember authorized user from above
        
        expect(res.status).toBe(200);
        expect(res.text).toEqual("Success!");

        await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        const result = await Comment.find({post: post_id});
        expect(result).toHaveLength(1); // the only one comment is from the user above (this post is a test, has no likes or comments initially)

        // remove that comment after successfully adding it to the DB
        await Comment.findOneAndRemove({post: post_id});
    }, 10000);
});

describe("POST /post/:post_id", () => {
    test("given a valid ObjectId, should return a specific post", async () => {
        const user = { username: "LeGoat2", password: "jjames06"};

        const loginRes = await logIn(user);

        // pull out a random post in the testing DB
        const randomPostId = "646805e0bfc88ed6a4f6ab21";
        const res = await request(app)
            .get(`/post/${randomPostId}`)
            .set('Cookie', loginRes.headers['set-cookie']);

        // the response (no matter how many likes or comments it has) must have these 3 fields defined
        expect(res.status).toBe(200);
        expect(res.body.getLikes).toBeDefined();
        expect(res.body.getComments).toBeDefined();
        expect(res.body.findPost).toBeDefined();
    });

    test("given an invalid ObjectId, should return a bad request", async () => {
        // invalid ObjectId 
        const ObjId = "hfg75yut7r8ty3";
        const user = { username: "LeGoat2", password: "jjames06" };

        const loginRes = await logIn(user);

        const res = await request(app)
            .get(`/post/${ObjId}`)
            .set('Cookie', loginRes.headers['set-cookie']);

        expect(res.status).toBe(400); // bad request because the ObjectId is invalid
    });
});

describe("GET / (index route)", () => {
    test("should return all Posts from friends of users, and all Comments and Likes associated with all Posts", async () => {
        const user = { username: "LeGoat2", password: "jjames06" };

        const loginRes = await logIn(user);

        // in my code, I have the index route redirect itself to /post, which returns the user's index page
        const res = await request(app)
            .get('/')
            .set('Cookie', loginRes.headers['set-cookie']);

        expect(res.status).toBe(302);
        
        const redirection = await request(app)
            .get(res.header['location'])
            .set('Cookie', loginRes.headers['set-cookie']);
            
        expect(redirection.status).toBe(200);
        expect(redirection.body).toBeInstanceOf(Array);
    }, 10000);
});

// test create post route
describe("POST /post/create", () => {
    // 2 cases: post with and without photo attached
    const data = {
        content: "MAN CITY IS THE CHAMPION OF EUROPE OF THE 2023-24 SEASON!"
    };
    afterEach(async () => {
        await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        const result = await Post.findOneAndRemove({content: data.content}); // remove post after testing it successfully
        if (result.photo_key) {
            // delete photo if attach in post
            await removeFileFromS3(result.photo_key);
        }
    })
    test("given content without a photo, should make a post and upload it to DB", async () => {
        const user = { username: "LeGoat2", password: "jjames06" };

        const loginRes = await logIn(user);
        
        const res = await request(app)
            .post('/post/create')
            .send(data)
            .set('Cookie', loginRes.headers['set-cookie']);

        expect(res.status).toBe(200);
        expect(res.text).toEqual("Success! New post saved successfully");

        // this makes sure that the post exist in the DB after calling the route
        const confirm = await Post.findOne({content: data.content});
        expect(confirm).toBeDefined();

        // await Post.findOneAndRemove({ content: data.content });
    }, 10000);

    // case where photo is attached in the post
    test("given content with a photo, should make a post and upload it to DB and S3 bucket", async () => {
        const user = { username: "LeGoat2", password: "jjames06"};

        const loginRes = await logIn(user);

        const res = await request(app)
            .post('/post/create')
            .field('content', data.content)
            .attach('_image', "peter_parker.jpeg")
            .set("Cookie", loginRes.headers['set-cookie']);

        expect(res.status).toBe(200);
        expect(res.text).toEqual("Success! New post saved successfully");

        // confirm that the newly made post exist in the DB
        const confirm = await Post.findOne({content: data.content});
        expect(confirm).toBeDefined();
        
    }, 10000);
});


afterAll((done) => {
    mongoose.connection.close();
    server.close();
    done();
});