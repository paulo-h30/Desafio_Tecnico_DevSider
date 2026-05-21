import prisma from './prisma.service';
import whatsappService from './whatsapp.service';

class WorkerService {
  private isRunning = false;
  private interval: NodeJS.Timeout | null = null;

  start() {
    if (this.isRunning) return;
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

  private async processQueue() {
    // Busca mensagens pendentes agendadas para agora ou passado
    const pendingMessages = await prisma.sendQueue.findMany({
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
      
      const success = await whatsappService.sendMessage(msg.phone, msg.message);

      if (success) {
        await prisma.sendQueue.update({
          where: { id: msg.id },
          data: { status: 'SENT' },
        });

        // Se for um fluxo, agenda o próximo passo
        if (msg.origin === 'FLOW' && msg.originId) {
          await this.handleNextFlowStep(msg.contactId, msg.originId);
        }
      } else {
        await prisma.sendQueue.update({
          where: { id: msg.id },
          data: { status: 'FAILED' },
        });
      }
    }
  }

  private async handleNextFlowStep(contactId: string, flowExecutionId: string) {
    const execution = await prisma.flowExecution.findUnique({
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

    if (!execution || execution.status === 'COMPLETED') return;

    const currentStepIndex = execution.flow.steps.findIndex(s => s.id === execution.currentStepId);
    const nextStep = execution.flow.steps[currentStepIndex + 1];

    if (nextStep) {
      const scheduledAt = new Date();
      scheduledAt.setMinutes(scheduledAt.getMinutes() + nextStep.delayMinutes);

      // Atualiza a execução do fluxo
      await prisma.flowExecution.update({
        where: { id: execution.id },
        data: {
          currentStepId: nextStep.id,
          nextExecutionAt: scheduledAt,
        },
      });

      // Adiciona na fila de envio
      await prisma.sendQueue.create({
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
    } else {
      await prisma.flowExecution.update({
        where: { id: execution.id },
        data: { status: 'COMPLETED' },
      });
      console.log(`[Worker] Fluxo finalizado para ${execution.contact.phone}`);
    }
  }
}

export default new WorkerService();
