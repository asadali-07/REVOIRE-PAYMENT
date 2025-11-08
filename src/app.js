import express from 'express';
import paymentRouter from './routes/payment.route.js';
import cookieParser from 'cookie-parser';
import {connect} from './broker/broker.js';
import cors from 'cors';



const app = express();
connect();

app.use(cors({
  origin: 'https://revoire.netlify.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());
app.use('/api/payments', paymentRouter);


export default app;