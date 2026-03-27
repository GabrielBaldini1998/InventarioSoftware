# Inventário de Software — Grupo Moas

Este projeto é uma página HTML estática com um formulário para consolidar o inventário de ferramentas usadas pelas áreas.  
Cada bloco **Software** gera **1 linha** na planilha, mantendo os dados do responsável fixos.

## Como rodar (local)

- Abra o arquivo `index.html` no navegador **ou** use um servidor estático (recomendado).
- Se você usar servidor estático, o comportamento de cache/atualização e permissões tende a ser mais previsível.

## Estrutura

- `index.html`: página e formulário
- `Css/style.css`: estilos (centralizados aqui; sem estilos inline)
- `Js/script.js`: comportamento do formulário (softwares dinâmicos + envio)
- `Code.gs`: backend (Google Apps Script) que recebe o POST e grava na planilha
- `assets/`: imagens e logos

## Como funciona o formulário

### Dados fixos (uma vez por envio)

- **Nome completo do responsável**
- **Departamento / área**
- **Gestor da área**

### Dados por software (repete; 1 linha por software)

Dentro de cada cartão **Software**:

- **Nome do software / ferramenta**
- **Forma de pagamento** (se for *Outro*, abre **Descreva o pagamento**)
- **Tipo de cobrança** (mensal/anual/compra única)
- **Valor** (aparece após escolher o tipo)
- **Finalidade**
- **Uso/processos**
- **Logins ativos**
- **Usuários**
- **Nível de importância** (1–5)

## Planilha (Google Sheets)

O `Code.gs` grava sempre as colunas fixas (A → M), nesta ordem:

1. `nome responsavel`
2. `departamento`
3. `gestor`
4. `Nome do software / ferramenta`
5. `Forma de pagamento`
6. `Tipo de cobrança`
7. `Valor`
8. `Qual a finalidade principal do uso?`
9. `Descreva brevemente em quais processos/tarefas é utilizado`
10. `Informe o nível de importância desta ferramenta para a operação da área`
11. `Quantas pessoas na sua equipe possuem login/acesso ativo hoje?`
12. `Quem são os usuários que utilizam a ferramenta?`
13. `Timestamp`

## Configurar o Apps Script (Web App)

1. Crie/abra um projeto no Google Apps Script.
2. Cole o conteúdo de `Code.gs` no editor do Apps Script.
3. Ajuste no topo do `Code.gs` (se necessário):
   - `SPREADSHEET_ID`
   - `SHEET_GID` (ou deixe usar a primeira aba)
4. Faça o deploy como **Web App**:
   - **Executar como**: **Eu**
   - **Quem pode acessar**: **Qualquer pessoa**
5. Após qualquer mudança no Apps Script, publique uma nova versão:
   - `Deploy → Manage deployments → Edit → New version → Update`

## Configurar a URL do Web App no site

Em `Js/script.js`, atualize:

```js
const APPS_SCRIPT_WEBAPP_URL = "https://script.google.com/macros/s/SEU_ID/exec";
```

## Como o envio acontece

O formulário envia para o Apps Script via **iframe oculto** (sem redirecionar a página).  
O botão **Enviar** fica desabilitado durante o envio para evitar duplicidade.

## Troubleshooting

### Erro `401 (Unauthorized)`

- O Web App **não está público** ou está exigindo login.
- Confirme o deploy:
  - **Executar como**: Eu
  - **Quem pode acessar**: Qualquer pessoa

### Mudou o `Code.gs` e “não mudou em produção”

- Você precisa publicar **New version** no Apps Script (deploy).

### “Não aparece na planilha”

- Verifique se o Apps Script tem permissão para editar a planilha.
- Verifique se o `SPREADSHEET_ID` está correto.

