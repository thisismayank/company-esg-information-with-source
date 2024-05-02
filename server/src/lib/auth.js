import asyncRedis from "async-redis";
import { redisConfig } from "../config";
import moment from "moment";
const redisClient = asyncRedis.createClient(redisConfig.port, redisConfig.host);

const getEmailToken = (isWhiteListed) => {
    if (isWhiteListed)
        return "112233";
    return Math.floor(Math.random() * 899999 + 100000);
};

export const generateEmailVerificationToken = async (
    email,
    isLogin = false,
    isWhiteListed = false
) => {

    // if (email.includes("mayank")) {
    //     isWhiteListed = true
    // }

    const expiryTime = moment()
        .add(5, "minutes");

    const deviceToken = +new Date();
    const token = getEmailToken(isWhiteListed);
    const tokenDetails = {
        token,
        expiryTime,
        deviceToken,
        wrongEmailTokenCount: 0,
        resendEmailTokenCount: 0,
        isLogin: isLogin,
    };

    if (!isLogin) {
        tokenDetails.emailTokenVerified = false;
    }

    await redisClient.set(
        `user_${email}_${deviceToken}_email_token`,
        JSON.stringify({
            token,
            expiryTime,
            deviceToken,
            wrongEmailTokenCount: 0,
            resendEmailTokenCount: 0,

            isLogin: isLogin,
        }),
        "EX",
        60 * 5
    );

    const expiryTimeVerbose = expiryTime.format("DD MMM YYYY, hh:mm A");

    return {
        token,
        expiryTime,
        deviceToken,
        expiryTimeVerbose,
        wrongEmailTokenCount: tokenDetails.wrongEmailTokenCount,
        resendEmailTokenCount: tokenDetails.resendEmailTokenCount,
        isLogin: isLogin,
    };
};

export const isValidEmailToken = async (email, deviceToken, token) => {
    let existingToken = await redisClient.get(
        `user_${email}_${deviceToken}_email_token`
    );

    if (!existingToken) {
    }

    const currentTime = moment();
    if (
        existingToken &&
        currentTime < moment(JSON.parse(existingToken).expiryTime)
    ) {
        existingToken = JSON.parse(existingToken);

        const timeRemaining = await redisClient.ttl(
            `user_${email}_${deviceToken}_email_token`
        );

        if (
            existingToken.token.toString() === token.toString() &&
            +existingToken.wrongEmailTokenCount < 3
        ) {
            existingToken.emailTokenVerified = true;
            existingToken.emailVerified = true;

            await redisClient.set(
                `user_${email}_${deviceToken}_email_token`,
                JSON.stringify(existingToken),
                "EX",
                60 * 10
            );

            return { isValid: true, tokenDetails: existingToken };
        } else {
            existingToken.wrongEmailTokenCount =
                existingToken.wrongEmailTokenCount + 1;

            await redisClient.set(
                `user_${email}_${deviceToken}_email_token`,
                JSON.stringify(existingToken),
                "EX",
                timeRemaining
            );

            return { isValid: false, tokenDetails: existingToken };
        }
    } else {
        return {
            isValid: false,
            tokenExpired: true,
            tokenDetails: {
                wrongEmailTokenCount: 4,
                resendEmailTokenCount: 4
            }
        };
    }
};


export const canUserCreateANewAccount = async (email, deviceToken) => {
    let existingToken = await redisClient.get(
        `user_${email}_${deviceToken}_email_token`
    );

    if (!existingToken) {
    }

    const currentTime = moment();

    if (
        existingToken &&
        currentTime < moment(JSON.parse(existingToken).expiryTime)
    ) {
        existingToken = JSON.parse(existingToken);

        const { emailTokenVerified, emailVerified } = existingToken;


        const canUserCreateNewAccount = emailTokenVerified || false;

        return { canUserCreateNewAccount };
    } else {

        return {
            isValid: false,
            tokenExpired: true,
            tokenDetails: {
                wrongEmailTokenCount: 4,
                resendEmailTokenCount: 4
            }
        };
    }
}