import express from "express";
import routes from "./routes";
import cors from "cors";
const path = require("path");
import dotenv from 'dotenv';
import { CronJob } from "cron";
import { deleteThread } from "./controllers/thread.controller";
dotenv.config();

const app = express();
const corsOptions = {
  origin: true, // Allow all origins (not recommended for production)
  credentials: true,            //access-control-allow-credentials:true
  optionSuccessStatus: 200
}
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static("public"));
app.use("/api", routes);
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.send("Welcome to the AI Chatbot!!");
});

const job = new CronJob('0 0 * * *', async () => {
  await deleteThread();
}, null, true);


export default app;
