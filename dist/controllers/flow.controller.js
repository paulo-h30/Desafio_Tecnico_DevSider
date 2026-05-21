"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_service_1 = __importDefault(require("../services/prisma.service"));
class FlowController {
    async create(req, res) {
        const { name } = req.body;
        const flow = await prisma_service_1.default.flow.create({ data: { name: name } });
        res.json(flow);
    }
    async addStep(req, res) {
        const { flowId } = req.params;
        const { message, delayMinutes, order } = req.body;
        const step = await prisma_service_1.default.flowStep.create({
            data: {
                flowId: flowId,
                message: message,
                delayMinutes: Number(delayMinutes),
                order: Number(order)
            },
        });
        res.json(step);
    }
    async list(req, res) {
        const flows = await prisma_service_1.default.flow.findMany({ include: { steps: true } });
        res.json(flows);
    }
    async startFlowForList(req, res) {
        const { flowId, listId } = req.body;
        const flow = await prisma_service_1.default.flow.findUnique({
            where: { id: flowId },
            include: { steps: { orderBy: { order: 'asc' } } },
        });
        const contacts = await prisma_service_1.default.contact.findMany({ where: { listId: listId } });
        if (!flow || flow.steps.length === 0 || contacts.length === 0) {
            return res.status(404).json({ error: 'Fluxo (sem etapas) ou Lista não encontrada' });
        }
        const firstStep = flow.steps[0];
        for (const contact of contacts) {
            // Cria a execução do fluxo
            const execution = await prisma_service_1.default.flowExecution.create({
                data: {
                    flowId: flow.id,
                    contactId: contact.id,
                    currentStepId: firstStep.id,
                    status: 'ACTIVE',
                    nextExecutionAt: new Date(), // Envia o primeiro passo agora
                },
            });
            // Adiciona o primeiro passo na fila de envio
            await prisma_service_1.default.sendQueue.create({
                data: {
                    contactId: contact.id,
                    phone: contact.phone,
                    message: firstStep.message,
                    scheduledAt: new Date(),
                    origin: 'FLOW',
                    originId: execution.id,
                },
            });
        }
        res.json({ message: 'Lista adicionada ao fluxo com sucesso', count: contacts.length });
    }
}
exports.default = new FlowController();
