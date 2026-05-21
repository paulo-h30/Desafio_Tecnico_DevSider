"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_service_1 = __importDefault(require("../services/prisma.service"));
class CampaignController {
    async create(req, res) {
        const { name, message, minDelay, maxDelay } = req.body;
        const campaign = await prisma_service_1.default.campaign.create({
            data: { name, message, minDelay, maxDelay },
        });
        res.json(campaign);
    }
    async list(req, res) {
        const campaigns = await prisma_service_1.default.campaign.findMany();
        res.json(campaigns);
    }
    async start(req, res) {
        const { campaignId, listId } = req.body;
        const campaign = await prisma_service_1.default.campaign.findUnique({ where: { id: campaignId } });
        const contacts = await prisma_service_1.default.contact.findMany({ where: { listId } });
        if (!campaign || contacts.length === 0) {
            return res.status(404).json({ error: 'Campanha ou Lista não encontrada' });
        }
        let lastScheduledAt = new Date();
        const queueItems = contacts.map((contact, index) => {
            // O primeiro envia quase agora, os próximos com delay aleatório acumulado
            const delay = index === 0 ? 0 : Math.floor(Math.random() * (campaign.maxDelay - campaign.minDelay + 1)) + campaign.minDelay;
            const scheduledAt = new Date(lastScheduledAt);
            scheduledAt.setSeconds(scheduledAt.getSeconds() + delay);
            lastScheduledAt = scheduledAt;
            return {
                contactId: contact.id,
                phone: contact.phone,
                message: campaign.message,
                scheduledAt: scheduledAt,
                origin: 'CAMPAIGN',
                originId: campaign.id,
            };
        });
        await prisma_service_1.default.sendQueue.createMany({
            data: queueItems,
        });
        res.json({ message: 'Campanha iniciada e enfileirada', count: queueItems.length });
    }
}
exports.default = new CampaignController();
