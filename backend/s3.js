require('dotenv').config()
const fs = require('fs');
const S3 = require('aws-sdk/clients/s3');


const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;
const region = process.env.AWS_BUCKET_REGION;
const bucketName = process.env.AWS_BUCKET_NAME;

const s3 = new S3({
    region, 
    accessKeyId,
    secretAccessKey
});

// uploads a file to S3 
exports.uploadFileToS3 = function(file) {
    // file in the req.file that is attached in the request body
    const fileStream = fs.createReadStream(file.path);

    const uploadParams = {
        Bucket: bucketName,
        Key: file.filename, 
        Body: fileStream
    }

    return s3.upload(uploadParams).promise();
}

// retrieve a file from S3 (file will be a photo, so it will be sent directly as a photo to the frontend)
exports.getFileFromS3 = function(fileKey){
    const downloadParams = {
        Key: fileKey, 
        Bucket: bucketName
    }

    return s3.getObject(downloadParams).createReadStream();
}

// remove a file from S3
exports.removeFileFromS3 = function(fileKey) {
    const params = {
        Key: fileKey, 
        Bucket: bucketName
    }

    return s3.deleteObject(params).promise();
}