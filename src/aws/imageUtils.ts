import { S3 } from "aws-sdk";
import { bucket_name, s3Conifg } from "./s3";

export const uploadImageToS3 = async (file: Express.Multer.File): Promise<string> => {
    try {
        if (!file || !file.buffer) {
            throw new Error("No file buffer provided");
        }

        const fileName = `profilepictures/${Date.now()}-${file.originalname.replace(/\s/g, "_")}`;
        const params: S3.PutObjectRequest = {
            Bucket: bucket_name,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
        };

        const uploadResult = await s3Conifg.upload(params).promise();
        return uploadResult.Key;

    } catch (error) {
        console.error("S3 Upload Error:", error);
        throw new Error("File upload failed");
    }
};


export const getPresignedUrl = async (fileName: string) => {
    try {
        const params = {
            Bucket: bucket_name,
            Key: fileName,
            Expires: 604800,
        };

        return s3Conifg.getSignedUrlPromise("getObject", params);
    } catch (err) {
        console.error("S3 get Error:", err);
        throw new Error("File get failed");
    }
};

export const deleteImageFromS3 = async (fileName: string) => {
    try {
        const params = {
            Bucket: bucket_name,
            Key: fileName,
        };

        return s3Conifg.deleteObject(params).promise();

    } catch (err) {
        console.error("S3 delete Error:", err);
        throw new Error("File delete failed");
    }
};
