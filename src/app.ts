import express from "express";
import routes from "./routes";
import cors from "cors";
const path = require("path");
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors({
  origin: true, // Allow all origins (not recommended for production)
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS","PATCH"],
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


export default app;
