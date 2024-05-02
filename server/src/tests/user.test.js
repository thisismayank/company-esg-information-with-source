import asyncRedis from "async-redis";
import http from "http";
import mongoose from "mongoose";
import request from "supertest";

import LearningModuleModel from "../../models/learningModules.model";
import UserModel from "../../models/users.model";

import app from "../../config/express.config";
import { env, mongooseConfig, redisConfig } from "../../config";
import { message, code } from "../../constants";
import { moduleMock, userMock } from "../mocks";
// import { async } from "rxjs/internal/scheduler/async";
import { expectCt } from "helmet";

const server = http.createServer(app);
let mongooseConn = null;
let redisClient = null;

beforeAll(async () => {
    server.listen();
    redisClient = await asyncRedis.createClient(
        redisConfig.port,
        redisConfig.host
    );
});

beforeEach(async () => {
    mongooseConn = await mongoose.createConnection(
        mongooseConfig[env].url,
        mongooseConfig[env].options
    );
});

afterEach(async () => {
    await redisClient.flushall();
    mongooseConn.dropDatabase();
});

afterAll(async () => {
    await redisClient.quit();
    server.close();
});

describe("Basic", () => {
    it(" test 400", async () => {
        return request(app)
            .post("/v1/users")
            .then(response => {
                expect(response.statusCode).toBe(400);
            });
    });

    it(" test 404", async () => {
        return request(app)
            .post("/v1/not-a-url")
            .then(response => {
                expect(response.statusCode).toBe(404);
            });
    });
});

describe("User", () => {
    const doSignUp = async user => {
        const signUpPhoneResponse = await request(app)
            .post("/v1/users/email")
            .send({ email: user.email })
            .set("accept", "json");

        const deviceToken = signUpPhoneResponse.body.results.token;

        await request(app)
            .post("/v1/users/email/verify")
            .send({ email: user.email, verificationCode: "112233", deviceToken })
            .set("accept", "json");

        const signUpResponse = await request(app)
            .post("/v1/users")
            .send({ ...user, token })
            .set("accept", "json");

        const bearer =
            signUpResponse.body.results.user._id +
            "," +
            signUpResponse.body.results.user.token;

        return {
            token: bearer,
            userId: signUpResponse.body.results.user._id,
            referralToken: signUpResponse.body.results.user.referralToken
        };
    };

    it("Sign up Phone Number - Success", async () => {
        const user = userMock.userA;
        const response = await request(app)
            .post("/v1/users/phone")
            .send({ phoneNumber: user.phoneNumber })
            .set("accept", "json");

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.statusCode).toBe(code.SIGNUP.VALID_PHONE_NUMBER);
        expect(response.body.results.token).toBeDefined();
    });

    it("Sign up Phone Number - Failure - Phone number already exist", async () => {
        // Creating a user with same phone number
        await UserModel.create(userMock.userASamePhoneNumber);

        const user = userMock.userA;
        const response = await request(app)
            .post("/v1/users/phone")
            .send({ phoneNumber: user.phoneNumber })
            .set("accept", "json");

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(false);
        expect(response.body.statusCode).toBe(code.SIGNUP.USER_EXISTS);
    });

    it("OTP verification - Sign up - Success", async () => {
        const user = userMock.userA;
        const signUpPhoneVerifyResponse = await request(app)
            .post("/v1/users/phone")
            .send({ phoneNumber: user.phoneNumber })
            .set("accept", "json");

        expect(signUpPhoneVerifyResponse.statusCode).toBe(200);
        expect(signUpPhoneVerifyResponse.body.success).toBe(true); // Phone Number verification success

        const token = signUpPhoneVerifyResponse.body.results.token;

        const otpResponse = await request(app)
            .post("/v1/users/phone/verify")
            .send({
                phoneNumber: user.phoneNumber,
                verificationCode: "1111",
                token: token
            })
            .set("accept", "json");

        expect(otpResponse.statusCode).toBe(200);
        expect(otpResponse.body.success).toBe(true);
        expect(otpResponse.body.statusCode).toBe(code.VERIFY_OTP.SUCCESS);
    });

    it("OTP verification - Sign up - Failure - Wrong OTP", async () => {
        const user = userMock.userA;
        const signUpPhoneVerifyResponse = await request(app)
            .post("/v1/users/phone")
            .send({ phoneNumber: user.phoneNumber })
            .set("accept", "json");

        const token = signUpPhoneVerifyResponse.body.results.token;

        expect(signUpPhoneVerifyResponse.statusCode).toBe(200);
        expect(signUpPhoneVerifyResponse.body.success).toBe(true); // Phone Number verification success

        const otpResponse = await request(app)
            .post("/v1/users/phone/verify")
            .send({
                phoneNumber: user.phoneNumber,
                verificationCode: "0000",
                token
            })
            .set("accept", "json");

        expect(otpResponse.statusCode).toBe(200);
        expect(otpResponse.body.success).toBe(false);
        expect(otpResponse.body.statusCode).toBe(code.VERIFY_OTP.WRONG_OTP); //OTP failure
    });

    it("OTP verification - Sign up - Failure - Limit Exceeded", async () => {
        const user = userMock.userA;
        const signUpPhoneVerifyResponse = await request(app)
            .post("/v1/users/phone")
            .send({ phoneNumber: user.phoneNumber })
            .set("accept", "json");

        expect(signUpPhoneVerifyResponse.statusCode).toBe(200);
        expect(signUpPhoneVerifyResponse.body.success).toBe(true); // Phone Number verification success

        const token = signUpPhoneVerifyResponse.body.results.token;

        let otpResponse = await request(app)
            .post("/v1/users/phone/verify")
            .send({
                phoneNumber: user.phoneNumber,
                verificationCode: "0000",
                token
            })
            .set("accept", "json");

        expect(otpResponse.statusCode).toBe(200);
        expect(otpResponse.body.success).toBe(false);
        expect(otpResponse.body.statusCode).toBe(code.VERIFY_OTP.WRONG_OTP); //OTP failure 1

        otpResponse = await request(app)
            .post("/v1/users/phone/verify")
            .send({
                phoneNumber: user.phoneNumber,
                verificationCode: "0000",
                token
            })
            .set("accept", "json");

        expect(otpResponse.statusCode).toBe(200);
        expect(otpResponse.body.success).toBe(false);
        expect(otpResponse.body.statusCode).toBe(code.VERIFY_OTP.WRONG_OTP); //OTP failure 2

        otpResponse = await request(app)
            .post("/v1/users/phone/verify")
            .send({
                phoneNumber: user.phoneNumber,
                verificationCode: "0000",
                token
            })
            .set("accept", "json");

        expect(otpResponse.statusCode).toBe(200);
        expect(otpResponse.body.success).toBe(false);
        expect(otpResponse.body.statusCode).toBe(code.VERIFY_OTP.LIMIT_EXCEEDED);
    });

    it("Sign up - Success", async () => {
        const user = userMock.userA;
        const signUpPhoneVerifyResponse = await request(app)
            .post("/v1/users/phone")
            .send({ phoneNumber: user.phoneNumber })
            .set("accept", "json");

        expect(signUpPhoneVerifyResponse.statusCode).toBe(200);
        expect(signUpPhoneVerifyResponse.body.success).toBe(true); // Phone Number verification success

        const token = signUpPhoneVerifyResponse.body.results.token;

        const otpResponse = await request(app)
            .post("/v1/users/phone/verify")
            .send({
                phoneNumber: user.phoneNumber,
                verificationCode: "1111",
                token
            })
            .set("accept", "json");

        expect(otpResponse.statusCode).toBe(200);
        expect(otpResponse.body.success).toBe(true); // OTP Verification Success

        const signUpResponse = await request(app)
            .post("/v1/users")
            .send({ ...user, token })
            .set("accept", "json");

        expect(signUpResponse.statusCode).toBe(200);
        expect(signUpResponse.body.success).toBe(true);
        expect(signUpResponse.body.statusCode).toBe(code.SIGNUP.SUCCESS);
        expect(signUpResponse.body.results.user.token).toBeDefined();
        expect(signUpResponse.body.results.user.phoneNumberVerified).toBe(true);
    });

    it("Sign up - Failure - OTP not verified", async () => {
        const user = userMock.userA;
        const signUpPhoneVerifyResponse = await request(app)
            .post("/v1/users/phone")
            .send({ phoneNumber: user.phoneNumber })
            .set("accept", "json");

        expect(signUpPhoneVerifyResponse.statusCode).toBe(200);
        expect(signUpPhoneVerifyResponse.body.success).toBe(true); // Phone Number verification success

        const token = signUpPhoneVerifyResponse.body.results.token;

        const otpResponse = await request(app)
            .post("/v1/users/phone/verify")
            .send({
                phoneNumber: user.phoneNumber,
                verificationCode: "0000",
                token
            })
            .set("accept", "json");

        expect(otpResponse.statusCode).toBe(200);
        expect(otpResponse.body.success).toBe(false); // OTP Verification is failed

        const signUpResponse = await request(app)
            .post("/v1/users")
            .send({ ...user, token })
            .set("accept", "json");

        expect(signUpResponse.statusCode).toBe(200);
        expect(signUpResponse.body.success).toBe(false);
        expect(signUpResponse.body.statusCode).toBe(code.SIGNUP.NOT_VERIFIED);
    });

    it("Sign up - Failure - Email already exist", async () => {
        // Creating a user with same phone number
        await UserModel.create(userMock.userASameEmail);

        const user = userMock.userA;
        const signUpPhoneVerifyResponse = await request(app)
            .post("/v1/users/phone")
            .send({ phoneNumber: user.phoneNumber })
            .set("accept", "json");

        expect(signUpPhoneVerifyResponse.statusCode).toBe(200);
        expect(signUpPhoneVerifyResponse.body.success).toBe(true); // Phone Number verification success

        const token = signUpPhoneVerifyResponse.body.results.token;

        const otpResponse = await request(app)
            .post("/v1/users/phone/verify")
            .send({
                phoneNumber: user.phoneNumber,
                verificationCode: "1111",
                token
            })
            .set("accept", "json");

        expect(otpResponse.statusCode).toBe(200);
        expect(otpResponse.body.success).toBe(true); // OTP Verification Success

        const signUpResponse = await request(app)
            .post("/v1/users")
            .send({ ...user, token })
            .set("accept", "json");

        expect(signUpResponse.statusCode).toBe(200);
        expect(signUpResponse.body.success).toBe(false);
        expect(signUpResponse.body.statusCode).toBe(code.SIGNUP.USER_EXISTS);
    });

    it("Sign up - Failure - Wrong Referral Token", async () => {
        const user = userMock.userA;
        const signUpPhoneVerifyResponse = await request(app)
            .post("/v1/users/phone")
            .send({ phoneNumber: user.phoneNumber })
            .set("accept", "json");

        expect(signUpPhoneVerifyResponse.statusCode).toBe(200);
        expect(signUpPhoneVerifyResponse.body.success).toBe(true); // Phone Number verification success

        const token = signUpPhoneVerifyResponse.body.results.token;

        const otpResponse = await request(app)
            .post("/v1/users/phone/verify")
            .send({
                phoneNumber: user.phoneNumber,
                verificationCode: "1111",
                token
            })
            .set("accept", "json");

        expect(otpResponse.statusCode).toBe(200);
        expect(otpResponse.body.success).toBe(true); // OTP Verification Success

        const signUpResponse = await request(app)
            .post("/v1/users")
            .send({ ...user, referredCodeKey: "123456", token })
            .set("accept", "json");

        expect(signUpResponse.statusCode).toBe(200);
        expect(signUpResponse.body.success).toBe(false);
        expect(signUpResponse.body.statusCode).toBe(
            code.SIGNUP.REFERRAL_DOESNT_MATCH
        );
    });

    it("Login - Success", async () => {
        const user = userMock.userA;
        await doSignUp(user);

        const loginResponse = await request(app)
            .post("/v1/users/session")
            .set("accept", "json")
            .send({ phoneNumber: user.phoneNumber, password: user.password });

        expect(loginResponse.statusCode).toBe(200);
        expect(loginResponse.body.success).toBe(true);
        expect(loginResponse.body.statusCode).toBe(code.SIGNIN.SUCCESS);
        expect(loginResponse.body.results.user.phoneNumberVerified).toBe(true);
    });

    it("Login - Failure - Incorrect Phone number Password combination", async () => {
        const user = userMock.userA;
        await doSignUp(user);

        const loginResponse = await request(app)
            .post("/v1/users/session")
            .set("accept", "json")
            .send({ phoneNumber: user.phoneNumber, password: "Wrong@Pass1" });

        expect(loginResponse.statusCode).toBe(200);
        expect(loginResponse.body.success).toBe(false);
        expect(loginResponse.body.statusCode).toBe(
            code.SIGNIN.PHONE_NUMBER_PASSWORD_MISMATCH
        );
    });

    it("OTP verification - Login - Success", async () => {
        // Creating the user
        await UserModel.create(userMock.userADetails);

        const user = userMock.userA;

        const loginResponse = await request(app)
            .post("/v1/users/session")
            .set("accept", "json")
            .send({ phoneNumber: user.phoneNumber, password: user.password });

        expect(loginResponse.statusCode).toBe(200);
        expect(loginResponse.body.success).toBe(true); // Phone number password matches

        const token = loginResponse.body.results.token;

        const otpResponse = await request(app)
            .post("/v1/users/session/verify")
            .send({
                phoneNumber: user.phoneNumber,
                verificationCode: "1111",
                token
            })
            .set("accept", "json");

        expect(otpResponse.statusCode).toBe(200);
        expect(otpResponse.body.success).toBe(true);
        expect(otpResponse.body.statusCode).toBe(code.VERIFY_OTP.SUCCESS);
        expect(otpResponse.body.results.user.token).toBeDefined();
    });

    it("OTP verification - Login - Failure - Wrong OTP", async () => {
        // Creating the user
        await UserModel.create(userMock.userADetails);

        const user = userMock.userA;

        const loginResponse = await request(app)
            .post("/v1/users/session")
            .set("accept", "json")
            .send({ phoneNumber: user.phoneNumber, password: user.password });

        expect(loginResponse.statusCode).toBe(200);
        expect(loginResponse.body.success).toBe(true); // Phone number password matches

        const token = loginResponse.body.results.token;

        const otpResponse = await request(app)
            .post("/v1/users/session/verify")
            .send({
                phoneNumber: user.phoneNumber,
                verificationCode: "0000",
                token
            })
            .set("accept", "json");

        expect(otpResponse.statusCode).toBe(200);
        expect(otpResponse.body.success).toBe(false);
        expect(otpResponse.body.statusCode).toBe(code.VERIFY_OTP.WRONG_OTP); //OTP failure
    });

    it("OTP verification - Login - Failure - Limit Exceeded", async () => {
        // Creating the user
        await UserModel.create(userMock.userADetails);

        const user = userMock.userA;

        const loginResponse = await request(app)
            .post("/v1/users/session")
            .set("accept", "json")
            .send({ phoneNumber: user.phoneNumber, password: user.password });

        expect(loginResponse.statusCode).toBe(200);
        expect(loginResponse.body.success).toBe(true); // Phone number password matches

        const token = loginResponse.body.results.token;

        let otpResponse = await request(app)
            .post("/v1/users/session/verify")
            .send({
                phoneNumber: user.phoneNumber,
                verificationCode: "0000",
                token
            })
            .set("accept", "json");

        expect(otpResponse.statusCode).toBe(200);
        expect(otpResponse.body.success).toBe(false);
        expect(otpResponse.body.statusCode).toBe(code.VERIFY_OTP.WRONG_OTP); //OTP failure 1

        otpResponse = await request(app)
            .post("/v1/users/session/verify")
            .send({
                phoneNumber: user.phoneNumber,
                verificationCode: "0000",
                token
            })
            .set("accept", "json");

        expect(otpResponse.statusCode).toBe(200);
        expect(otpResponse.body.success).toBe(false);
        expect(otpResponse.body.statusCode).toBe(code.VERIFY_OTP.WRONG_OTP); //OTP failure 2

        otpResponse = await request(app)
            .post("/v1/users/session/verify")
            .send({
                phoneNumber: user.phoneNumber,
                verificationCode: "0000",
                token
            })
            .set("accept", "json");

        expect(otpResponse.statusCode).toBe(200);
        expect(otpResponse.body.success).toBe(false);
        expect(otpResponse.body.statusCode).toBe(code.VERIFY_OTP.LIMIT_EXCEEDED);
    });

    it("Logout - Success", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const logoutResponse = await request(app)
            .delete("/v1/users/session/" + userDetails.userId)
            .set("accept", "json")
            .set("Authorization", "Bearer " + userDetails.token)
            .send({ fcmToken: "random-fcm-token" });

        expect(logoutResponse.statusCode).toBe(200);
        expect(logoutResponse.body.success).toBe(true);
        expect(logoutResponse.body.statusCode).toBe(code.LOG_OUT.SUCCESS);
    });

    it("Logout - Failure - Unauthorized", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const logoutResponse = await request(app)
            .delete("/v1/users/session/" + userDetails.userId)
            .set("accept", "json")
            .send({ fcmToken: "random-fcm-token" });

        expect(logoutResponse.statusCode).toBe(403);
        expect(logoutResponse.body.success).toBe(false);
        expect(logoutResponse.body.statusCode).toBe(
            code.APPLICATION_ERROR.MISSING_AUTH
        );
    });

    it("OTP resend - Success", async () => {
        const user = userMock.userA;
        const response = await request(app)
            .post("/v1/users/phone")
            .send({ phoneNumber: user.phoneNumber })
            .set("accept", "json");

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true); // Phone number is valid

        const token = response.body.results.token;

        const resendOtpResponse = await request(app)
            .put("/v1/users/session/resend")
            .send({
                phoneNumber: user.phoneNumber,
                token
            })
            .set("accept", "json");

        expect(resendOtpResponse.statusCode).toBe(200);
        expect(resendOtpResponse.body.success).toBe(true);
        expect(resendOtpResponse.body.statusCode).toBe(code.RESEND_OTP.SUCCESS);
    });

    it("OTP resend - Failure - Session Expired / No such session", async () => {
        const user = userMock.userA;
        const resendOtpResponse = await request(app)
            .put("/v1/users/session/resend")
            .send({
                phoneNumber: user.phoneNumber
            })
            .set("accept", "json");

        expect(resendOtpResponse.statusCode).toBe(200);
        expect(resendOtpResponse.body.success).toBe(false);
        expect(resendOtpResponse.body.statusCode).toBe(code.RESEND_OTP.TIME_OUT);
    });

    it("OTP resend - Failure - Resend limit reached", async () => {
        const user = userMock.userA;
        const response = await request(app)
            .post("/v1/users/phone")
            .send({ phoneNumber: user.phoneNumber })
            .set("accept", "json");

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true); // Phone number is valid

        const token = response.body.results.token;

        let resendOtpResponse = await request(app)
            .put("/v1/users/session/resend")
            .send({
                phoneNumber: user.phoneNumber,
                token
            })
            .set("accept", "json");

        expect(resendOtpResponse.statusCode).toBe(200);
        expect(resendOtpResponse.body.success).toBe(true);
        expect(resendOtpResponse.body.statusCode).toBe(code.RESEND_OTP.SUCCESS);

        resendOtpResponse = await request(app)
            .put("/v1/users/session/resend")
            .send({
                phoneNumber: user.phoneNumber,
                token
            })
            .set("accept", "json");

        expect(resendOtpResponse.statusCode).toBe(200);
        expect(resendOtpResponse.body.success).toBe(true);
        expect(resendOtpResponse.body.statusCode).toBe(code.RESEND_OTP.SUCCESS);

        resendOtpResponse = await request(app)
            .put("/v1/users/session/resend")
            .send({
                phoneNumber: user.phoneNumber,
                token
            })
            .set("accept", "json");

        expect(resendOtpResponse.statusCode).toBe(200);
        expect(resendOtpResponse.body.success).toBe(true);
        expect(resendOtpResponse.body.statusCode).toBe(code.RESEND_OTP.SUCCESS);

        resendOtpResponse = await request(app)
            .put("/v1/users/session/resend")
            .send({
                phoneNumber: user.phoneNumber,
                token
            })
            .set("accept", "json");

        expect(resendOtpResponse.statusCode).toBe(200);
        expect(resendOtpResponse.body.success).toBe(false);
        expect(resendOtpResponse.body.statusCode).toBe(code.RESEND_OTP.MAX_RESEND);
    });

    it("Change Password - Success", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);
        const newPassword = "Password1.";

        const changePasswordResponse = await request(app)
            .put("/v1/users/" + userDetails.userId + "/password")
            .set("accept", "json")
            .set("Authorization", "Bearer " + userDetails.token)
            .send({
                phoneNumber: user.phoneNumber,
                oldPassword: user.password,
                password: newPassword
            });

        expect(changePasswordResponse.statusCode).toBe(200);
        expect(changePasswordResponse.body.success).toBe(true);
        expect(changePasswordResponse.body.statusCode).toBe(
            code.CHANGE_PASSWORD.SUCCESS
        );

        const loginResponse = await request(app)
            .post("/v1/users/session")
            .set("accept", "json")
            .send({
                phoneNumber: user.phoneNumber,
                password: newPassword
            });

        expect(loginResponse.statusCode).toBe(200);
        expect(loginResponse.body.success).toBe(true);
        expect(loginResponse.body.statusCode).toBe(code.SIGNIN.SUCCESS);
        expect(loginResponse.body.results.user.phoneNumberVerified).toBe(true);
    });

    it("Change Password - Failure - Wrong Current Password", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);
        const wrongPassword = "WrongPassword1.";
        const newPassword = "Password1.";

        const changePasswordResponse = await request(app)
            .put("/v1/users/" + userDetails.userId + "/password")
            .set("accept", "json")
            .set("Authorization", "Bearer " + userDetails.token)
            .send({
                phoneNumber: user.phoneNumber,
                oldPassword: wrongPassword,
                password: newPassword
            });

        expect(changePasswordResponse.statusCode).toBe(200);
        expect(changePasswordResponse.body.success).toBe(false);
        expect(changePasswordResponse.body.statusCode).toBe(
            code.CHANGE_PASSWORD.WRONG_CURRENT_PASSWORD
        );
    });

    it("Change Password - Failure - Same Old and Current Password", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const changePasswordResponse = await request(app)
            .put("/v1/users/" + userDetails.userId + "/password")
            .set("accept", "json")
            .set("Authorization", "Bearer " + userDetails.token)
            .send({
                phoneNumber: user.phoneNumber,
                oldPassword: user.password,
                password: user.password
            });

        expect(changePasswordResponse.statusCode).toBe(200);
        expect(changePasswordResponse.body.success).toBe(false);
        expect(changePasswordResponse.body.statusCode).toBe(
            code.CHANGE_PASSWORD.SAME_PASSWORD
        );
    });

    it("Change Password - Failure - Unauthorized", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);
        const newPassword = "Password1.";

        const changePasswordResponse = await request(app)
            .put("/v1/users/" + userDetails.userId + "/password")
            .set("accept", "json")
            .send({
                phoneNumber: user.phoneNumber,
                oldPassword: user.password,
                password: newPassword
            });

        expect(changePasswordResponse.statusCode).toBe(403);
        expect(changePasswordResponse.body.success).toBe(false);
        expect(changePasswordResponse.body.statusCode).toBe(
            code.APPLICATION_ERROR.MISSING_AUTH
        );
    });

    it("Forget Password - Success ", async () => {
        // Creating the user
        await UserModel.create(userMock.userADetails);

        const user = userMock.userA;

        const forgetPasswordResponse = await request(app)
            .put("/v1/users/password/forget")
            .set("accept", "json")
            .send({
                phoneNumber: user.phoneNumber,
                email: user.email
            });

        expect(forgetPasswordResponse.statusCode).toBe(200);
        expect(forgetPasswordResponse.body.success).toBe(true);
        expect(forgetPasswordResponse.body.statusCode).toBe(
            code.FORGET_PASSWORD.SUCCESS
        );
    });

    it("Forget Password - Failure -  Phone number Email mismatch", async () => {
        // Creating the user
        await UserModel.create(userMock.userADetails);

        const user = userMock.userA;

        const forgetPasswordResponse = await request(app)
            .put("/v1/users/password/forget")
            .set("accept", "json")
            .send({
                phoneNumber: "6666666666",
                email: user.email
            });

        expect(forgetPasswordResponse.statusCode).toBe(200);
        expect(forgetPasswordResponse.body.success).toBe(false);
        expect(forgetPasswordResponse.body.statusCode).toBe(
            code.FORGET_PASSWORD.EMAIL_MISMATCH
        );
    });

    it("Forget Password Verify - Success", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const forgetPasswordResponse = await request(app)
            .put("/v1/users/password/forget")
            .set("accept", "json")
            .send({
                phoneNumber: user.phoneNumber,
                email: user.email
            });

        expect(forgetPasswordResponse.statusCode).toBe(200);
        expect(forgetPasswordResponse.body.success).toBe(true);

        const forgetPasswordVerifyResponse = await request(app)
            .put("/v1/users/" + userDetails.userId + "/password/forget/verify")
            .set("accept", "json")
            .send({
                smsToken: "1111",
                emailToken: "A1B2C3"
            });

        expect(forgetPasswordVerifyResponse.statusCode).toBe(200);
        expect(forgetPasswordVerifyResponse.body.success).toBe(true);
        expect(forgetPasswordVerifyResponse.body.statusCode).toBe(
            code.FORGET_PASSWORD_VERIFY.SUCCESS
        );
    });

    it("Forget Password Verify - Failure - Incorrect Token ", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const forgetPasswordResponse = await request(app)
            .put("/v1/users/password/forget")
            .set("accept", "json")
            .send({
                phoneNumber: user.phoneNumber,
                email: user.email
            });

        expect(forgetPasswordResponse.statusCode).toBe(200);
        expect(forgetPasswordResponse.body.success).toBe(true);

        const forgetPasswordVerifyResponse = await request(app)
            .put("/v1/users/" + userDetails.userId + "/password/forget/verify")
            .set("accept", "json")
            .send({
                smsToken: "0000",
                emailToken: "A1B2C3"
            });

        expect(forgetPasswordVerifyResponse.statusCode).toBe(200);
        expect(forgetPasswordVerifyResponse.body.success).toBe(false);
        expect(forgetPasswordVerifyResponse.body.statusCode).toBe(
            code.FORGET_PASSWORD_VERIFY.INCORRECT_TOKEN
        );
    });

    it("Forget Password Verify - Failure - Invalid Token ", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);
        const userId = "5bb46e0f267e9f07c1cb67f5";

        const forgetPasswordVerifyResponse = await request(app)
            .put("/v1/users/" + userId + "/password/forget/verify")
            .set("accept", "json")
            .send({
                smsToken: "1111",
                emailToken: "A1B2C3"
            });

        expect(forgetPasswordVerifyResponse.statusCode).toBe(200);
        expect(forgetPasswordVerifyResponse.body.success).toBe(false);
        expect(forgetPasswordVerifyResponse.body.statusCode).toBe(
            code.FORGET_PASSWORD_VERIFY.INVALID_TOKEN
        );
    });

    it("Reset Password - Success", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);
        const newPassword = "Password1.";

        const forgetPasswordResponse = await request(app)
            .put("/v1/users/password/forget")
            .set("accept", "json")
            .send({
                phoneNumber: user.phoneNumber,
                email: user.email
            });

        expect(forgetPasswordResponse.statusCode).toBe(200);
        expect(forgetPasswordResponse.body.success).toBe(true);

        const forgetPasswordVerifyResponse = await request(app)
            .put("/v1/users/" + userDetails.userId + "/password/forget/verify")
            .set("accept", "json")
            .send({
                smsToken: "1111",
                emailToken: "A1B2C3"
            });

        expect(forgetPasswordVerifyResponse.statusCode).toBe(200);
        expect(forgetPasswordVerifyResponse.body.success).toBe(true);

        const resetPasswordResponse = await request(app)
            .put("/v1/users/" + userDetails.userId + "/password/reset")
            .set("accept", "json")
            .send({
                password: newPassword
            });

        expect(resetPasswordResponse.statusCode).toBe(200);
        expect(resetPasswordResponse.body.success).toBe(true);
        expect(resetPasswordResponse.body.statusCode).toBe(
            code.RESET_PASSWORD.SUCCESS
        );
    });

    it("Reset Password - Failure - Invalid User", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);
        const newPassword = "Password1.";
        const userId = "5bb46e0f267e9f07c1cb67f5";

        const forgetPasswordResponse = await request(app)
            .put("/v1/users/password/forget")
            .set("accept", "json")
            .send({
                phoneNumber: user.phoneNumber,
                email: user.email
            });

        expect(forgetPasswordResponse.statusCode).toBe(200);
        expect(forgetPasswordResponse.body.success).toBe(true);

        const forgetPasswordVerifyResponse = await request(app)
            .put("/v1/users/" + userDetails.userId + "/password/forget/verify")
            .set("accept", "json")
            .send({
                smsToken: "1111",
                emailToken: "A1B2C3"
            });

        expect(forgetPasswordVerifyResponse.statusCode).toBe(200);
        expect(forgetPasswordVerifyResponse.body.success).toBe(true);

        const resetPasswordResponse = await request(app)
            .put("/v1/users/" + userId + "/password/reset")
            .set("accept", "json")
            .send({
                password: newPassword
            });

        expect(resetPasswordResponse.statusCode).toBe(200);
        expect(resetPasswordResponse.body.success).toBe(false);
        expect(resetPasswordResponse.body.statusCode).toBe(
            code.RESET_PASSWORD.INVALID_TOKEN
        );
    });

    it("Reset Password - Failure - Verification not done", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);
        const newPassword = "Password1.";

        const forgetPasswordResponse = await request(app)
            .put("/v1/users/password/forget")
            .set("accept", "json")
            .send({
                phoneNumber: user.phoneNumber,
                email: user.email
            });

        expect(forgetPasswordResponse.statusCode).toBe(200);
        expect(forgetPasswordResponse.body.success).toBe(true);

        const resetPasswordResponse = await request(app)
            .put("/v1/users/" + userDetails.userId + "/password/reset")
            .set("accept", "json")
            .send({
                password: newPassword
            });

        expect(resetPasswordResponse.statusCode).toBe(200);
        expect(resetPasswordResponse.body.success).toBe(false);
        expect(resetPasswordResponse.body.statusCode).toBe(
            code.RESET_PASSWORD.VERIFICATION_NOT_DONE
        );
    });

    it("Get user details - Success", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const response = await request(app)
            .get("/v1/users/" + userDetails.userId)
            .set("accept", "json")
            .set("Authorization", "Bearer " + userDetails.token);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.statusCode).toBe(code.GET_USER.SUCCESS);
    });

    it("Get user details - Failure - Unauthorized", async () => {
        const userId = "5bb46e0f267e9f07c1cb67f5";

        const response = await request(app)
            .get("/v1/users/" + userId)
            .set("accept", "json");

        expect(response.statusCode).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.statusCode).toBe(code.APPLICATION_ERROR.MISSING_AUTH);
    });

    it("Update user details - Success", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);
        const newFirstName = "Joe";
        const newLastName = "Doe";

        const response = await request(app)
            .put("/v1/users/" + userDetails.userId)
            .set("accept", "json")
            .set("Authorization", "Bearer " + userDetails.token)
            .send({ firstName: newFirstName, lastName: newLastName });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.statusCode).toBe(code.UPDATE_PROFILE.SUCCESS);
        expect(response.body.results.user.firstName).toBe(newFirstName);
        expect(response.body.results.user.lastName).toBe(newLastName);
    });

    it("Update user details - Failure - Unauthorized", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);
        const newFirstName = "Joe";
        const newLastName = "Doe";

        const response = await request(app)
            .put("/v1/users/" + userDetails.userId)
            .set("accept", "json")
            .send({ firstName: newFirstName, lastName: newLastName });

        expect(response.statusCode).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.statusCode).toBe(code.APPLICATION_ERROR.MISSING_AUTH);
    });

    it("Referral Code - Success", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const response = await request(app)
            .put("/v1/users/referral/" + userDetails.referralToken)
            .set("accept", "json");

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.statusCode).toBe(code.REFERRAL_CODE.SUCCESS);
    });

    it("Referral Code - Failure - Invalid Referral Code", async () => {
        const referralCode = "123456";
        const response = await request(app)
            .put("/v1/users/referral/" + referralCode)
            .set("accept", "json");

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(false);
        expect(response.body.statusCode).toBe(
            code.REFERRAL_CODE.INVALID_REFERRAL_CODE
        );
    });

    it("Add FCM Token - Success", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const response = await request(app)
            .put("/v1/users/" + userDetails.userId + "/tokens")
            .set("accept", "json")
            .set("Authorization", "Bearer " + userDetails.token)
            .send({
                fcmToken: "some-valid-fcm-token"
            });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.statusCode).toBe(code.ADD_FCM_TOKEN.SUCCESS);
    });

    it("Add FCM Token - Failure - Unauthorized", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const response = await request(app)
            .put("/v1/users/" + userDetails.userId + "/tokens")
            .set("accept", "json")
            .send({
                fcmToken: "some-valid-fcm-token"
            });

        expect(response.statusCode).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.statusCode).toBe(code.APPLICATION_ERROR.MISSING_AUTH);
    });

    it("Request email verification - Success", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const response = await request(app)
            .get("/v1/users/" + userDetails.userId + "/email/verify")
            .set("accept", "json")
            .set("Authorization", "Bearer " + userDetails.token);

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.statusCode).toBe(code.SEND_EMAIL_VERIFICATION.SUCCESS);
    });

    it("Request email verification - Failure - Unauthorized", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const response = await request(app)
            .get("/v1/users/" + userDetails.userId + "/email/verify")
            .set("accept", "json");

        expect(response.statusCode).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.statusCode).toBe(code.APPLICATION_ERROR.MISSING_AUTH);
    });

    it("Verify email - Success", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const verificationRequestresponse = await request(app)
            .get("/v1/users/" + userDetails.userId + "/email/verify")
            .set("accept", "json")
            .set("Authorization", "Bearer " + userDetails.token);

        expect(verificationRequestresponse.statusCode).toBe(200);
        expect(verificationRequestresponse.body.success).toBe(true);

        const response = await request(app)
            .post("/v1/users/" + userDetails.userId + "/email/verify")
            .set("accept", "json")
            .set("Authorization", "Bearer " + userDetails.token)
            .send({ token: "A1B2C3" });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(true);
    });

    it("Request email verification - Failure - Invalid Token", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const verificationRequestresponse = await request(app)
            .get("/v1/users/" + userDetails.userId + "/email/verify")
            .set("accept", "json")
            .set("Authorization", "Bearer " + userDetails.token);

        expect(verificationRequestresponse.statusCode).toBe(200);
        expect(verificationRequestresponse.body.success).toBe(true);

        const response = await request(app)
            .post("/v1/users/" + userDetails.userId + "/email/verify")
            .set("accept", "json")
            .set("Authorization", "Bearer " + userDetails.token)
            .send({ token: "AAAAAA" });

        expect(response.statusCode).toBe(200);
        expect(response.body.success).toBe(false);
    });

    it("Request email verification - Failure - Unauthorized", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const verificationRequestresponse = await request(app)
            .get("/v1/users/" + userDetails.userId + "/email/verify")
            .set("accept", "json")
            .set("Authorization", "Bearer " + userDetails.token);

        expect(verificationRequestresponse.statusCode).toBe(200);
        expect(verificationRequestresponse.body.success).toBe(true);

        const response = await request(app)
            .post("/v1/users/" + userDetails.userId + "/email/verify")
            .set("accept", "json")
            .send({ token: "A1B2C3" });

        expect(response.statusCode).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.statusCode).toBe(code.APPLICATION_ERROR.MISSING_AUTH);
    });

    it("Subscribe Investment - Success", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const subscribeInvestmentResponse = await request(app)
            .put("/v1/users/" + userDetails.userId + "/investments/subscribe")
            .set("accept", "json")
            .set("Authorization", "Bearer " + userDetails.token);

        expect(subscribeInvestmentResponse.statusCode).toBe(200);
        expect(subscribeInvestmentResponse.body.success).toBe(true);
        expect(subscribeInvestmentResponse.body.statusCode).toBe(
            code.SUBSCRIBE_INVESTMENT.SUCCESS
        );
    });

    it("Subscribe Investment - Failure - Unauthorized", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const subscribeInvestmentResponse = await request(app)
            .put("/v1/users/" + userDetails.userId + "/investments/subscribe")
            .set("accept", "json");

        expect(subscribeInvestmentResponse.statusCode).toBe(403);
        expect(subscribeInvestmentResponse.body.success).toBe(false);
        expect(subscribeInvestmentResponse.body.statusCode).toBe(
            code.APPLICATION_ERROR.MISSING_AUTH
        );
    });

    it("Get unanswered questions - Success", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const unansweredQuestionsResponse = await request(app)
            .get("/v1/users/" + userDetails.userId + "/questions")
            .set("accept", "json")
            .set("Authorization", "Bearer " + userDetails.token);

        expect(unansweredQuestionsResponse.statusCode).toBe(200);
        expect(unansweredQuestionsResponse.body.success).toBe(true);
        expect(unansweredQuestionsResponse.body.statusCode).toBe(
            code.UNANSWERED_QUESTIONS.SUCCESS
        );
    });

    it("Get unanswered questions - Failure - Unauthorized", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const unansweredQuestionsResponse = await request(app)
            .get("/v1/users/" + userDetails.userId + "/questions")
            .set("accept", "json");

        expect(unansweredQuestionsResponse.statusCode).toBe(403);
        expect(unansweredQuestionsResponse.body.success).toBe(false);
        expect(unansweredQuestionsResponse.body.statusCode).toBe(
            code.APPLICATION_ERROR.MISSING_AUTH
        );
    });

    it("Log learning progress - Success", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const modules = await LearningModuleModel.create(moduleMock.validModule);

        const moduleId = modules._id;
        const lessonId = modules.lessons[0]._id;

        const logProgressResponse = await request(app)
            .put(
                "/v1/users/" +
                userDetails.userId +
                "/log/modules/" +
                moduleId +
                "/lessons/" +
                lessonId
            )
            .set("accept", "json")
            .set("Authorization", "Bearer " + userDetails.token)
            .send({ quizDetails: [] });

        expect(logProgressResponse.statusCode).toBe(200);
        expect(logProgressResponse.body.success).toBe(true);
        expect(logProgressResponse.body.statusCode).toBe(code.LOG_PROGRESS.SUCCESS);
        expect(logProgressResponse.body.results.userId).toBe(userDetails.userId);
        expect(logProgressResponse.body.results.moduleId).toBe(
            moduleId.toHexString()
        );
        expect(logProgressResponse.body.results.lessonId).toBe(
            lessonId.toHexString()
        );
    });

    it("Log learning progress - Failure - Invalid ID", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const moduleId = "5c0be56c9ebce085c25b46df";
        const lessonId = "5c0be56c9ebce085c25b46e2";

        const logProgressResponse = await request(app)
            .put(
                "/v1/users/" +
                userDetails.userId +
                "/log/modules/" +
                moduleId +
                "/lessons/" +
                lessonId
            )
            .set("accept", "json")
            .set("Authorization", "Bearer " + userDetails.token)
            .send({ quizDetails: [] });

        expect(logProgressResponse.statusCode).toBe(200);
        expect(logProgressResponse.body.success).toBe(false);
        expect(logProgressResponse.body.statusCode).toBe(
            code.LOG_PROGRESS.INVALID_ID
        );
    });

    it("Log learning progress - Failure - Unauthorized", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const moduleId = "5c0be56c9ebce085c25b46df";
        const lessonId = "5c0be56c9ebce085c25b46e2";

        const logProgressResponse = await request(app)
            .put(
                "/v1/users/" +
                userDetails.userId +
                "/log/modules/" +
                moduleId +
                "/lessons/" +
                lessonId
            )
            .set("accept", "json")
            .send({ quizDetails: [] });

        expect(logProgressResponse.statusCode).toBe(403);
        expect(logProgressResponse.body.success).toBe(false);
        expect(logProgressResponse.body.statusCode).toBe(
            code.APPLICATION_ERROR.MISSING_AUTH
        );
    });

    it("Get all modules - Success", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        await LearningModuleModel.create(moduleMock.validModule);

        const modulesResponse = await request(app)
            .get("/v1/users/" + userDetails.userId + "/modules")
            .set("accept", "json")
            .set("Authorization", "Bearer " + userDetails.token);

        expect(modulesResponse.statusCode).toBe(200);
        expect(modulesResponse.body.success).toBe(true);
        expect(modulesResponse.body.statusCode).toBe(code.GET_ALL_MODULES.SUCCESS);
        expect(modulesResponse.body.results.modules[0].active).toBe(true);
        expect(
            modulesResponse.body.results.modules[0].moduleProgress
        ).toBeDefined();
    });

    it("Get all modules - Failure - Unauthorized", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const modulesResponse = await request(app)
            .get("/v1/users/" + userDetails.userId + "/modules")
            .set("accept", "json");

        expect(modulesResponse.statusCode).toBe(403);
        expect(modulesResponse.body.success).toBe(false);
        expect(modulesResponse.body.statusCode).toBe(
            code.APPLICATION_ERROR.MISSING_AUTH
        );
    });

    it("Get all notification - Success", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const notificationResponse = await request(app)
            .get("/v1/users/" + userDetails.userId + "/notifications")
            .set("accept", "json")
            .set("Authorization", "Bearer " + userDetails.token);

        expect(notificationResponse.statusCode).toBe(200);
        expect(notificationResponse.body.success).toBe(true);
        expect(notificationResponse.body.statusCode).toBe(
            code.GET_NOTIFICATION.SUCCESS
        );
    });

    it("Get all notification - Failure - Unauthorized", async () => {
        const user = userMock.userA;
        const userDetails = await doSignUp(user);

        const notificationResponse = await request(app)
            .get("/v1/users/" + userDetails.userId + "/notifications")
            .set("accept", "json");

        expect(notificationResponse.statusCode).toBe(403);
        expect(notificationResponse.body.success).toBe(false);
        expect(notificationResponse.body.statusCode).toBe(
            code.APPLICATION_ERROR.MISSING_AUTH
        );
    });

    // For v1.1 APIs
    const enterPhoneNumber = async phoneNumber => {
        const userDetails = await request(app)
            .post("/v1.1/users/phone")
            .set("accept", "json")
            .send({ phoneNumber: phoneNumber });

        return userDetails.body;
    };

    const verifyPhoneNumber = async (user, verificationCode = "1111", token) => {
        const otpResponse = await request(app)
            .post("/v1.1/users/phone/verify")
            .send({
                phoneNumber: user.phoneNumber,
                verificationCode: verificationCode,
                token: token
            })
            .set("accept", "json");

        return {
            otpResponse: otpResponse.body,
            token: token
        };
    };

    const enterUserDetailsForSignUp = async (user, tokenArg = null) => {
        const verification = await enterPhoneNumber(user.phoneNumber);
        const token = verification.results.token;

        await verifyPhoneNumber(user, "1111", token);

        const userDetails = await request(app)
            .post("/v1.1/users")
            .send({ ...user, token })
            .set("accept", "json");

        return userDetails.body;
    };

    const login = async userDetails => {
        const verificationCode = "1111";
        const result = await request(app)
            .post("/v1.1/users/phone/verify")
            .send({ ...userDetails, verificationCode })
            .set("accept", "json");

        return result.body;
    };

    it("Sign up using Phone Number - v1.1 - Success", async () => {
        let user = userMock.userA;

        const userDetails = await request(app)
            .post("/v1.1/users/phone")
            .set("accept", "json")
            .send({ phoneNumber: user.phoneNumber });

        expect(userDetails.body.results).toHaveProperty("token");
        expect(userDetails.body.results.isLogin).toBeFalsy();

        const token = userDetails.body.results.token;

        const otpResponse = await request(app)
            .post("/v1.1/users/phone/verify")
            .send({
                phoneNumber: user.phoneNumber,
                verificationCode: "1111",
                token: token
            })
            .set("accept", "json");

        expect(otpResponse.body.success).not.toBeFalsy();

        const finalResponse = await request(app)
            .post("/v1.1/users")
            .send({ ...user, token })
            .set("accept", "json");

        expect(finalResponse.body.success).not.toBeFalsy();
        expect(finalResponse.body.responseCode).toBe(
            code.SUCCESS_CODES.GENERIC_SUCCESS
        );
        expect(finalResponse.body.message).toBe(message.SIGNUP.SUCCESS);
        expect(finalResponse.body.results.user.firstName).toBe(user.firstName);
        expect(finalResponse.body.results.user.lastName).toBe(user.lastName);
        expect(finalResponse.body.results.user.email).toBe(user.email);
        expect(finalResponse.body.results.user.phoneNumber).toBe(user.phoneNumber);
        expect(finalResponse.body.results.user).toHaveProperty("token");
        expect(finalResponse.body.results.user.token).toBeDefined();
    });

    it("Sign up using Phone Number - v1.1 - Failure - Invalid Phone Number", async () => {
        let user = userMock.userC;

        const userDetails = await request(app)
            .post("/v1.1/users/phone")
            .send({ phoneNumber: user.phoneNumber })
            .set("accept", "json");

        expect(userDetails.body.success).toBeFalsy();
        expect(userDetails.body.responseCode).toBe(
            code.INTERNAL_FAILURE_CODES.MISSING_PARAMS
        );
        expect(userDetails.body.message).toBe(
            message.APPLICATION_ERROR.MISSING_PARAMS
        );
    });

    it("Sign up using Phone Number - v1.1 - Failure - Invalid Verification Code", async () => {
        let user = userMock.userD;
        const verification = await enterPhoneNumber(user.phoneNumber);
        const token = verification.token;
        const result = await verifyPhoneNumber(user, "0000", token);

        expect(result.otpResponse.success).toBeFalsy();
        expect(result.otpResponse.responseCode).toBe(
            code.USER_FAILURE_CODES.WRONG_OTP
        );
        expect(result.otpResponse.message).toBe(message.VERIFY_OTP.WRONG_OTP);
        expect(result.otpResponse).toHaveProperty("messageObj");
        expect(result.otpResponse.messageObj.wrongOtpCount).not.toBe("0");
    });

    it("Sign up using Phone Number - v1.1 - Failure - Invalid token", async () => {
        let user = userMock.userD;

        const verification = await enterPhoneNumber(user.phoneNumber);
        const result = await verifyPhoneNumber(user, "1111", "000000000000");

        expect(result.otpResponse.success).toBeFalsy();
        expect(result.otpResponse.responseCode).toBe(
            code.USER_FAILURE_CODES.WRONG_OTP
        );
        expect(result.otpResponse.message).toBe(message.VERIFY_OTP.WRONG_OTP);
        expect(result.otpResponse).toHaveProperty("messageObj");
        expect(result.otpResponse.messageObj.otpExpired).not.toBeFalsy();
    });

    it("Sign up using Phone Number - v1.1 - Failure - Invalid Email", async () => {
        let user = userMock.userD;

        const verification = await enterPhoneNumber(user.phoneNumber);
        const token = verification.token;
        const result = await verifyPhoneNumber(user, "1111", token);

        expect(result.isLogin).toBeFalsy();

        const finalResponse = await enterUserDetailsForSignUp(user, token);

        expect(finalResponse.success).toBeFalsy();
        expect(finalResponse.responseCode).toBe(
            code.INTERNAL_FAILURE_CODES.MISSING_PARAMS
        );
        expect(finalResponse.message).toBe(
            message.APPLICATION_ERROR.MISSING_PARAMS
        );
    });

    it("Sign up using Phone Number - v1.1 - Failure - Invalid Referral Code", async () => {
        let user = userMock.userH;

        const verification = await enterPhoneNumber(user.phoneNumber);
        const token = verification.token;
        const result = await verifyPhoneNumber(user, "1111", token);

        expect(result.isLogin).toBeFalsy();
        const finalResponse = await enterUserDetailsForSignUp(user, token);

        expect(finalResponse.success).toBeFalsy();
        expect(finalResponse.responseCode).toBe(
            code.INTERNAL_FAILURE_CODES.MISSING_PARAMS
        );
        expect(finalResponse.message).toBe(
            message.APPLICATION_ERROR.MISSING_PARAMS
        );
    });

    it("Sing up using Phone Number - v1.1 - Failure - Same EMAIL", async () => {
        const user = userMock.userA;
        const userASameEmail = userMock.userASameEmail;

        await UserModel.create(userASameEmail);

        const resultObj = await enterUserDetailsForSignUp(user);

        expect(resultObj.success).toBeFalsy();
        expect(resultObj.responseCode).toBe(
            code.USER_FAILURE_CODES.USER_ALREADY_EXISTS
        );
        expect(resultObj.message).toBe(message.SIGNUP.USER_EXISTS);
        expect(resultObj).toHaveProperty("messageObj");
    });

    it("Log In using Phone Number - v1.1 - Success", async () => {
        const user = userMock.userA;

        await enterUserDetailsForSignUp(user);

        const userDetails = await enterPhoneNumber(user.phoneNumber);

        const isLogin = userDetails.results.isLogin;
        const token = userDetails.results.token;

        expect(isLogin).not.toBeFalsy();

        user.token = token;

        const otpResponse = await login(user);

        expect(otpResponse.success).not.toBeFalsy();
        expect(otpResponse.responseCode).toBe(code.SUCCESS_CODES.GENERIC_SUCCESS);
        expect(otpResponse.message).toBe(message.VERIFY_OTP.SUCCESS);
        expect(otpResponse.results).toHaveProperty("user");
        expect(otpResponse.results.user._id).toBeDefined();
        expect(otpResponse.results.user.email).toBe(user.email);
        expect(otpResponse.results.user.phoneNumber).toBe(user.phoneNumber);
    });
});
