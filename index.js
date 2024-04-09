const express = require ('express');
const puppeteer = require ('puppeteer');
const nodemailer = require ('nodemailer');
const fs = require ('fs');
const schedule = require ('node-schedule');
const mysql = require ('mysql2');
const path = require ('path');
const cors = require ('cors');

const app = express ();
app.use (cors ()); // Adiciona o middleware CORS

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

// Rota para buscar agendamentos no banco de dados
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

// Função para enviar o e-mail com o screenshot da pesquisa de receita de bolo
const sendEmail = async (date, id) => {
  try {
    // Código da função sendEmail...
  } catch (error) {
    console.error ('Erro ao enviar e-mail:', error);
    throw new Error ('Erro ao enviar o e-mail.');
  }
};

// Inicia o servidor
app.listen (PORT, () => {
  console.log (`Servidor rodando em http://localhost:${PORT}`);
});
