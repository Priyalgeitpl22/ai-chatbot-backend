import express from "express";
import routes from "./routes";
import cors from "cors";
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/api", routes);
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.send("Welcome to the API!");
});

export default app;
