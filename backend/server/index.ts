import { configDotenv } from 'dotenv';
import express from 'express';
import router from './routes';

configDotenv();
const app = express();
const PORT = process.env.PORT;

app.use(express.json());

app.use('/api/v1/', router);

app.listen(PORT, () => {
    console.log(`server is running at http://localhost:${PORT}/`)
});
 