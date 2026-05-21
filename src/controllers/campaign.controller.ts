import { Request, Response } from 'express';
import prisma from '../services/prisma.service';

class CampaignController {
  async create(req: Request, res: Response) {
    const { name, message, minDelay, maxDelay } = req.body;
    const campaign = await prisma.campaign.create({
      data: { name, message, minDelay, maxDelay },
    });
    res.json(campaign);
  }

  async list(req: Request, res: Response) {
    const campaigns = await prisma.campaign.findMany();
    res.json(campaigns);
  }

  async start(req: Request, res: Response) {
    const { campaignId, listId } = req.body;

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    const contacts = await prisma.contact.findMany({ where: { listId } });

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

    await prisma.sendQueue.createMany({
      data: queueItems,
    });

    res.json({ message: 'Campanha iniciada e enfileirada', count: queueItems.length });
  }
}

export default new CampaignController();
