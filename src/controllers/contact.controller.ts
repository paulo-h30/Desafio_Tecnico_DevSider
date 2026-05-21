import { Request, Response } from 'express';
import prisma from '../services/prisma.service';
import fs from 'fs';
const csv = require('csv-parser');

class ContactController {
  async importContacts(req: Request, res: Response) {
    const deleteFileSafe = (filePath: string) => {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error('Erro ao deletar arquivo temporário:', err);
        }
      }
    };

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Validação de tipo de arquivo (Apenas CSV) - SEC-04
    const fileExtension = req.file.originalname.split('.').pop()?.toLowerCase();
    const isCsv = req.file.mimetype === 'text/csv' || fileExtension === 'csv';
    if (!isCsv) {
      deleteFileSafe(req.file.path);
      return res.status(400).json({ error: 'Apenas arquivos CSV são permitidos!' });
    }

    const { name: listName } = req.body;
    if (!listName) {
      deleteFileSafe(req.file.path);
      return res.status(400).json({ error: 'Nome da lista é obrigatório' });
    }

    const contacts: { name: string; phone: string }[] = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data: any) => {
        try {
          if (!data) return;

          // Pega todos os valores das colunas da linha atual
          const values = Object.values(data);
          if (values.length < 2) return;

          // Tenta identificar nome e telefone por chaves comuns ou por posição
          const nomeRaw = data.nome || data.Nome || data.NOME || values[0];
          const telefoneRaw = data.telefone || data.Telefone || data.TELEFONE || values[1];

          if (nomeRaw && telefoneRaw) {
            const name = String(nomeRaw).trim();
            const phone = String(telefoneRaw).replace(/\D/g, '');
            
            if (name && phone) {
              contacts.push({ name, phone });
            }
          }
        } catch (err) {
          console.error('Erro ao processar linha do CSV:', err);
        }
      })
      .on('end', async () => {
        try {
          if (contacts.length === 0) {
            return res.status(400).json({ error: 'Nenhum contato válido encontrado no CSV' });
          }

          const newList = await prisma.contactList.create({
            data: {
              name: String(listName),
              contacts: {
                create: contacts,
              },
            },
          });
          
          res.json({ message: 'Contatos importados com sucesso', listId: newList.id, count: contacts.length });
        } catch (error) {
          console.error('Erro ao salvar contatos no banco:', error);
          res.status(500).json({ error: 'Erro ao salvar contatos no banco' });
        } finally {
          deleteFileSafe(req.file.path);
        }
      })
      .on('error', (err) => {
        console.error('Erro na leitura do CSV:', err);
        deleteFileSafe(req.file.path);
        res.status(500).json({ error: 'Erro ao ler o arquivo CSV' });
      });
  }

  async addManualContact(req: Request, res: Response) {
    const { listId, name, phone } = req.body;
    
    if (!listId || !name || !phone) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    try {
      const cleanPhone = String(phone).replace(/\D/g, '');
      const contact = await prisma.contact.create({
        data: {
          name: String(name),
          phone: cleanPhone,
          listId: String(listId),
        },
      });
      res.json({ message: 'Contato adicionado com sucesso', contact });
    } catch (error) {
      console.error('Erro ao adicionar contato manual:', error);
      res.status(500).json({ error: 'Erro ao adicionar contato manual' });
    }
  }

  async listLists(req: Request, res: Response) {
    const lists = await prisma.contactList.findMany({
      include: { _count: { select: { contacts: true } } },
    });
    res.json(lists);
  }

  async listContactsByList(req: Request, res: Response) {
    const { listId } = req.params;
    const contacts = await prisma.contact.findMany({
      where: { listId: String(listId) },
    });
    res.json(contacts);
  }

  async deleteList(req: Request, res: Response) {
    const { listId } = req.params;

    try {
      // Verifica se a lista existe
      const list = await prisma.contactList.findUnique({
        where: { id: String(listId) },
        include: { contacts: { select: { id: true } } },
      });

      if (!list) {
        return res.status(404).json({ error: 'Lista não encontrada' });
      }

      const contactIds = list.contacts.map(c => c.id);

      // Remove em transação: SendQueue → FlowExecution → Contacts → ContactList
      await prisma.$transaction([
        prisma.sendQueue.deleteMany({
          where: { contactId: { in: contactIds } },
        }),
        prisma.flowExecution.deleteMany({
          where: { contactId: { in: contactIds } },
        }),
        prisma.contact.deleteMany({
          where: { listId: String(listId) },
        }),
        prisma.contactList.delete({
          where: { id: String(listId) },
        }),
      ]);

      res.json({ message: `Lista "${list.name}" excluída com sucesso` });
    } catch (error) {
      console.error('Erro ao excluir lista:', error);
      res.status(500).json({ error: 'Erro ao excluir lista' });
    }
  }
}

export default new ContactController();
