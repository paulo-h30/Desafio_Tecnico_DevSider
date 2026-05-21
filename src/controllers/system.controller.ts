import { Request, Response } from 'express';
import prisma from '../services/prisma.service';

class SystemController {
  async reset(req: Request, res: Response) {
    try {
      // É necessário deletar na ordem correta devido às chaves estrangeiras (Foreign Keys)
      
      // 1. Limpa a fila de envio e execuções de fluxo (dependentes de tudo)
      await prisma.sendQueue.deleteMany({});
      await prisma.flowExecution.deleteMany({});
      
      // 2. Limpa os passos dos fluxos e depois os fluxos
      await prisma.flowStep.deleteMany({});
      await prisma.flow.deleteMany({});
      
      // 3. Limpa as campanhas
      await prisma.campaign.deleteMany({});
      
      // 4. Limpa os contatos e depois as listas de contatos
      await prisma.contact.deleteMany({});
      await prisma.contactList.deleteMany({});

      res.json({ message: 'Sistema resetado com sucesso! Todos os dados foram apagados.' });
    } catch (error) {
      console.error('Erro ao resetar o sistema:', error);
      res.status(500).json({ error: 'Erro ao resetar o banco de dados.' });
    }
  }

  async getQueueStatus(req: Request, res: Response) {
    try {
      const pending = await prisma.sendQueue.count({ where: { status: 'PENDING' } });
      const sent = await prisma.sendQueue.count({ where: { status: 'SENT' } });
      const failed = await prisma.sendQueue.count({ where: { status: 'FAILED' } });
      const total = pending + sent + failed;

      const recent = await prisma.sendQueue.findMany({
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
    } catch (error) {
      console.error('Erro ao buscar status da fila:', error);
      res.status(500).json({ error: 'Erro ao buscar status da fila.' });
    }
  }
}

export default new SystemController();
