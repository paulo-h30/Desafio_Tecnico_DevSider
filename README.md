# ⚡ Flow Leads - Automação & Funis de WhatsApp

Este projeto foi desenvolvido como **desafio técnico** para a vaga de **Estágio em Desenvolvimento** da empresa **DevSider**. O objetivo principal é fornecer uma plataforma integrada de gestão de leads e automação de disparos de mensagens sequenciais via WhatsApp de forma inteligente, humanizada e eficiente.

---

## 🎯 Sobre o Projeto & Por que foi Desenvolvido

O **Flow Leads** foi pensado como uma ponte direta entre a captura de leads (via importação ou cadastro manual) e a régua de relacionamento automatizada.

O sistema foi desenhado para resolver três principais dores das empresas:

1. **Evitar Banimento de Números:** Disparos automáticos tradicionais em massa costumam ser bloqueados instantaneamente pelas políticas anti-spam do WhatsApp.
2. **Automação Sequencial Inteligente:** Gerenciar funis com intervalos de tempo entre mensagens diferentes para cada cliente de forma individualizada.
3. **Visibilidade em Tempo Real:** Permitir que o operador acompanhe exatamente quais mensagens estão na fila de envio, quais foram entregues e quais falharam.

---

## 💡 Como o Sistema foi Pensado (Decisões de Design)

- **Disparo Humanizado e Aleatório (Campanhas):** Ao enfileirar mensagens em lote, o sistema calcula dinamicamente um tempo de espera aleatório (delay mínimo e máximo) entre cada envio, emulando o comportamento de digitação humano.
- **Funis Sequenciais de Múltiplas Etapas (Fluxos):** Permite criar automações com "etapas de espera" (ex: enviar Mensagem 1 imediatamente, aguardar 10 minutos para enviar a Mensagem 2, etc.). O sistema gerencia a execução de forma assíncrona e individual por contato.
- **Painel Centralizado (Dashboard Single-Page):** Toda a interação ocorre em uma interface unificada, responsiva, moderna e dinâmica. Um **Widget Flutuante de Status** faz polling constante para mostrar o andamento da fila em tempo real, sem a necessidade de recarregar a tela.
- **Segurança e Robustez:** Implementação de sanitização contra injeção de scripts (XSS), tratamento seguro no processamento e exclusão de arquivos temporários para evitar gargalos de disco (DoS), além de rate limiting para impedir flood na API.

---

## 🛠️ Stack Tecnológica

O sistema foi estruturado utilizando tecnologias modernas focadas em performance e tipagem estrita no backend:

### ⚙️ Backend

- **Linguagem:** TypeScript (garante robustez e facilidade de manutenção).
- **Runtime:** Node.js com framework Express.js para criação da API RESTful.
- **Banco de Dados & ORM:** Prisma ORM integrado com SQLite. Uma solução leve, relacional, robusta e que não exige a instalação de servidores de banco complexos locais.
- **Fila & Agendamento:** Worker assíncrono interno baseado em `setInterval` que roda em background monitorando a tabela `SendQueue` a cada 5 segundos.
- **Integração WhatsApp:** `@wppconnect-team/wppconnect` (Biblioteca baseada em Puppeteer que controla o WhatsApp Web e lida com renderização e escaneamento de QR Code diretamente no terminal).

### 🖥️ Frontend

- **Core:** HTML5 Semântico e CSS3 Vanilla (organizado com variáveis globais CSS e animações fluidas de transição).
- **Lógica:** JavaScript Moderno (manipulação assíncrona do DOM, consumo de APIs via `fetch` e controle de estados locais).

---

## 🚀 Principais Funcionalidades

1. **Importação Inteligente de Leads (CSV):** Permite carregar listas de milhares de leads de uma só vez mapeando colunas dinamicamente por nome, com validações de arquivo e limpeza automática de diretório.
2. **Cadastro Manual de Contatos:** Adicione contatos individualmente a listas existentes de forma rápida diretamente pela dashboard.
3. **Modelagem de Campanhas:** Crie modelos de mensagens parametrizando atrasos (delays) mínimos e máximos customizados.
4. **Editor de Funis (Automações):** Crie funis infinitos adicionando etapas sequenciais com delays em minutos configurados para cada mensagem.
5. **Widget de Acompanhamento em Tempo Real:** Acompanhe a taxa de progresso (%), contadores de pendentes/enviados/falhados e logs detalhados de cada envio na fila.
6. **Reset do Sistema:** Limpeza completa do banco de dados de maneira estruturada respeitando chaves estrangeiras.

---

## 📁 Estrutura do Código

```text
├── prisma/
│   ├── schema.prisma   # Definição dos Modelos (SQLite)
├── src/
│   ├── controllers/    # Lógica de controle das requisições (Campanhas, Contatos, Fluxos, Sistema)
│   ├── middlewares/    # Validações de segurança do servidor
│   ├── public/         # Frontend Estático (index.html, CSS e Scripts)
│   ├── routes/         # Definições de rotas da API REST
│   ├── services/       # Serviços centrais (Prisma Client, WhatsApp WPPConnect, Background Worker)
│   └── index.ts        # Arquivo de inicialização do servidor e serviços
├── package.json        # Dependências e scripts npm
└── tsconfig.json       # Configurações do compilador TypeScript
```

---

## 🏃 Como Executar o Projeto Localmente

### Pré-requisitos

- Ter o **Node.js** instalado na versão 18 ou superior.
- Ter o **npm** ou gerenciador de pacotes equivalente.

### Instalação

1. Clone o repositório ou baixe os arquivos em sua máquina.
2. Instale as dependências executando no diretório raiz:
   ```bash
   npm install
   ```

### Banco de Dados

Gere o cliente do Prisma e execute as migrations para estruturar o banco local SQLite:

```bash
npx prisma migrate dev --name init
```

### Inicialização

Para rodar a aplicação em modo de desenvolvimento (com auto-reload das alterações):

```bash
npm run dev
```

O servidor iniciará no endereço [http://localhost:3000](http://localhost:3000). O console solicitará o escaneamento do **QR Code** via WhatsApp no terminal para conectar a sessão de disparos.

---

## 👤 Autor

- **Desenvolvido por:** Paulo Haniel (paulo-h30)
- **Finalidade:** Teste Técnico para a vaga de Estágio - DevSider.
