import http from "http";
import { socketSetup } from "./socket/socketConfig";
import app from "./app";
// import { startInactivityJob } from "./utils/inactivityJob";

const server = http.createServer(app);
socketSetup(server);


// startInactivityJob();

const PORT = process.env.PORT || 5003;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
