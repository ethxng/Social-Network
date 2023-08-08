# Social-Network
In this repo, I attempted to recreate the backend of a social network application. It will include functionality such as liking/commenting on a post, authentication through real Facebook username and password, sending/accepting/rejecting friends' request, viewing friends' posts, suggesting new friends, etc. 

To run this application, run "npm run devStart" into the terminal 

NOTE: To perform tests, you have to change the code in index.js file (comments as how to change the code are included in there)

# API Documentation

## /auth/facebook

**Method:** GET

**Functionality:** Redirect the user to FaceBook's log-in page. If authentication is successful, Facebook will redirect the user back to the feed page.

## /auth/guest-sign-in

**Method:**: POST

**Functionality:** Allow the user to bypass the authentication system without having the create an acccount in order to access the feed page. This endpoint will provide the user with guest access and allow them to perform any actions that an authorized user can.

## /auth/sign-in

**Method:** POST

**Example JSON:**

```
{
    username: "username",
    password: "password" 
}
```

**Returns:**

- Upon successful authentication, it will redirect the user to the feed page.

- Upon failed authentication, it will redirect the user to the **/error** endpoint.

## /auth/log-out

**Method:** POST

**Functionality:** Calling this endpoint will simply log the user out of the session. The user will no longer be able to access the feed page or perform any actions that an authorized user would.

## /auth/sign-up

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

## /friendReq/send/:receiver_id

**Method:** POST

**Functionality:** *receiver_id* is a parameter that contains the id of the user who is receiving this friend request. Calling this endpoint will create a Friend Request and send it to that person. If the Friend Request has already existed, then it will return a 409 HTTP status, stating the Friend Request already exists.

## /friendReq/modify/:receiver_id

**Method:** PATCH

**Example JSON:**
```
{
    "friendReq": "the_friendReq_objectId",
    "status": "can either be 'accept' or 'reject' "
}
```

**Functionality:** If the status is **'accept'**, both the user and the 'to-be-friend' user will officially be on each other's friends' list. However, if the status is **"reject"**, nothing will happen. In both cases, the Friend Request object will be removed from the DB.

## /friendReq/

**Method:** GET

**Functionality:** Returns all the Friend Requests that the user has received.

## /friendReq/newFriends

**Method:** GET

**Functionality:** Returns "friends of friends," or "suggested friends," that the user could potentially add to their friend's list. In another way, this endpoint will help finding mutuals. 

## /post/:post_id/addLike

**Method:** POST

**Functionality:** *post_id* is the parameter that contains the ObjectId of that post. Using the *:post_id,* this endpoint will add a like from the currently logged-in user to the specified post. 

## /post/:post_id/removeLike

**Method:** DELETE

**Functionality:** *post_id* is the parameter that contains the ObjectId of that post. Using the *post_id,* this endpoint will remove the Like from the specified post. It will return HTTP status code 404 if the *post_id* is not found, i.e. you are trying to remove a Like from a post that does not exist. 

## /post/:post_id/addComment

**Method:** POST

**Example JSON:**

```
{
    "content": "the content of your comment"
}
```

**Functionality:** *post_id* is the parameter that contains the ObjectId of that post. Using the *post_id,* this endpoint will add a comment to that specified post from the logged-in user. Duplicated comments do not matter because the user can add as many comments as he likes. 

## /post/:post_id

**Method:** GET

**Functionality:** *post_id* is the parameter that contains the ObjectId of that post. Using the *post_id,* this endpoint will return that specific post, which will include the post itself, along with the **total number of Likes, all the comments (and all the associated commenter).**

## /post/

**Method:** GET

**Functionality:** The root endpoint **(/)** will be redirected to this endpoint. It will return the feed page, including all of the user's friends' posts, similarly to the endpoint above, but this time, it returns multiple posts, sorted from newest to oldest. 

## /post/image/:key

**Method:** GET

**Functionality:** this endpoint will retrieve the image straight from S3 buckets to the frontend

## /post/create

**Method:** POST

**Example JSON:**

``` 
{
    "content": "your post content",
    "_image": You can attach a photo to your post (optional)
}
```

**Functionality:** This endpoint will create a post in the DB, from the currently logged-in user. If you do attach a photo in the post, it will be uploaded to S3 buckets. In the DB, the Post object will include the key to retrieve the associated photo from S3 bucket. 

## /profile/

**Method:** GET

**Functionality:** Returns the currently logged-in user's profile and all of the user's posts (and all likes/comments associated with each post)

## /profile/:id

**Method:** GET

**Functionality:** Returns the profile of any user (including the currently authorized user) and all of that user's posts (and all likes/comments associated with each post)

## /profile/update

**Method:** PATCH

**Example JSON:**

```
{
    "newName": "User's new name",
    "updated_pic": You can attach a new profile photo (optional)
}
```

**Functionality:** Update a user's name and profile picture. The profile picture is optional. 