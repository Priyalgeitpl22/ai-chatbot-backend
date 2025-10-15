import http from "http";
import { socketSetup } from "./socket/socketConfig";
import app from "./app";
// import { startInactivityJob } from "./utils/inactivityJob";
import { emailReplyCronService } from "./utils/emailReplyCron";

const server = http.createServer(app);
socketSetup(server);


// startInactivityJob();
emailReplyCronService.start();

const PORT = process.env.PORT || 5003;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
