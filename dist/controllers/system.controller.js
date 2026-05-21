"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_service_1 = __importDefault(require("../services/prisma.service"));
class SystemController {
    async reset(req, res) {
        try {
            // É necessário deletar na ordem correta devido às chaves estrangeiras (Foreign Keys)
            // 1. Limpa a fila de envio e execuções de fluxo (dependentes de tudo)
            await prisma_service_1.default.sendQueue.deleteMany({});
            await prisma_service_1.default.flowExecution.deleteMany({});
            // 2. Limpa os passos dos fluxos e depois os fluxos
            await prisma_service_1.default.flowStep.deleteMany({});
            await prisma_service_1.default.flow.deleteMany({});
            // 3. Limpa as campanhas
            await prisma_service_1.default.campaign.deleteMany({});
            // 4. Limpa os contatos e depois as listas de contatos
            await prisma_service_1.default.contact.deleteMany({});
            await prisma_service_1.default.contactList.deleteMany({});
            res.json({ message: 'Sistema resetado com sucesso! Todos os dados foram apagados.' });
        }
        catch (error) {
            console.error('Erro ao resetar o sistema:', error);
            res.status(500).json({ error: 'Erro ao resetar o banco de dados.' });
        }
    }
    async getQueueStatus(req, res) {
        try {
            const pending = await prisma_service_1.default.sendQueue.count({ where: { status: 'PENDING' } });
            const sent = await prisma_service_1.default.sendQueue.count({ where: { status: 'SENT' } });
            const failed = await prisma_service_1.default.sendQueue.count({ where: { status: 'FAILED' } });
            const total = pending + sent + failed;
            const recent = await prisma_service_1.default.sendQueue.findMany({
                orderBy: { scheduledAt: 'desc' },
                take: 5,
                include: {
                    contact: {
                        select: { name: true }
                    }
                }
            });
            res.json({
                pending,
                sent,
                failed,
                total,
                recent: recent.map(item => ({
                    id: item.id,
                    phone: item.phone,
                    message: item.message,
                    status: item.status,
                    scheduledAt: item.scheduledAt,
                    contactName: item.contact ? item.contact.name : 'Desconhecido',
                    origin: item.origin
                }))
            });
        }
        catch (error) {
            console.error('Erro ao buscar status da fila:', error);
            res.status(500).json({ error: 'Erro ao buscar status da fila.' });
        }
    }
}
exports.default = new SystemController();
