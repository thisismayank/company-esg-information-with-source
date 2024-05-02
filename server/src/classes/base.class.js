import asyncRedis from "async-redis";

import { redisConfig } from "../config";

import { getMongooseObject } from "../lib/mongoose";

// Establishing redis connection
const redisClient = asyncRedis.createClient(redisConfig.port, redisConfig.host);

export default class BaseClass {
    constructor(name, connection, redis) {
        this.name = name;
        this.connection = getMongooseObject();
        if (redisClient) {
            this.redis = redisClient;
        }
    }

    async _getModel() {
        this.model = await this.connection.model(this.name, this.schema)
    }
}
