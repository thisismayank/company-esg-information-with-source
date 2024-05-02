import mongoose from "mongoose";

import logger from "./logger";


const url = "mongodb+srv://mayankar:TUxd6hA8KnW9xxAU@cluster0.7mktfiw.mongodb.net/sem-carbon-dev";

export const connectMongoose = async () => {
    try {
        logger.info(`INFO: Mongoose-connectMongoose`);

        await mongoose.connect(
            url,
            {
                maxPoolSize: 10
            }
        );

        logger.debug(
            `DEBUG: Mongoose-connectMongoose: MongoDB connected successfully.`
        );

        return mongoose;
    } catch (error) {
        logger.error(`ERROR: Mongoose-connectMongoose - ${error}`);
    }
};

export const getMongooseObject = () => {
    try {
        return mongoose;
    } catch (error) {
        logger.error(`ERROR: Mongoose-getMongooseObject - ${error}`);
    }
};