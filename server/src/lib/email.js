import nodemailer from "nodemailer";

import logger from "./logger";

const emailConfig = {
    user: "sem.carbon.cmu@gmail.com",
    pass: "nodb jqtl yzxm izmn"
}
export const sendEmail = async (
    email,
    subject,
    messageToSend
) => {
    try {
        logger.info(`INFO: Email: ${email}`);
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: emailConfig
        });

        const mailOptions = {
            from: `SEM Carbon <${emailConfig.user}>`,
            to: email,
            subject
        };

        mailOptions.text = messageToSend;

        return await transporter.sendMail(mailOptions);
    } catch (error) {
        logger.error(`ERROR: Email: ${error}`);
        throw error;
    }
};
