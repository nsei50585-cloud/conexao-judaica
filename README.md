# Conexão Judaica — Painel de consultas

Projeto inicial de um painel web com tema preto e vermelho.

## O que funciona
- Login com sessão.
- Dashboard responsivo.
- Consulta de CEP pelo ViaCEP.
- Consulta de CNPJ pela BrasilAPI.
- Histórico das últimas 30 consultas por conta.
- Banco SQLite local.

O painel consulta apenas dados postais e cadastrais públicos de empresas. Não possui busca de CPF, telefone, endereço residencial, localização ou dados privados de pessoas.

## Requisitos
- Node.js 18 ou superior.
- Conexão com a internet para instalar dependências e consultar as APIs.

## Como iniciar no Windows
1. Extraia o ZIP.
2. Abra a pasta `conexao_judaica`.
3. Copie `.env.example` e renomeie a cópia para `.env`.
4. Abra o arquivo `.env` e altere `SESSION_SECRET`, `ADMIN_USER` e `ADMIN_PASSWORD`.
5. Abra o CMD nessa pasta e execute:
   `npm install`
6. Depois execute:
   `npm start`
7. Abra `http://localhost:3000` no navegador e entre com o usuário e senha definidos no `.env`.

## Importante antes de publicar na internet
Este é um protótipo funcional para rodar localmente. Para publicar, configure HTTPS, um armazenamento de sessão persistente, segredo forte, backups e monitoramento. Não use as credenciais de exemplo. O armazenamento de sessão padrão do Express é apenas para desenvolvimento. Revise também os termos e limites de uso dos serviços ViaCEP e BrasilAPI.

## Estrutura
- `server.js`: servidor, autenticação, banco e endpoints.
- `public/index.html`: telas.
- `public/styles.css`: identidade visual.
- `public/app.js`: navegação e consultas.
- `data/`: banco criado automaticamente na primeira execução.
