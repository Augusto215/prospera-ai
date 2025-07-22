// server/server.js
import express from 'express';
import cors from 'cors';
import twilio from 'twilio';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Configurar o cliente Twilio
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Rota para enviar SMS
app.post('/api/send-sms', async (req, res) => {
  try {
    const { to, message } = req.body;

    // Validar dados de entrada
    if (!to || !message) {
      return res.status(400).json({
        error: 'Dados inválidos',
        message: 'Telefone e mensagem são obrigatórios'
      });
    }

    // Validar formato do telefone (+55DDNNNNNNNNN)
    if (!/^\+55\d{10,11}$/.test(to)) {
      return res.status(400).json({
        error: 'Telefone inválido',
        message: 'Use o formato +55DDNNNNNNNNN'
      });
    }

    console.log('📱 Enviando SMS para:', to);
    console.log('💬 Mensagem:', message);

    // MODO DESENVOLVIMENTO: Mock do SMS
    if (process.env.NODE_ENV === 'development') {
      console.log('🚧 === MODO DESENVOLVIMENTO: SMS MOCK ===');
      console.log('📞 Para:', to);
      console.log('💬 Mensagem:', message);
      console.log('⏰ Timestamp:', new Date().toLocaleString());
      console.log('==========================================');

      // Simular delay do Twilio
      await new Promise(resolve => setTimeout(resolve, 1000));

      return res.status(200).json({
        success: true,
        message: 'SMS enviado com sucesso (MOCK)',
        sid: 'mock_' + Date.now(),
        status: 'sent',
        mock: true
      });
    }

    // MODO PRODUÇÃO: Twilio real
    // Verificar se as credenciais do Twilio estão configuradas
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      return res.status(500).json({
        error: 'Configuração inválida',
        message: 'Credenciais do Twilio não configuradas'
      });
    }

    // Enviar SMS via Twilio
    const smsResult = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    console.log('✅ SMS enviado com sucesso:', smsResult.sid);

    // Retornar sucesso
    res.status(200).json({
      success: true,
      message: 'SMS enviado com sucesso',
      sid: smsResult.sid,
      status: smsResult.status
    });

  } catch (error) {
    console.error('❌ Erro ao enviar SMS:', error);

    // Tratar erros específicos do Twilio
    if (error.code) {
      switch (error.code) {
        case 21211:
          return res.status(400).json({
            error: 'Número inválido',
            message: 'O número de telefone não é válido'
          });
        case 21408:
          return res.status(400).json({
            error: 'Número não permitido',
            message: 'Este número não pode receber SMS'
          });
        case 21610:
          return res.status(400).json({
            error: 'Número bloqueado',
            message: 'Este número está na lista de bloqueios'
          });
        default:
          return res.status(500).json({
            error: 'Erro do Twilio',
            message: error.message || 'Erro desconhecido do Twilio'
          });
      }
    }

    // Erro genérico
    res.status(500).json({
      error: 'Erro interno',
      message: 'Erro ao enviar SMS'
    });
  }
});

// Rota de teste
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Servidor funcionando!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    twilio_configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Teste: http://localhost:${PORT}/api/test`);
  console.log(`💚 Health: http://localhost:${PORT}/api/health`);
  console.log(`📱 Twilio configurado: ${!!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN)}`);
});