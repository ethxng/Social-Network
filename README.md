# Social-Network
In this repo, I attempted to recreate the backend of a social network application. It will include functionality such as liking/commenting on a post, authentication through real Facebook username and password, sending/accepting/rejecting friends' request, viewing friends' posts, suggesting new friends, etc. 

To run this application, run "npm run devStart" into the terminal 

NOTE: To perform tests, you have to change the code in index.js file (comments as how to change the code are included in there)

# API Documentation

## /auth/facebook

---

**Method:** GET

**Functionality:** Redirect the user to FaceBook's log-in page. If authentication is successful, Facebook will redirect the user back to the feed page.

## /auth/guest-sign-in

---

**Method:**: POST

**Functionality:** Allow the user to bypass the authentication system without having the create an acccount in order to access the feed page. This endpoint will provide the user with guest access and allow them to perform any actions that an authorized user can.

## /auth/sign-in

---

**Method:** POST

**Example JSON:**

```
{
    username: "username",
    password: "password" 
}
```

**Returns:**

> Upon successful authentication, it will redirect the user to the feed page.

> Upon failed authentication, it will redirect the user to the **/error** endpoint.

## /auth/log-out

---

**Method:** POST

**Functionality:** Calling this endpoint will simply log the user out of the session. The user will no longer be able to access the feed page or perform any actions that an authorized user would.

## /auth/sign-up

---

**Method:** POST

**Example JSON:**
```
{
    "name": "your_name",
    "username": "your_username",
    "DOB": "your_DOB",
    "password": "your_password",
    "profile_pic": Optional, you can attach a picture, and it will be used as your profile page; else, it will use a standard picture of a blank face
}
```

**Functionality:** Create a user profile. After hitting this endpoint, the user will have to sign in using the newly created username and password. 