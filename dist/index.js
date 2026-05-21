"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const routes_1 = __importDefault(require("./routes"));
const whatsapp_service_1 = __importDefault(require("./services/whatsapp.service"));
const worker_service_1 = __importDefault(require("./services/worker.service"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Segurança de cabeçalhos (CSP desabilitado para suportar scripts inline da dashboard sem quebras)
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Limitação de taxa de requisições na API para evitar flood e banimentos no WhatsApp
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // limite de 100 requisições por IP
    message: { error: 'Muitas requisições originadas deste IP, por favor tente novamente mais tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});
// Serve static files
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
// API Routes protegidas por Rate Limiting
app.use('/api', apiLimiter, routes_1.default);
// Start Server
app.listen(PORT, async () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    // Inicializa WhatsApp
    await whatsapp_service_1.default.init();
    // Inicializa Worker
    worker_service_1.default.start();
});
