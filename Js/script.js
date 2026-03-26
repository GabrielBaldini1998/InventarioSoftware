(() => {
    function onReady(fn) {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", fn);
        } else {
            fn();
        }
    }

    onReady(() => {
        // Cole aqui a URL do seu Web App do Apps Script (termina com /exec)
        const APPS_SCRIPT_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbx69MvHn2Xw_x3dYdHnCTL_BHNUQjWy56BQPDQ34TzLc5A8pamqeQ4klQzRcWjAjwnZ/exec";

        // --- Softwares dinâmicos (form completo por software) ---
        const softwaresList = document.getElementById("softwares-list");
        const addSoftwareBtn = document.getElementById("add-software");

        const form = document.getElementById("inventario-form");
        const formStatus = document.getElementById("form-status");
        const iframeTarget = document.getElementById("apps-script-target");

        // Caso o HTML mude e esses elementos não existam, não quebra a página.
        if (!softwaresList || !addSoftwareBtn) return;

        const PAYMENT_OPTIONS = [
            { value: "", label: "Forma de pagamento (selecionar)" },
            { value: "cartao_corporativo", label: "Cartão de Crédito Corporativo" },
            { value: "boleto", label: "Boleto Bancário" },
            { value: "pix_transferencia", label: "Pix/Transferência" },
            { value: "gratuito", label: "Gratuito (Free to use)" },
            { value: "outro", label: "Outro" },
        ];

        // Regras simples (pode expandir) para sugerir forma de pagamento ao digitar
        const PAYMENT_RULES = [
            { match: /free|gratuit|open\s?source|oss|community/i, payment: "gratuito" },
            {
                match:
                    /google|workspace|g\s?suite|microsoft|office|365|adobe|autodesk|salesforce|hubspot|notion|slack|jira|atlassian|zoom/i,
                payment: "cartao_corporativo",
            },
            { match: /nf|nota\s?fiscal|fatura|invoice|boleto/i, payment: "boleto" },
            { match: /pix|transfer/i, payment: "pix_transferencia" },
        ];

        function inferPaymentFromSoftwareName(name) {
            const trimmed = (name || "").trim();
            if (!trimmed) return "";
            const rule = PAYMENT_RULES.find((r) => r.match.test(trimmed));
            return rule ? rule.payment : "";
        }

        function buildPaymentSelect(initialValue = "") {
            const select = document.createElement("select");
            select.name = "pagamento[]";
            select.required = true;
            PAYMENT_OPTIONS.forEach((opt, index) => {
                const option = document.createElement("option");
                option.value = opt.value;
                option.textContent = opt.label;
                if (index === 0) option.disabled = true;
                if (opt.value === initialValue) option.selected = true;
                select.appendChild(option);
            });
            if (!initialValue) select.selectedIndex = 0;
            return select;
        }

        const LIC_OPTIONS = [
            { value: "", label: "Tipo (mensal/anual/única)" },
            { value: "mensal", label: "Mensal" },
            { value: "anual", label: "Anual" },
            { value: "unica", label: "Compra única" },
        ];

        function buildLicSelect(initialValue = "") {
            const select = document.createElement("select");
            select.name = "licenciamento[]";
            select.required = true;
            LIC_OPTIONS.forEach((opt, index) => {
                const option = document.createElement("option");
                option.value = opt.value;
                option.textContent = opt.label;
                if (index === 0) option.disabled = true;
                if (opt.value === initialValue) option.selected = true;
                select.appendChild(option);
            });
            if (!initialValue) select.selectedIndex = 0;
            return select;
        }

        function updateOutroPagamentoVisibilityForCard(cardEl) {
            const paymentSelect = cardEl.querySelector('select[name="pagamento[]"]');
            const outroField = cardEl.querySelector('[data-outro-pagamento-field="true"]');
            const outroInput = cardEl.querySelector('input[name="outro_pagamento[]"]');
            if (!paymentSelect || !outroField || !outroInput) return;

            const show = paymentSelect.value === "outro";
            outroField.style.display = show ? "" : "none";
            outroInput.required = show;
            if (!show) outroInput.value = "";
        }

        function updateValorVisibilityForCard(cardEl) {
            const licSelect = cardEl.querySelector('select[name="licenciamento[]"]');
            const valorInput = cardEl.querySelector('input[name="valor[]"]');
            const valorField = cardEl.querySelector('[data-valor-field="true"]');
            if (!licSelect || !valorInput) return;

            const v = licSelect.value;
            const show = v === "mensal" || v === "anual" || v === "unica";
            valorInput.style.display = show ? "" : "none";
            if (valorField) valorField.style.display = show ? "" : "none";
            valorInput.required = show;
            if (!show) valorInput.value = "";
            if (v === "mensal") valorInput.placeholder = "Valor mensal";
            if (v === "anual") valorInput.placeholder = "Valor anual";
            if (v === "unica") valorInput.placeholder = "Valor (compra única)";
        }

        function renumberSoftwareCards() {
            const cards = Array.from(softwaresList.querySelectorAll("[data-software-card='true']"));
            cards.forEach((card, idx) => {
                const title = card.querySelector("[data-software-title='true']");
                if (title) title.textContent = `Software ${idx + 1}`;
            });
        }

        function addSoftwareCard() {
            const uid = Math.random().toString(36).slice(2);

            const card = document.createElement("div");
            card.className = "software-card";
            card.setAttribute("data-software-card", "true");

            const header = document.createElement("div");
            header.className = "software-card-header";

            const h = document.createElement("div");
            h.className = "software-card-title";
            h.setAttribute("data-software-title", "true");
            h.textContent = "Software";

            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "remove-software";
            removeBtn.title = "Remover software";
            removeBtn.textContent = "×";
            removeBtn.addEventListener("click", () => {
                card.remove();
                if (softwaresList.children.length === 0) addSoftwareCard();
                renumberSoftwareCards();
            });

            header.appendChild(h);
            header.appendChild(removeBtn);

            const gridTop = document.createElement("div");
            gridTop.className = "software-grid";

            // Nome
            const nomeLabel = document.createElement("label");
            const nomeId = `software_nome_${uid}`;
            nomeLabel.htmlFor = nomeId;
            nomeLabel.textContent = "Nome do software / ferramenta*";

            const nomeInput = document.createElement("input");
            nomeInput.id = nomeId;
            nomeInput.type = "text";
            nomeInput.name = "nome_do_software[]";
            nomeInput.placeholder = "Nome do software / ferramenta";
            nomeInput.required = true;

            // Pagamento
            const pagamentoSelect = buildPaymentSelect("");
            const pagamentoId = `software_pagamento_${uid}`;
            pagamentoSelect.id = pagamentoId;
            const pagamentoLabel = document.createElement("label");
            pagamentoLabel.htmlFor = pagamentoId;
            pagamentoLabel.textContent = "Forma de pagamento*";

            // Lic + Valor
            const licSelect = buildLicSelect("");
            const licId = `software_lic_${uid}`;
            licSelect.id = licId;
            const licLabel = document.createElement("label");
            licLabel.htmlFor = licId;
            licLabel.textContent = "Tipo de cobrança*";

            const valorInput = document.createElement("input");
            valorInput.type = "number";
            valorInput.name = "valor[]";
            valorInput.placeholder = "Valor";
            valorInput.inputMode = "decimal";
            valorInput.style.display = "none";
            valorInput.required = false;
            const valorId = `software_valor_${uid}`;
            valorInput.id = valorId;
            const valorLabel = document.createElement("label");
            valorLabel.htmlFor = valorId;
            valorLabel.textContent = "Valor*";

            // Auto infer pagamento pelo nome (se não tocou manualmente)
            let userTouchedPayment = false;
            pagamentoSelect.addEventListener("change", () => {
                userTouchedPayment = true;
                updateOutroPagamentoVisibilityForCard(card);
            });
            nomeInput.addEventListener("input", () => {
                if (userTouchedPayment) return;
                const inferred = inferPaymentFromSoftwareName(nomeInput.value);
                if (inferred) pagamentoSelect.value = inferred;
                updateOutroPagamentoVisibilityForCard(card);
            });

            licSelect.addEventListener("change", () => updateValorVisibilityForCard(card));

            const nomeField = document.createElement("div");
            nomeField.className = "field";
            nomeField.appendChild(nomeLabel);
            nomeField.appendChild(nomeInput);

            const pagamentoField = document.createElement("div");
            pagamentoField.className = "field";
            pagamentoField.appendChild(pagamentoLabel);
            pagamentoField.appendChild(pagamentoSelect);

            const licField = document.createElement("div");
            licField.className = "field";
            licField.appendChild(licLabel);
            licField.appendChild(licSelect);

            const valorField = document.createElement("div");
            valorField.className = "field";
            valorField.setAttribute("data-valor-field", "true");
            valorField.appendChild(valorLabel);
            valorField.appendChild(valorInput);

            gridTop.appendChild(nomeField);
            gridTop.appendChild(pagamentoField);
            gridTop.appendChild(licField);
            gridTop.appendChild(valorField);

            // Campos do software (finalidade/uso/importância/logins/usuários)
            const fields = document.createElement("div");
            fields.className = "software-fields";

            const fFinalidade = document.createElement("div");
            fFinalidade.className = "field";
            const finalidadeId = `finalidade_${uid}`;
            fFinalidade.innerHTML = `
              <label for="${finalidadeId}">Qual a finalidade principal do uso?*</label>
              <input id="${finalidadeId}" type="text" name="finalidade_do_uso[]" placeholder="Ex.: Gestão de projetos, comunicação interna, BI..." required>
            `;

            const fUso = document.createElement("div");
            fUso.className = "field";
            const usoId = `uso_${uid}`;
            fUso.innerHTML = `
              <label for="${usoId}">Descreva brevemente em quais processos/tarefas é utilizado*</label>
              <textarea id="${usoId}" name="utilizacao_do_software[]" placeholder="Ex.: Planejamento de sprints, controle de demandas, relatórios..." required></textarea>
            `;

            // Importância (1-5) + hidden input array
            const importanceName = `nivel_importancia_${uid}`;
            const hiddenImportance = document.createElement("input");
            hiddenImportance.type = "hidden";
            hiddenImportance.name = "nivel_importancia[]";
            hiddenImportance.required = true;

            const rating = document.createElement("div");
            rating.className = "rating-group";
            rating.innerHTML = `
              <label>Informe o nível de importância desta ferramenta para a operação da área*</label>
              <p><small>1 - Baixa, 2 - Média, 3 - Alta, 4 - Crítica, 5 - Indispensável</small></p>
              <div class="rating-options">
                ${[1,2,3,4,5].map((n) => {
                    const id = `imp_${uid}_${n}`;
                    return `<input type="radio" name="${importanceName}" id="${id}" value="${n}"><label for="${id}">${n}</label>`;
                }).join("")}
              </div>
            `;
            rating.addEventListener("change", () => {
                const checked = rating.querySelector(`input[name="${importanceName}"]:checked`);
                hiddenImportance.value = checked ? checked.value : "";
            });

            const fLogins = document.createElement("div");
            fLogins.className = "field";
            const loginsId = `logins_${uid}`;
            fLogins.innerHTML = `
              <label for="${loginsId}">Quantas pessoas na sua equipe possuem login/acesso ativo hoje?*</label>
              <input id="${loginsId}" type="number" name="numero_logins_ativos[]" placeholder="Ex.: 10" required>
            `;

            const fUsuarios = document.createElement("div");
            fUsuarios.className = "field";
            const usuariosId = `usuarios_${uid}`;
            fUsuarios.innerHTML = `
              <label for="${usuariosId}">Quem são os usuários que utilizam a ferramenta?*</label>
              <textarea id="${usuariosId}" name="usuarios[]" placeholder="Ex.: Nome, time, função — ou descreva perfis (analistas, coordenadores...)" required></textarea>
            `;

            // Condicional "Outro pagamento" por software
            const outroField = document.createElement("div");
            outroField.className = "field";
            outroField.style.display = "none";
            outroField.setAttribute("data-outro-pagamento-field", "true");
            const outroId = `outro_pagamento_${uid}`;
            outroField.innerHTML = `
              <label for="${outroId}">Descreva o pagamento*</label>
              <input id="${outroId}" type="text" name="outro_pagamento[]" placeholder="Ex.: Reembolso, cartão pessoal, acordo com fornecedor...">
            `;

            fields.appendChild(fFinalidade);
            fields.appendChild(fUso);
            fields.appendChild(hiddenImportance);
            fields.appendChild(rating);
            fields.appendChild(fLogins);
            fields.appendChild(fUsuarios);
            fields.appendChild(outroField);

            card.appendChild(header);
            card.appendChild(gridTop);
            card.appendChild(fields);

            softwaresList.appendChild(card);

            updateValorVisibilityForCard(card);
            updateOutroPagamentoVisibilityForCard(card);
            renumberSoftwareCards();
        }

        addSoftwareBtn.addEventListener("click", () => addSoftwareCard());

        // Inicializa com 1 software completo
        addSoftwareCard();

        // --- Envio para Apps Script (uma linha por software no backend) ---
        function setStatus(message, variant) {
            if (!formStatus) return;
            formStatus.style.display = message ? "" : "none";
            if (variant) formStatus.setAttribute("data-variant", variant);
            else formStatus.removeAttribute("data-variant");
            formStatus.textContent = message || "";
        }

        function validateBasic() {
            if (!form) return false;
            // Usa validação nativa do browser (required etc.)
            if (typeof form.reportValidity === "function") return form.reportValidity();
            return true;
        }

        function ensureAppsScriptUrl() {
            if (!APPS_SCRIPT_WEBAPP_URL || APPS_SCRIPT_WEBAPP_URL.includes("COLE_AQUI")) {
                throw new Error("Configure a URL do Web App do Apps Script em APPS_SCRIPT_WEBAPP_URL.");
            }
        }

        let submitPending = false;
        let submitTimeoutId = null;

        function configureIframeSubmit() {
            if (!form) return;
            ensureAppsScriptUrl();
            form.action = APPS_SCRIPT_WEBAPP_URL;
            form.method = "POST";
            form.target = "apps-script-target";
        }

        if (iframeTarget) {
            iframeTarget.addEventListener("load", () => {
                if (!submitPending) return;
                submitPending = false;
                if (submitTimeoutId) clearTimeout(submitTimeoutId);
                setStatus("Enviado com sucesso.", null);
                if (form) form.reset();
                softwaresList.innerHTML = "";
                addSoftwareCard();
            });
        }

        if (form) {
            form.addEventListener("submit", (ev) => {
                ev.preventDefault();
                setStatus("", null);

                if (!validateBasic()) {
                    return;
                }

                try {
                    configureIframeSubmit();
                    setStatus("Enviando…", null);
                    submitPending = true;
                    if (submitTimeoutId) clearTimeout(submitTimeoutId);
                    submitTimeoutId = setTimeout(() => {
                        if (!submitPending) return;
                        submitPending = false;
                        setStatus(
                            "Não recebemos confirmação do Apps Script. Verifique se o Web App está em Execute as: Me e acesso: Anyone.",
                            "error",
                        );
                    }, 10000);
                    form.submit();
                } catch (err) {
                    setStatus(
                        err && err.message ? err.message : "Não foi possível enviar. Tente novamente.",
                        "error",
                    );
                }
            });
        }
    });
})();

