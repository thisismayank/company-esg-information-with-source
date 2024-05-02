import jwt from "jsonwebtoken";

const jwtExpiresIn = "2 days";
const jwtSecret = "c4rB0n-mksd"

export const generateToken = async (id) => {
    const token = await jwt.sign(
        { id },
        jwtSecret,
        { expiresIn: jwtExpiresIn }
    )

    return token;
}


export const decodeToken = async (token) => {
    const decoded = await jwt.verify(
        token,
        jwtSecret
    )

    return decoded;
}