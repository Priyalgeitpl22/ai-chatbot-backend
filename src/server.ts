import http from "http";
import { socketSetup } from "./socket/socketConfig";
import app from "./app";

const server = http.createServer(app);
socketSetup(server);

const PORT = process.env.PORT || 5003;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
