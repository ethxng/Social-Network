const path = require('path')
// do this because the .env file is a level above the current directory
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const request = require('supertest');
const app = require('../../index'); // Your Express app
const server = require('../../server');
const mongoose = require('mongoose');
const User = require("../../models/user");
const {removeFileFromS3} = require('../../s3');
const fs = require('fs');

describe("POST /sign-in", () => {
    test('given valid credentials, should authenticate a user and return a success response', async () => {
        const validUser = { username: 'LeGoat2', password: 'jjames06' };
    
        const response = await request(app)
          .post('/auth/sign-in')
          .send(validUser);

        const req = response.req;
        expect(response.status).toBe(302);
        expect(response.header['location']).toBe('/success'); // success authentication are redirect to /success
      }, 10000);    

    test("given invalid credentials, should not authenticate and redirect the user to /error route", async () => {
        const user = { username: "abc", password: "def" };

        const response = await request(app)
            .post('/auth/sign-in')
            .send(user);
        
        expect(response.status).toBe(302);
        expect(response.header['location']).toBe('/error');
    }, 10000);
});

describe("POST /guest-sign-in", () => {
    test("route guest-sign-in should work regardless once called", async () => {
        const response = await request(app)
            .post('/auth/guest-sign-in');
        
        expect(response.status).toBe(302);
        expect(response.header['location']).toBe('/success');
        //expect(response.req.user).toBeDefined();
        //console.log(response);
        
    }, 10000);
});

describe("POST /log-out", () => {
    test("log-out route should not let user have access to protected routes afterwards", async () => {
        const user = { username: "LeGoat2", password: "jjames06"};
        const loginResponse = await request(app)
            .post('/auth/sign-in')
            .send(user);

        expect(loginResponse.status).toBe(302);
        expect(loginResponse.header['location']).toBe('/success');

        const logoutResponse = await request(app)
            .post('/auth/log-out')
            .set('Cookie', loginResponse.headers['set-cookie']);

        expect(logoutResponse.status).toBe(302);
        expect(logoutResponse.header['location']).toBe('/welcome'); // users will be redirect to /welcome page after logging out

        // Attempt to access a protected resource after logout
        const protectedResourceResponse = await request(app)
        .get('/')
        .set('Cookie', loginResponse.headers['set-cookie']);

        expect(protectedResourceResponse.status).toBe(302);
        expect(protectedResourceResponse.header['location']).toBe('/error');
    }, 10000);
});

// test sign-up next
describe("POST /sign-up", () => {
    // there will be 4 test cases
    afterEach(async () => {
        // remove the user after successfully adding them into the DB
        await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        const result = await User.findOneAndRemove({username: "the_real_spider_man"});
        // if there is a result, check the photo_key, if it is not the default pic, then delete it from S3 bucket
        if (result) {
            if (result.photo_key !== process.env.BLANK_PROFILE_PIC_KEY) {
                await removeFileFromS3(result.photo_key);
            }
        } 
        await mongoose.disconnect();
    }, 10000);
    test("valid credentials with default photo", async () => {
        // name is in req.body.name
        // username is in req.body.username
        // DOB is in req.body.bday
        // password is in req.body.password
        const credentials = {
            name: "Peter Parker",
            username: "the_real_spider_man",
            DOB: "8/1/2003",
            password: "ihateelectro2" 
        };
        const response = await request(app)
            .post('/auth/sign-up')
            .send(credentials);

        expect(response.status).toBe(302);
        expect(response.header['location']).toBe("/welcome");
    }, 10000);
    // for test case number 3, not only do you want to remove the user from the DB, you also want to remove the photo_key from S3 using removeFileFromS3 
    test("invalid credentials (such as missing data and invalid DOB) with default photo", async () => {
        // test missing data
        const missing_credentials = {
            name: "Peter Parker",
            DOB: "8/1/2003",
            password: "ihateelectro2"
        };

        const firstRes = await request(app)
            .post("/auth/sign-up")
            .send(missing_credentials);

        expect(firstRes.status).toBe(400);
        expect(firstRes.body).toEqual({"error": "Missing data. (either name, username, password, or DOB)"});

        // test invalid data (such as DOB)
        const invalid_credentials = {
            name: "Peter Parker",
            username: "the_real_spider_man",
            DOB: "jfsdlaureiow",
            password: "ihatelectro2"
        };

        const secondRes = await request(app)
            .post('/auth/sign-up')
            .send(invalid_credentials);

        expect(secondRes.status).toBe(400);
        expect(secondRes.body).toEqual({"error": "The DOB you provided is not in the right date forma. Make sure it's MM/DD/YYYY"});
    }, 10000);

    // test case No. 3: providing valid credentials with a profile photo 
    test("valid credentials with a profile pic", async () => {
        await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        const res = await request(app)
            .post('/auth/sign-up')
            .field('name', "Peter Parker")
            .field('username', "the_real_spider_man")
            .field('DOB', "8/1/2003")
            .field("password", "ihateelectro2")
            .attach('profile_pic', "peter_parker.jpeg");

        expect(res.status).toBe(302);
        expect(res.header['location']).toBe("/welcome");    
    }, 10000);

    // test case No. 4: invalid credentials with a profile photo
    test("invalid credentials with a profile pic", async () => {
        const res = await request(app)
            .post('/auth/sign-up')
            .field('name', "Peter Parker")
            .field('username', "the_real_spider_man")
            .field("password", "ihateelectro2")
            .attach('profile_pic', "peter_parker.jpeg");
        
        expect(res.status).toBe(400);
        expect(res.body).toEqual({"error": "Missing data. (either name, username, password, or DOB)"});
    }, 10000);
});

afterAll((done) => {
    mongoose.connection.close();
    server.close();
    done();
});
  