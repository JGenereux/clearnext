import 'dotenv/config';
import express, { Request, Response } from 'express';
import meetRouter from './routes/meet';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Server is running' });
});

app.use('/meet', meetRouter);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
