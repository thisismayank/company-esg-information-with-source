import express from "express";
import path from "path";
import v1Routes from "./routes/v1";

export default function createRouter() {
    const router = express.Router();

    // static assets, served from "/public" on the web
    router.use("/public", express.static(path.join(__dirname, "..", "public")))
    /**
   * Uncached routes:
   * All routes that shouldn't be cached (i.e. non-static assets)
   * should have these headers to prevent 304 Unmodified cache
   * returns. This middleware applies it to all subsequently
   * defined routes.
   */
    router.get("/*", (req, res, next) => {
        res.set({
            "Last-Modified": new Date().toUTCString(),
            Expires: -1,
            "Cache-Control": "must-revalidate, private"
        })
        next()
    });

    //++++++++++++++++ ROUTES +++++++++++++++

    router.use("/v1", v1Routes);

    //++++++++++++++++ ROUTES +++++++++++++++


    //handle 404
    router.all("/*", (req, res, next) => {
        res.set({
            "Last-Modified": new Date().toUTCString(),
            Expires: -1,
            "Cache-Control": "must-revalidate, private"
        })
        next()
    });



    return router;
}