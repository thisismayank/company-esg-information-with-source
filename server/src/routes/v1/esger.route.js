import express from "express";
import * as controller from "../../controllers/esger.controller.js";

const router = express.Router();

router.route("/check").post(controller.generateResponse);

export default router;
