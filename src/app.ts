import express from "express";
import routes from "./routes";
import cors from "cors";
const path = require("path");
import dotenv from 'dotenv';
import { CronJob } from "cron";
import { deleteThread } from "./controllers/thread.controller";
dotenv.config();

const app = express();
app.use(cors({
  origin: ["http://localhost:5173", "https://aichatboat.jooper.ai", "https://api.chat.jooper.ai"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
  optionsSuccessStatus: 200
}));
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
