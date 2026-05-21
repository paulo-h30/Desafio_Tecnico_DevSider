"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_service_1 = __importDefault(require("./prisma.service"));
const whatsapp_service_1 = __importDefault(require("./whatsapp.service"));
class WorkerService {
    constructor() {
        this.isRunning = false;
        this.interval = null;
    }
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        console.log('Worker iniciado...');
        this.interval = setInterval(async () => {
            await this.processQueue();
        }, 5000); // Processa a cada 5 segundos
    }
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
    }
    async processQueue() {
        // Busca mensagens pendentes agendadas para agora ou passado
        const pendingMessages = await prisma_service_1.default.sendQueue.findMany({
            where: {
                status: 'PENDING',
                scheduledAt: {
                    lte: new Date(),
                },
            },
            include: {
                contact: true,
            },
            orderBy: {
                scheduledAt: 'asc',
            },
            take: 1, // Processa uma de cada vez para simplificar o controle de delay
        });
        for (const msg of pendingMessages) {
            console.log(`[Worker] Enviando para ${msg.phone}: "${msg.message.substring(0, 20)}..."`);
            const success = await whatsapp_service_1.default.sendMessage(msg.phone, msg.message);
            if (success) {
                await prisma_service_1.default.sendQueue.update({
                    where: { id: msg.id },
                    data: { status: 'SENT' },
                });
                // Se for um fluxo, agenda o próximo passo
                if (msg.origin === 'FLOW' && msg.originId) {
                    await this.handleNextFlowStep(msg.contactId, msg.originId);
                }
            }
            else {
                await prisma_service_1.default.sendQueue.update({
                    where: { id: msg.id },
                    data: { status: 'FAILED' },
                });
            }
        }
    }
    async handleNextFlowStep(contactId, flowExecutionId) {
        const execution = await prisma_service_1.default.flowExecution.findUnique({
            where: { id: flowExecutionId },
            include: {
                flow: {
                    include: {
                        steps: {
                            orderBy: { order: 'asc' },
                        },
                    },
                },
                contact: true
            },
        });
        if (!execution || execution.status === 'COMPLETED')
            return;
        const currentStepIndex = execution.flow.steps.findIndex(s => s.id === execution.currentStepId);
        const nextStep = execution.flow.steps[currentStepIndex + 1];
        if (nextStep) {
            const scheduledAt = new Date();
            scheduledAt.setMinutes(scheduledAt.getMinutes() + nextStep.delayMinutes);
            // Atualiza a execução do fluxo
            await prisma_service_1.default.flowExecution.update({
                where: { id: execution.id },
                data: {
                    currentStepId: nextStep.id,
                    nextExecutionAt: scheduledAt,
                },
            });
            // Adiciona na fila de envio
            await prisma_service_1.default.sendQueue.create({
                data: {
                    contactId,
                    phone: execution.contact.phone,
                    message: nextStep.message,
                    scheduledAt: scheduledAt,
                    status: 'PENDING',
                    origin: 'FLOW',
                    originId: execution.id,
                },
            });
            console.log(`[Worker] Próximo passo do fluxo agendado para ${execution.contact.phone} em ${scheduledAt}`);
        }
        else {
            await prisma_service_1.default.flowExecution.update({
                where: { id: execution.id },
                data: { status: 'COMPLETED' },
            });
            console.log(`[Worker] Fluxo finalizado para ${execution.contact.phone}`);
        }
    }
}
exports.default = new WorkerService();
