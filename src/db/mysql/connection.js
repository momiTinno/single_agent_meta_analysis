import mysql from "mysql2/promise";
import { config } from "../../config/app.config.js";
export const pool = mysql.createPool({ host: config.MYSQL_HOST, port: config.MYSQL_PORT, user: config.MYSQL_USER, password: config.MYSQL_PASSWORD, database: config.MYSQL_DATABASE, connectionLimit: config.MYSQL_CONNECTION_LIMIT });
