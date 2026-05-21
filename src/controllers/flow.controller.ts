import { Request, Response } from 'express';
import prisma from '../services/prisma.service';

class FlowController {
  async create(req: Request, res: Response) {
    const { name } = req.body;
    const flow = await prisma.flow.create({ data: { name: name as string } });
    res.json(flow);
  }

  async addStep(req: Request, res: Response) {
    const { flowId } = req.params;
    const { message, delayMinutes, order } = req.body;
    const step = await prisma.flowStep.create({
      data: { 
        flowId: flowId as string, 
        message: message as string, 
        delayMinutes: Number(delayMinutes), 
        order: Number(order) 
      },
    });
    res.json(step);
  }

  async list(req: Request, res: Response) {
    const flows = await prisma.flow.findMany({ include: { steps: true } });
    res.json(flows);
  }

  async startFlowForList(req: Request, res: Response) {
    const { flowId, listId } = req.body;

    const flow = await prisma.flow.findUnique({
      where: { id: flowId as string },
      include: { steps: { orderBy: { order: 'asc' } } },
    });
    const contacts = await prisma.contact.findMany({ where: { listId: listId as string } });

    if (!flow || flow.steps.length === 0 || contacts.length === 0) {
      return res.status(404).json({ error: 'Fluxo (sem etapas) ou Lista não encontrada' });
    }

    const firstStep = flow.steps[0];

    for (const contact of contacts) {
      // Cria a execução do fluxo
      const execution = await prisma.flowExecution.create({
        data: {
          flowId: flow.id,
          contactId: contact.id,
          currentStepId: firstStep.id,
          status: 'ACTIVE',
          nextExecutionAt: new Date(), // Envia o primeiro passo agora
        },
      });

      // Adiciona o primeiro passo na fila de envio
      await prisma.sendQueue.create({
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

export default new FlowController();
