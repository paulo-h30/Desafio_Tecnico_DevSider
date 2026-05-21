"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const wppconnect = __importStar(require("@wppconnect-team/wppconnect"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class WhatsAppService {
    constructor() {
        this.client = null;
        this.status = 'DISCONNECTED';
        this.SESSION_NAME = 'whatsapp-session';
        this.MAX_RETRIES = 3;
    }
    /**
     * Remove tokens de sessão corrompidos para forçar uma nova autenticação.
     */
    clearSession() {
        const tokensPath = path.resolve(process.cwd(), 'tokens', this.SESSION_NAME);
        if (fs.existsSync(tokensPath)) {
            console.log('🧹 Limpando tokens de sessão corrompidos...');
            fs.rmSync(tokensPath, { recursive: true, force: true });
            console.log('✅ Tokens removidos. Uma nova sessão será criada.');
        }
    }
    async init(retryCount = 0) {
        if (this.status !== 'DISCONNECTED')
            return;
        this.status = 'CONNECTING';
        try {
            console.log('\nIniciando WPPConnect...');
            this.client = await wppconnect.create({
                session: this.SESSION_NAME,
                catchQR: (base64Qrimg, asciiQR, attempts, urlCode) => {
                    console.log('\n--- ESCANEIE O QR CODE ABAIXO ---');
                    console.log(asciiQR);
                    console.log(`Tentativa ${attempts} de leitura do QR Code`);
                },
                statusFind: (statusSession, session) => {
                    console.log('Status da Sessão:', statusSession);
                },
                logQR: true, // Exibe o QR no terminal
                headless: true,
                debug: false,
                tokenStore: 'file',
                autoClose: 120000, // 2 minutos para escanear o QR antes de fechar
                browserArgs: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-extensions',
                ],
            });
            this.status = 'CONNECTED';
            console.log('\n✅ WhatsApp conectado com sucesso! O Worker já pode enviar mensagens.');
        }
        catch (error) {
            this.status = 'DISCONNECTED';
            const errorMsg = error.message || String(error);
            console.error(`\n❌ Erro na conexão: ${errorMsg}`);
            // Se falhou ao ler o QR, limpa os tokens corrompidos e tenta novamente
            if (errorMsg.includes('QRCode') || errorMsg.includes('qrReadFail')) {
                if (retryCount < this.MAX_RETRIES) {
                    console.log(`\n🔄 Tentando reconectar (${retryCount + 1}/${this.MAX_RETRIES})...`);
                    this.clearSession();
                    await this.init(retryCount + 1);
                }
                else {
                    console.error(`\n❌ Falha após ${this.MAX_RETRIES} tentativas. Verifique:`);
                    console.error('   1. Se o Chrome/Chromium está instalado corretamente');
                    console.error('   2. Se há conexão com a internet');
                    console.error('   3. Tente executar com headless: false para diagnóstico');
                }
            }
        }
    }
    async sendMessage(to, message) {
        if (!this.client || this.status !== 'CONNECTED') {
            console.warn(`[WhatsApp] Não conectado. Abortando envio para ${to}`);
            return false;
        }
        try {
            // 1. Limpa o número
            let cleanNumber = to.replace(/\D/g, '');
            // 2. Garante o DDI do Brasil (55) se o número tiver tamanho padrão local
            if (cleanNumber.length === 10 || cleanNumber.length === 11) {
                cleanNumber = `55${cleanNumber}`;
            }
            // Prepara as variações de JID (com e sem o 9º dígito)
            const jidVariations = [];
            const defaultJid = `${cleanNumber}@c.us`;
            jidVariations.push(defaultJid);
            // Se for um número brasileiro com 13 dígitos (55 + DDD + 9 + 8 dígitos)
            if (cleanNumber.length === 13 && cleanNumber.startsWith('55')) {
                const ddd = cleanNumber.substring(2, 4);
                const firstDigit = cleanNumber.substring(4, 5);
                if (firstDigit === '9') {
                    const noNineDigit = `55${ddd}${cleanNumber.substring(5)}`;
                    const fallbackJid = `${noNineDigit}@c.us`;
                    jidVariations.push(fallbackJid);
                }
            }
            // Se for um número brasileiro com 12 dígitos (55 + DDD + 8 dígitos), tenta adicionar o 9
            else if (cleanNumber.length === 12 && cleanNumber.startsWith('55')) {
                const ddd = cleanNumber.substring(2, 4);
                const withNineDigit = `55${ddd}9${cleanNumber.substring(4)}`;
                const fallbackJid = `${withNineDigit}@c.us`;
                jidVariations.push(fallbackJid);
            }
            // Tenta cada variação de JID
            for (const jid of jidVariations) {
                try {
                    console.log(`[WhatsApp] Tentando enviar para ${jid}...`);
                    // Opcional: checar status antes, mas sendText costuma ser mais direto
                    // Se o sendText falhar com "No LID", ele cai no catch e tenta a próxima variação
                    await this.client.sendText(jid, message);
                    console.log(`✅ Mensagem enviada com sucesso para ${jid}`);
                    return true;
                }
                catch (err) {
                    const errMsg = err.message || '';
                    if (errMsg.includes('No LID') || errMsg.includes('not found')) {
                        console.warn(`[WhatsApp] JID ${jid} não encontrado (No LID). Tentando próxima variação...`);
                        continue;
                    }
                    // Se for outro erro, logamos mas continuamos tentando as variações
                    console.error(`[WhatsApp] Erro ao enviar para ${jid}:`, errMsg);
                }
            }
            console.error(`❌ Falha total ao enviar para ${to} após tentar todas as variações.`);
            return false;
        }
        catch (error) {
            console.error(`❌ Erro crítico no processo de envio para ${to}:`, error.message || error);
            return false;
        }
    }
    isConnected() {
        return this.status === 'CONNECTED';
    }
}
exports.default = new WhatsAppService();
