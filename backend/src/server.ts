import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import syncRoutes from './routes/syncRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/sync', syncRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', serverTime: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Note App Backend Server listening on port ${PORT}`);
});
