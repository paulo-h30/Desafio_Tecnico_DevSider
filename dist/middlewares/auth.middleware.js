"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
function authMiddleware(req, res, next) {
    // Se não houver API_KEY definida no .env, permitimos a passagem para manter compatibilidade e não quebrar o sistema local
    const secureKey = process.env.API_KEY;
    if (!secureKey) {
        return next();
    }
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'Acesso não autorizado. Chave de API ausente.' });
    }
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    if (token !== secureKey) {
        return res.status(401).json({ error: 'Acesso não autorizado. Chave de API inválida.' });
    }
    next();
}
