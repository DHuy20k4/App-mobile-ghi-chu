import mssql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbServer = process.env.DB_SERVER || 'localhost';
const dbName = process.env.DB_NAME || 'NoteAppDB';
const dbPort = parseInt(process.env.DB_PORT || '1433', 10);

export const sqlConfig: mssql.config = {
  user: dbUser || 'noteapp',
  password: dbPassword || 'NoteAppPassword123!',
  server: dbServer,
  database: dbName,
  port: dbPort,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

let pool: mssql.ConnectionPool | null = null;

export const getPool = async (): Promise<mssql.ConnectionPool> => {
  if (!pool || !pool.connected) {
    try {
      pool = await new mssql.ConnectionPool(sqlConfig).connect();
      console.log(`✅ SQL Server Connected successfully to [${dbName}] on [${dbServer}:${dbPort}]`);
    } catch (err: any) {
      console.warn(`⚠️ Standard TCP connection failed (${err.message}). Retrying with msnodesqlv8...`);
      const msnodesqlv8 = require('mssql/msnodesqlv8');
      const winConfig: any = {
        connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=.\\SQLEXPRESS;Database=${dbName};Trusted_Connection=yes;`,
        driver: 'msnodesqlv8',
        server: '.\\SQLEXPRESS',
        database: dbName,
        options: { trustedConnection: true },
      };
      pool = await new mssql.ConnectionPool(winConfig).connect();
      console.log(`✅ SQL Server Connected via msnodesqlv8 to [${dbName}]`);
    }
  }
  return pool;
};
