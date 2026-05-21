import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import router from './routes';
import whatsappService from './services/whatsapp.service';
import workerService from './services/worker.service';

const app = express();
const PORT = process.env.PORT || 3000;

// Segurança de cabeçalhos (CSP desabilitado para suportar scripts inline da dashboard sem quebras)
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Limitação de taxa de requisições na API para evitar flood e banimentos no WhatsApp
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por IP
  message: { error: 'Muitas requisições originadas deste IP, por favor tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes protegidas por Rate Limiting
app.use('/api', apiLimiter, router);

// Start Server
app.listen(PORT, async () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  
  // Inicializa WhatsApp
  await whatsappService.init();
  
  // Inicializa Worker
  workerService.start();
});
