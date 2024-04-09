const express = require ('express');
const puppeteer = require ('puppeteer');
const nodemailer = require ('nodemailer');
const fs = require ('fs');
const schedule = require ('node-schedule');
const mysql = require ('mysql2');
const path = require ('path');

const app = express ();
const PORT = 3000;

const user = 'leandro.meira@ldodev.site'; // Seu endereço de e-mail
const pass = 'Leandro171716@'; // Sua senha de e-mail

// Configuração do banco de dados
const connection = mysql.createConnection ({
  host: '200.98.144.125',
  user: 'leandro',
  password: '171716',
  database: 'agendamento_bd',
});

// Conectar ao banco de dados
connection.connect (error => {
  if (error) {
    console.error ('Erro ao conectar ao banco de dados:', error.message);
    return;
  }
  console.log ('Conexão ao banco de dados estabelecida com sucesso.');
});

// Rota para a página HTML de agendamento de e-mails
app.get ('/', (req, res) => {
  res.sendFile (path.join (__dirname, '/index.html'));
});

app.get ('/api/agendamentos', (req, res) => {
  connection.query ('SELECT * FROM agendamentos', (error, results) => {
    if (error) {
      console.error (
        'Erro ao buscar agendamentos no banco de dados:',
        error.message
      );
      res.status (500).send ('Erro ao buscar agendamentos no banco de dados.');
      return;
    }
    res.send (results);
  });
});

// Função para enviar o e-mail com o screenshot da pesquisa de receita de bolo
const sendEmail = async (date, id) => {
  try {
    // Inicia o navegador Puppeteer
    const browser = await puppeteer.launch ();
    // Abre uma nova página
    const page = await browser.newPage ();
    // Navega até o Google
    await page.goto ('https://www.google.com', {timeout: 60000}); // Aumenta o tempo limite para 60 segundos (60000 milissegundos)

    // Digita a consulta de pesquisa na barra de busca do Google
    await page.type ('.gLFyf', 'receita de bolo');

    // Pressiona Enter para realizar a pesquisa
    await page.keyboard.press ('Enter');

    // Espera a página de resultados ser carregada
    await page.waitForNavigation ({waitUntil: 'networkidle2'});

    // Captura um screenshot da página de resultados
    const screenshotPath = 'screenshot.png';
    await page.screenshot ({path: screenshotPath});

    // Captura a altura total da página
    const bodyHandle = await page.$ ('body');
    const {height} = await bodyHandle.boundingBox ();
    await bodyHandle.dispose ();

    // Salva a página como PDF com a página inteira
    const pdfPath = 'pagina_inteira.pdf';
    await page.pdf ({
      path: pdfPath,
      height: `${height}px`,
      printBackground: true,
    });

    // Fecha o navegador
    await browser.close ();

    // Cria um transporte para enviar o e-mail
    const transporter = nodemailer.createTransport ({
      host: 'smtp.umbler.com', // Seu provedor de e-mail
      port: 587,
      auth: {user, pass},
    });

    // Lê o conteúdo do PDF
    const pdfContent = fs.readFileSync (pdfPath);

    // Define as opções do e-mail
    const mailOptions = {
      from: user,
      to: user, // Endereço do destinatário
      subject: 'Screenshot da pesquisa de receita de bolo',
      text: 'Olá, segue em anexo o screenshot da pesquisa de receita de bolo no Google.',
      attachments: [
        {
          filename: 'pagina_inteira.pdf',
          content: pdfContent,
        },
      ],
    };

    // Envia o e-mail
    await transporter.sendMail (mailOptions);

    // Remove os arquivos após o envio do e-mail
    fs.unlinkSync (screenshotPath);
    fs.unlinkSync (pdfPath);

    console.log (`E-mail enviado com sucesso em ${date}!`);

    // Atualiza o status do agendamento para "Enviado" no banco de dados
    connection.query (
      'UPDATE agendamentos SET status = ? WHERE id = ?',
      ['Enviado', id],
      (error, results) => {
        if (error) {
          console.error (
            'Erro ao atualizar status no banco de dados:',
            error.message
          );
          return;
        }
        console.log (
          'Status do agendamento atualizado para "Enviado" no banco de dados.'
        );
      }
    );
  } catch (error) {
    console.error ('Erro ao enviar e-mail:', error);
    throw new Error ('Erro ao enviar o e-mail.');
  }
};

// Rota para agendar o envio do e-mail
app.get ('/schedule', (req, res) => {
  const {date} = req.query; // Recebe a data e hora como parâmetro

  // Insere o agendamento no banco de dados
  connection.query (
    'INSERT INTO agendamentos (data_envio, status) VALUES (?, ?)',
    [date, 'Agendado'],
    (error, results) => {
      if (error) {
        console.error (
          'Erro ao inserir agendamento no banco de dados:',
          error.message
        );
        res.status (500).send ({date, status: 'Não enviado'});
        return;
      }

      const id = results.insertId; // Obtém o ID do agendamento inserido
      console.log ('Agendamento inserido no banco de dados com ID:', id);

      // Agenda o envio do e-mail com base na data e hora fornecidas
      const job = schedule.scheduleJob (new Date (date), async () => {
        console.log (`E-mail será enviado em ${date}`);
        try {
          await sendEmail (date, id);
          res.send ({date, status: 'Enviado'});
        } catch (error) {
          console.error ('Erro ao enviar e-mail:', error.message);
          // Se ocorrer um erro, envie o status "Não enviado" para o front-end
          res.status (500).send ({date, status: 'Não enviado'});
        }
      });
    }
  );
});

// Inicia o servidor
app.listen (PORT, () => {
  console.log (`Servidor rodando em http://localhost:${PORT}`);
});
