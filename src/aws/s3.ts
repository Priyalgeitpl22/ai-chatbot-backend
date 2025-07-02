import AWS from "aws-sdk";
import dotenv from "dotenv";

dotenv.config();

const s3Conifg = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const bucket_name = process.env.AWS_BUCKET_NAME || 'ai-chatbot-images';

export { s3Conifg, bucket_name };
