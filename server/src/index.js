import http from "http";
import app from "./config/express.config.js";
import logger from "./lib/logger.js";
import { connectMongoose } from "./lib/mongoose.js";
import EsgerClass from "./classes/esger.class.js";

const appServer = http.createServer(app);
const io = require("socket.io")(appServer, {
  cors: {
    origin: "http://localhost:3000", // Allow your front-end to connect
    methods: ["GET", "POST"], // Specify which methods are allowed
    credentials: true, // Allow cookies and other credentials to be sent along with the request
  },
});

app.io = io;
appServer.listen(8000, async () => {
  logger.info("INFO: Listening on port 8000");
  // await connectMongoose();
  // const esg = new EsgerClass();
  // const response = await esg.brandLogoAndAuthChecker("TeesMar");

  // const response = await esg.generateResponse("", "Nvidia");
  // const response = await esg.factCheckerPplx("Google");

  // await esg.factCheckerAnthropic(
  //   "Does Nvidia track scope 1 emissions?",
  //   "Nvidia"
  // );
  // console.log(JSON.stringify(response, null, 2));
});
