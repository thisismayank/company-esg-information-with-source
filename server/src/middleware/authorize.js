import response from "../lib/response";
import { decodeToken } from "../lib/token";

export const authorize = async (req, res, next) => {
    try {

        const authHeader = req.get("Authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(403).json(response.APPLICATION_ERROR.MISSING_AUTH);
        }
        const stripStart = "Bearer ".length;
        // Strip the leading "Bearer " part from the token string
        const userIdToken = authHeader.substring(stripStart);
        // Split the user ID and token part from the rest of the token string
        const [userId, token] = userIdToken.split(",");

        const decodedToken = await decodeToken(token);

        // Checking if decoded token and user ID are same
        if (userId !== decodedToken.id) {
            return res.status(403).json(response.APPLICATION_ERROR.UNAUTHORIZED);
        }

        req.body.userId = userId;

        next();

    } catch (error) {
        // Assume failed decoding means bad token string

        return res.status(401).send({
            ...response.APPLICATION_ERROR.UNAUTHORIZED,
            messageObj: { error: error.toString() }
        });
    }
}