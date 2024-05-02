
import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import httpContext from "express-http-context";
import createRouter from "../router.js";
import randomstring from "randomstring";

const app = express();

app.use(cors({ origin: "*" })); // Cross-Origin Resource Sharing
app.use(compression()); // compress to enhance functionality
app.use(cookieParser()); // parse cookies automatically - req.cookies
app.use(express.json()); // parse json bodies automatically
app.use(express.urlencoded({ extended: true })); // for URL-encoded data in html form submissions
app.use(httpContext.middleware); // set and get variables on current request like req.headers


app.use((req, res, next) => {
  let id = randomstring.generate();
  httpContext.set("reqId", id);
  req.id = id;
  next();
});

// app.use(morganAccessLogger);


app.use("/", createRouter());

export default app;