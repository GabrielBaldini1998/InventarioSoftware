/**
 * Google Apps Script - receptor do formulário (Web App)
 *
 * Como usar (resumo):
 * - Crie um projeto no Apps Script
 * - Cole este arquivo como `Code.gs`
 * - Ajuste SPREADSHEET_ID e SHEET_NAME
 * - Deploy > New deployment > Web app
 *   - Execute as: Me
 *   - Who has access: Anyone
 * - No seu site, envie POST para a URL do Web App (ver abaixo).
 *
 * Este endpoint grava 1 linha por software (se o usuário adicionou vários).
 */

// Planilha informada pelo link:
// https://docs.google.com/spreadsheets/d/1bw7upQFaXcOmnjnrd1e1xP7A_swvO_O4RNp_dMiKYOg/edit?gid=0#gid=0
const SPREADSHEET_ID = "1bw7upQFaXcOmnjnrd1e1xP7A_swvO_O4RNp_dMiKYOg";

// Você pode usar NOME ou GID (recomendado).
// - Se SHEET_GID estiver definido, ele tem prioridade.
// - Se não estiver, usa SHEET_NAME (ou cria).
const SHEET_GID = 0;
const SHEET_NAME = "Respostas";
const EXPECTED_HEADERS = [
  "nome responsavel",
  "departamento",
  "gestor",
  "Nome do software / ferramenta",
  "Forma de pagamento",
  "Tipo de licenciamento",
  "Valor",
  "Qual a finalidade principal do uso?",
  "Descreva brevemente em quais processos/tarefas é utilizado",
  "Informe o nível de importância desta ferramenta para a operação da área",
  "Quantas pessoas na sua equipe possuem login/acesso ativo hoje?",
  "Quem são os usuários que utilizam a ferramenta?",
  "Timestamp",
];

function doPost(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet =
      (Number.isFinite(SHEET_GID) ? getSheetByGid_(ss, SHEET_GID) : null) ||
      ss.getSheetByName(SHEET_NAME) ||
      ss.insertSheet(SHEET_NAME);

    safeLog_(ss, {
      level: "info",
      message: "Recebeu POST",
      meta: {
        spreadsheetId: SPREADSHEET_ID,
        sheetId: sheet.getSheetId(),
        sheetName: sheet.getName(),
      },
    });

    ensureHeader_(sheet);

    const payload = parseIncoming_(e);
    safeLog_(ss, {
      level: "info",
      message: "Payload parseado",
      meta: {
        nome_responsavel: Boolean(payload.nome_responsavel),
        Departamento: Boolean(payload.Departamento),
        gestor: Boolean(payload.gestor),
        softwaresLen: (payload.nome_do_software && payload.nome_do_software.length) || 0,
      },
    });
    const rows = buildRows_(payload);

    if (!rows.length) {
      safeLog_(ss, {
        level: "warn",
        message: "Sem softwares para registrar",
        meta: {
          hasNomeResponsavel: Boolean(payload && payload.nome_responsavel),
          softwaresLen: (payload && payload.nome_do_software && payload.nome_do_software.length) || 0,
        },
      });
      return htmlBridge_({
        ok: false,
        error: "Sem softwares para registrar.",
        return_url: payload.return_url || "",
        meta: {
          spreadsheetId: SPREADSHEET_ID,
          sheetId: sheet.getSheetId(),
          sheetName: sheet.getName(),
        },
      });
    }

    writeRowsFixedColumns_(sheet, rows);

    safeLog_(ss, {
      level: "info",
      message: "Gravou linhas com sucesso",
      meta: { inserted: rows.length },
    });
    return htmlBridge_({
      ok: true,
      inserted: rows.length,
      return_url: payload.return_url || "",
      meta: {
        spreadsheetId: SPREADSHEET_ID,
        sheetId: sheet.getSheetId(),
        sheetName: sheet.getName(),
      },
    });
  } catch (err) {
    // Tenta logar o erro na própria planilha (se possível)
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      safeLog_(ss, { level: "error", message: "Erro no doPost", meta: { error: String(err) } });
    } catch (e2) {}
    return htmlBridge_({
      ok: false,
      error: String(err && err.message ? err.message : err),
      return_url: "",
      meta: { spreadsheetId: SPREADSHEET_ID },
    });
  }
}

function doGet() {
  return htmlBridge_({
    ok: true,
    message: "Endpoint ativo. Envie POST com os campos do formulário (suporta arrays).",
    meta: { spreadsheetId: SPREADSHEET_ID, sheetGid: SHEET_GID, sheetName: SHEET_NAME },
  });
}

function getSheetByGid_(ss, gid) {
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === gid) return sheets[i];
  }
  // Fallback útil: muitas planilhas usam gid=0 na URL, mas nem sempre existe sheetId 0.
  // Se não encontrar e for gid=0, usa a primeira aba.
  if (gid === 0 && sheets.length) return sheets[0];
  return null;
}

function ensureHeader_(sheet) {
  // Se a planilha já tem dados (ex.: Typeform), não sobrescreve o cabeçalho.
  if (sheet.getLastRow() >= 1) return;

  sheet.getRange(1, 1, 1, EXPECTED_HEADERS.length).setValues([EXPECTED_HEADERS]);
  sheet.setFrozenRows(1);
}

function writeRowsFixedColumns_(sheet, rows) {
  if (!rows || !rows.length) return;
  // Sempre grava de A até M na ordem do EXPECTED_HEADERS.
  // Isso evita deslocamentos quando a linha de cabeçalho tem colunas vazias/mescladas.
  sheet
    .getRange(sheet.getLastRow() + 1, 1, rows.length, EXPECTED_HEADERS.length)
    .setValues(rows);
}

function safeLog_(ss, entry) {
  try {
    const sheetName = "WEBAPP_LOG";
    const logSheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    if (logSheet.getLastRow() === 0) {
      logSheet.getRange(1, 1, 1, 4).setValues([["Timestamp", "Level", "Message", "Meta(JSON)"]]);
      logSheet.setFrozenRows(1);
    }
    const ts = new Date();
    const level = (entry && entry.level) || "info";
    const message = (entry && entry.message) || "";
    const meta = entry && entry.meta ? JSON.stringify(entry.meta) : "";
    logSheet.appendRow([ts, level, message, meta]);
  } catch (e) {
    // Se não conseguir logar, ignora para não quebrar o fluxo.
  }
}

function htmlBridge_(obj) {
  const payload = JSON.stringify(obj || {});
  // Tenta redirecionar de volta, se o formulário enviar return_url (http/https).
  // (Se estiver em file://, não dá para voltar automaticamente.)
  const returnUrl = (obj && obj.return_url) ? String(obj.return_url) : "";
  const canRedirect = /^https?:\/\//i.test(returnUrl);
  const redirectJs = canRedirect
    ? `setTimeout(function(){ try { window.location.href = ${JSON.stringify(returnUrl)} + ((${payload}).ok ? "?submitted=1" : "?submitted=0"); } catch(e){} }, 900);`
    : "";
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${obj && obj.ok ? "Enviado com sucesso" : "Falha ao enviar"}</title>
  </head>
  <body>
    <script>
      (function(){
        var data = ${payload};
        ${redirectJs}
      })();
    </script>
    <div style="min-height:100vh;background:#E6E6E6;padding:28px 16px">
      <div style="max-width:880px;margin:0 auto;background:#fff;border:1px solid rgba(0,0,0,0.06);border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,0.08);overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
        <div style="padding:18px 18px;background:#2F3D3C;color:#fff">
          <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.85">Grupo Moas</div>
          <div style="font-size:18px;font-weight:800;margin-top:4px">Inventário de Software</div>
        </div>
        <div style="padding:18px 18px">
      <h2 style="margin:0 0 10px 0;font-size:18px;color:#17303C">${obj && obj.ok ? "Enviado com sucesso" : "Falha ao enviar"}</h2>
          <p style="margin:0 0 14px 0;color:#2F3D3C">${obj && obj.ok ? "Recebemos suas informações e registramos na planilha." : "Recebemos sua tentativa, mas não conseguimos registrar na planilha."}</p>
          ${canRedirect ? `<p style="margin:0 0 14px 0;color:#2F3D3C;opacity:.8">Voltando ao formulário…</p>` : `<p style="margin:0 0 14px 0;color:#2F3D3C;opacity:.8">Você pode fechar esta aba e voltar para o formulário.</p>`}
          <details style="border:1px solid rgba(23,48,60,0.12);border-radius:14px;padding:12px 12px;background:rgba(184,196,186,0.18)">
            <summary style="cursor:pointer;color:#17303C;font-weight:700">Detalhes técnicos</summary>
            <pre style="white-space:pre-wrap;margin:10px 0 0 0;padding:12px;border:1px solid rgba(0,0,0,0.10);border-radius:10px;background:#fafafa;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${payload}</pre>
          </details>
        </div>
      </div>
    </div>
  </body></html>`;
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function parseIncoming_(e) {
  // Suporta:
  // - JSON (fetch com body JSON)
  // - application/x-www-form-urlencoded (form action POST)
  const ct = (e && e.postData && e.postData.type) ? String(e.postData.type) : "";

  if (ct.indexOf("application/json") !== -1 && e.postData && e.postData.contents) {
    const obj = JSON.parse(e.postData.contents);
    return obj && typeof obj === "object" ? obj : {};
  }

  // Form-encoded: Apps Script expõe e.parameter (string) e e.parameters (arrays)
  const p = (e && e.parameters) ? e.parameters : {};
  const s = (e && e.parameter) ? e.parameter : {};

  return {
    return_url: first_(p, s, "return_url"),
    nome_responsavel: first_(p, s, "nome_responsavel"),
    Departamento: first_(p, s, "Departamento"),
    gestor: first_(p, s, "gestor"),

    // Arrays (quando seu form usa name="campo[]")
    nome_do_software: array_(p, s, "nome_do_software[]", "nome_do_software"),
    pagamento: array_(p, s, "pagamento[]", "pagamento"),
    outro_pagamento: array_(p, s, "outro_pagamento[]", "outro_pagamento"),
    finalidade_do_uso: array_(p, s, "finalidade_do_uso[]", "finalidade_do_uso"),
    utilizacao_do_software: array_(p, s, "utilizacao_do_software[]", "utilizacao_do_software"),
    nivel_importancia: array_(p, s, "nivel_importancia[]", "nivel_importancia"),
    numero_logins_ativos: array_(p, s, "numero_logins_ativos[]", "numero_logins_ativos"),
    usuarios: array_(p, s, "usuarios[]", "usuarios"),
    licenciamento: array_(p, s, "licenciamento[]", "licenciamento"),
    valor: array_(p, s, "valor[]", "valor"),
  };
}

function buildRows_(payload) {
  const nomeResponsavel = String(payload.nome_responsavel || "").trim();
  const departamento = departamentoLabel_(String(payload.Departamento || "").trim());
  const gestor = String(payload.gestor || "").trim();

  const softwares = Array.isArray(payload.nome_do_software) ? payload.nome_do_software : [];
  const pagamentos = Array.isArray(payload.pagamento) ? payload.pagamento : [];
  const outrosPagamentos = Array.isArray(payload.outro_pagamento) ? payload.outro_pagamento : [];
  const finalidades = Array.isArray(payload.finalidade_do_uso) ? payload.finalidade_do_uso : [];
  const utilizacoes = Array.isArray(payload.utilizacao_do_software) ? payload.utilizacao_do_software : [];
  const importancias = Array.isArray(payload.nivel_importancia) ? payload.nivel_importancia : [];
  const loginsArr = Array.isArray(payload.numero_logins_ativos) ? payload.numero_logins_ativos : [];
  const usuariosArr = Array.isArray(payload.usuarios) ? payload.usuarios : [];
  const lics = Array.isArray(payload.licenciamento) ? payload.licenciamento : [];
  const valores = Array.isArray(payload.valor) ? payload.valor : [];

  const n = Math.max(
    softwares.length,
    pagamentos.length,
    outrosPagamentos.length,
    finalidades.length,
    utilizacoes.length,
    importancias.length,
    loginsArr.length,
    usuariosArr.length,
    lics.length,
    valores.length,
  );
  const timestamp = new Date();

  const rows = [];
  for (let i = 0; i < n; i++) {
    const software = String(softwares[i] || "").trim();
    if (!software) continue;

    const pagamentoCode = String(pagamentos[i] || "").trim();
    const outroPagamento = String(outrosPagamentos[i] || "").trim();
    const pagamento = pagamentoLabel_(pagamentoCode, outroPagamento);

    const licCode = String(lics[i] || "").trim();
    const tipoCobranca = licLabel_(licCode);

    const valorRaw = String(valores[i] || "").trim();

    rows.push([
      nomeResponsavel,
      departamento,
      gestor,
      software,
      pagamento,
      tipoCobranca,
      coerceNumber_(valorRaw),
      String(finalidades[i] || "").trim(),
      String(utilizacoes[i] || "").trim(),
      String(importancias[i] || "").trim(),
      String(loginsArr[i] || "").trim(),
      String(usuariosArr[i] || "").trim(),
      timestamp,
    ]);
  }

  return rows;
}

function departamentoLabel_(value) {
  const map = {
    "1": "Business Intelligence",
    "2": "CoE",
    "3": "Comercial ADM",
    "4": "Compras",
    "5": "Compras Internacionais",
    "6": "Contabilidade / Fiscal",
    "7": "Cozinha",
    "8": "Customer Success (CS)",
    "9": "Diretoria",
    "10": "Estratégia e Projetos",
    "11": "Expedição",
    "12": "Facilities",
    "13": "Faturamento",
    "14": "Financeiro",
    "15": "Importação",
    "16": "Inovação",
    "17": "Jardinagem",
    "18": "Logística",
    "19": "Marketing",
    "20": "Marketing Digital",
    "21": "Qualidade",
    "22": "Recepção",
    "23": "Recursos Humanos (RH)",
    "24": "Secretaria",
    "25": "Supervisão de Produção / Qualidade",
    "26": "Tecnologia da Informação (TI)",
    "27": "Vendas Buba",
    "28": "Vendas Mart",
  };
  return map[value] || value;
}

function pagamentoLabel_(code, outroPagamento) {
  switch (code) {
    case "cartao_corporativo":
      return "Cartão de Crédito Corporativo";
    case "boleto":
      return "Boleto Bancário";
    case "pix_transferencia":
      return "Pix/Transferência";
    case "outro":
      return outroPagamento ? `Outro - ${outroPagamento}` : "Outro";
    default:
      return code || "";
  }
}

function licLabel_(code) {
  switch (code) {
    case "gratuito":
      return "Gratuito";
    case "mensal":
      return "Assinatura Mensal";
    case "anual":
      return "Assinatura Anual";
    case "unica":
      return "Compra Única";
    default:
      return code || "";
  }
}

function coerceNumber_(value) {
  if (value === null || value === undefined) return "";
  const s = String(value).trim();
  if (!s) return "";
  // aceita "1.234,56" ou "1234.56" ou "1234,56"
  const normalized = s.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : s;
}

function array_(p, s, keyWithBrackets, keyNoBrackets) {
  if (p && p[keyWithBrackets]) return asArray_(p[keyWithBrackets]);
  if (p && p[keyNoBrackets]) return asArray_(p[keyNoBrackets]);
  if (s && s[keyWithBrackets]) return [String(s[keyWithBrackets])];
  if (s && s[keyNoBrackets]) return [String(s[keyNoBrackets])];
  return [];
}

function first_(p, s, key) {
  if (p && p[key] && p[key].length) return String(p[key][0]);
  if (s && s[key] !== undefined) return String(s[key]);
  return "";
}

function asArray_(v) {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (v === undefined || v === null) return [];
  return [String(v)];
}

function json_(status, obj) {
  const out = ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);

  // Apps Script não permite setar status HTTP diretamente em ContentService;
  // retornamos o payload com ok/error e você usa isso no cliente.
  return out;
}

