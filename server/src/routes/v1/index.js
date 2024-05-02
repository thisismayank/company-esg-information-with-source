import express from "express";
import esgerRoutes from "./esger.route";

const v1Router = express.Router();

v1Router.use("/esgers", esgerRoutes);

export default v1Router;
