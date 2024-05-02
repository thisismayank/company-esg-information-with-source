import response from "../lib/response.js";

import EsgerClass from "../classes/esger.class.js";

export const generateResponse = async (req, res) => {
  try {
    const responseObj = { body: req.body };
    console.log("HERE in controller");

    const socketId = req.body.socketId; // Make sure this matches the key sent from the client

    //   console.log("req.app.io", req.app.io);
    let socket;
    if (req.app.io.sockets.sockets) {
      socket = req.app.io.sockets.sockets.get(socketId);
    }

    const authObject = new EsgerClass();
    const result = await authObject.brandLogoAndAuthChecker(
      req.body.company,
      socket
    );
    console.log("result", result);
    res.send(result);
  } catch (error) {
    res.status(500).send({
      ...response.APPLICATION_ERROR.SERVER_ERROR,
      messageObj: { error: error.toString() },
    });
  }
};
