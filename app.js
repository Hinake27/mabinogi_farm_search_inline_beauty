(function () {
  const db = window.FARM_DB;

  if (!db || !Array.isArray(db.sheets) || !db.sheets.length) {
    document.getElementById("resultGrid").innerHTML =
      '<div class="empty-card"><div><strong>資料庫尚未建立</strong><span>請先執行 scripts/build-farm-db.py 產生 data/farm-db.js。</span></div></div>';
    return;
  }

  const PAGE_SIZE = 18;
  const FEATURED_SHEETS = db.featuredSheets?.length
    ? db.featuredSheets
    : db.sheets.slice(0, 4).map((sheet) => sheet.name);
  const MODE_OPTIONS = [
    { value: "name", label: "名稱搜尋" },
    { value: "ability", label: "能力篩選" },
  ];
  const SORT_OPTIONS = [
    { value: "power", label: "能力總值高到低" },
    { value: "name", label: "名稱 A → Z" },
    { value: "source", label: "依台服 / 外服來源" },
  ];
  const META_PREFERRED = ["台服", "外服", "備註1", "備註2"];

  const state = {
    activeSheetName: FEATURED_SHEETS[0] || db.sheets[0].name,
    mode: "name",
    query: "",
    sort: "power",
    logic: "AND",
    selectedAbilities: new Set(),
    page: 1,
  };

  const elements = {
    heroStats: document.getElementById("heroStats"),
    modeToggle: document.getElementById("modeToggle"),
    sheetSelect: document.getElementById("sheetSelect"),
    sheetPills: document.getElementById("sheetPills"),
    searchInput: document.getElementById("searchInput"),
    sortSelect: document.getElementById("sortSelect"),
    logicSelect: document.getElementById("logicSelect"),
    logicField: document.getElementById("logicField"),
    abilityField: document.getElementById("abilityField"),
    abilityChips: document.getElementById("abilityChips"),
    clearAbilityBtn: document.getElementById("clearAbilityBtn"),
    activeFilters: document.getElementById("activeFilters"),
    resetBtn: document.getElementById("resetBtn"),
    resultHeading: document.getElementById("resultHeading"),
    resultSubheading: document.getElementById("resultSubheading"),
    summaryStrip: document.getElementById("summaryStrip"),
    resultGrid: document.getElementById("resultGrid"),
    paginationBar: document.getElementById("paginationBar"),
    tableWrap: document.getElementById("tableWrap"),
    tableMeta: document.getElementById("tableMeta"),
    footerNote: document.getElementById("footerNote"),
    searchField: document.getElementById("searchField"),
  };

  const sheetMap = new Map(db.sheets.map((sheet) => [sheet.name, hydrateSheet(sheet)]));

  init();

  function hydrateSheet(sheet) {
    const rows = sheet.rows.map((row) => {
      const text = [
        row.name,
        ...Object.values(row.values || {}),
        ...Object.values(row.meta || {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const power = Object.values(row.stats || {}).reduce(
        (sum, value) => sum + (typeof value === "number" ? value : 0),
        0
      );

      return {
        ...row,
        searchText: text,
        power,
      };
    });

    return {
      ...sheet,
      rows,
    };
  }

  function init() {
    renderHeroStats();
    buildModeToggle();
    buildSheetSelector();
    buildSortSelector();
    bindEvents();
    render();
  }

  function bindEvents() {
    elements.sheetSelect.addEventListener("change", (event) => {
      state.activeSheetName = event.target.value;
      state.page = 1;
      state.selectedAbilities.clear();
      render();
    });

    elements.searchInput.addEventListener("input", (event) => {
      state.query = event.target.value.trim();
      state.page = 1;
      render();
    });

    elements.sortSelect.addEventListener("change", (event) => {
      state.sort = event.target.value;
      render();
    });

    elements.logicSelect.addEventListener("change", (event) => {
      state.logic = event.target.value;
      state.page = 1;
      render();
    });

    elements.clearAbilityBtn.addEventListener("click", () => {
      state.selectedAbilities.clear();
      state.page = 1;
      render();
    });

    elements.resetBtn.addEventListener("click", () => {
      state.activeSheetName = FEATURED_SHEETS[0] || db.sheets[0].name;
      state.mode = "name";
      state.query = "";
      state.sort = "power";
      state.logic = "AND";
      state.selectedAbilities.clear();
      state.page = 1;
      elements.searchInput.value = "";
      elements.logicSelect.value = "AND";
      elements.sortSelect.value = "power";
      elements.sheetSelect.value = state.activeSheetName;
      render();
    });
  }

  function render() {
    const sheet = getActiveSheet();
    const filteredRows = getFilteredRows(sheet);
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

    if (state.page > totalPages) {
      state.page = totalPages;
    }

    renderModeToggle();
    renderSheetPills();
    renderAbilityChips(sheet);
    renderActiveFilters(sheet);
    renderSummary(sheet, filteredRows);
    renderResultCards(sheet, filteredRows);
    renderTable(sheet, filteredRows);
    renderPagination(filteredRows.length, totalPages);

    elements.searchField.style.display = state.mode === "name" ? "" : "";
    elements.logicField.style.display = state.mode === "ability" ? "" : "none";
    elements.abilityField.style.display = sheet.abilityFields.length ? "" : "none";
  }

  function getActiveSheet() {
    return sheetMap.get(state.activeSheetName) || sheetMap.values().next().value;
  }

  function buildModeToggle() {
    elements.modeToggle.innerHTML = MODE_OPTIONS.map(
      (mode) =>
        `<button class="mode-btn" data-mode="${escapeHtml(mode.value)}" type="button">${escapeHtml(
          mode.label
        )}</button>`
    ).join("");

    elements.modeToggle.addEventListener("click", (event) => {
      const button = event.target.closest("[data-mode]");
      if (!button) return;
      state.mode = button.dataset.mode;
      state.page = 1;
      render();
    });
  }

  function renderModeToggle() {
    elements.modeToggle.querySelectorAll("[data-mode]").forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === state.mode);
    });
  }

  function buildSheetSelector() {
    elements.sheetSelect.innerHTML = db.sheets
      .map(
        (sheet) =>
          `<option value="${escapeAttr(sheet.name)}">${escapeHtml(sheet.name)} (${sheet.rows.length})</option>`
      )
      .join("");
    elements.sheetSelect.value = state.activeSheetName;
  }

  function renderSheetPills() {
    elements.sheetSelect.value = state.activeSheetName;
    elements.sheetPills.innerHTML = FEATURED_SHEETS.map((sheetName) => {
      const sheet = sheetMap.get(sheetName);
      if (!sheet) return "";
      const active = state.activeSheetName === sheetName ? " active" : "";
      return `<button class="sheet-pill${active}" data-sheet="${escapeAttr(sheetName)}" type="button">${escapeHtml(
        sheetName
      )}</button>`;
    }).join("");

    elements.sheetPills.querySelectorAll("[data-sheet]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeSheetName = button.dataset.sheet;
        state.selectedAbilities.clear();
        state.page = 1;
        render();
      });
    });
  }

  function buildSortSelector() {
    elements.sortSelect.innerHTML = SORT_OPTIONS.map(
      (option) =>
        `<option value="${escapeAttr(option.value)}">${escapeHtml(option.label)}</option>`
    ).join("");
    elements.sortSelect.value = state.sort;
  }

  function renderHeroStats() {
    const totalRows = db.sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0);
    const abilitySheetCount = FEATURED_SHEETS.length;
    const abilityFields = new Set(
      db.sheets.flatMap((sheet) => sheet.abilityFields || [])
    );

    const cards = [
      { value: totalRows.toLocaleString("zh-Hant"), label: "總資料筆數" },
      { value: abilitySheetCount.toLocaleString("zh-Hant"), label: "娃娃核心工作表" },
      { value: abilityFields.size.toLocaleString("zh-Hant"), label: "可篩選能力欄位" },
    ];

    elements.heroStats.innerHTML = cards
      .map(
        (card) => `
          <div class="hero-stat">
            <strong>${escapeHtml(card.value)}</strong>
            <span>${escapeHtml(card.label)}</span>
          </div>
        `
      )
      .join("");
  }

  function renderAbilityChips(sheet) {
    const abilities = sheet.abilityFields || [];
    elements.abilityChips.innerHTML = abilities.length
      ? abilities
          .map((ability) => {
            const active = state.selectedAbilities.has(ability) ? " active" : "";
            return `<button class="ability-chip${active}" data-ability="${escapeAttr(
              ability
            )}" type="button">${escapeHtml(ability)}</button>`;
          })
          .join("")
      : '<div class="mini-note">這個工作表沒有穩定的數值能力欄位。</div>';

    elements.abilityChips.querySelectorAll("[data-ability]").forEach((button) => {
      button.addEventListener("click", () => {
        const ability = button.dataset.ability;
        if (state.selectedAbilities.has(ability)) {
          state.selectedAbilities.delete(ability);
        } else {
          state.selectedAbilities.add(ability);
        }
        state.mode = "ability";
        state.page = 1;
        render();
      });
    });
  }

  function renderActiveFilters(sheet) {
    const chips = [];
    chips.push(`<span class="tag">工作表：${escapeHtml(sheet.name)}</span>`);

    if (state.query) {
      chips.push(`<span class="tag">關鍵字：${escapeHtml(state.query)}</span>`);
    }

    if (state.selectedAbilities.size) {
      chips.push(
        `<span class="tag">能力：${escapeHtml(Array.from(state.selectedAbilities).join("、"))}</span>`
      );
      chips.push(
        `<span class="tag">條件：${escapeHtml(state.logic === "AND" ? "全部都要" : "符合其一")}</span>`
      );
    }

    chips.push(
      `<span class="tag">排序：${escapeHtml(
        SORT_OPTIONS.find((option) => option.value === state.sort)?.label || ""
      )}</span>`
    );

    elements.activeFilters.innerHTML = chips.join("");
  }

  function getFilteredRows(sheet) {
    const tokens = state.query
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);

    const rows = sheet.rows.filter((row) => {
      const nameMatch =
        !tokens.length || tokens.every((token) => row.searchText.includes(token));

      if (state.mode === "name") {
        return nameMatch;
      }

      const abilityMatches = Array.from(state.selectedAbilities).map((ability) =>
        isMeaningful(row.stats?.[ability])
      );

      if (!state.selectedAbilities.size) {
        return nameMatch;
      }

      const abilityPass =
        state.logic === "AND"
          ? abilityMatches.every(Boolean)
          : abilityMatches.some(Boolean);

      return nameMatch && abilityPass;
    });

    return rows.sort(sortRows);
  }

  function sortRows(a, b) {
    if (state.sort === "name") {
      return a.name.localeCompare(b.name, "zh-Hant");
    }

    if (state.sort === "source") {
      const aSource = String(a.meta?.["台服"] || a.meta?.["外服"] || "");
      const bSource = String(b.meta?.["台服"] || b.meta?.["外服"] || "");
      return aSource.localeCompare(bSource, "zh-Hant");
    }

    if (b.power !== a.power) {
      return b.power - a.power;
    }

    return a.name.localeCompare(b.name, "zh-Hant");
  }

  function renderSummary(sheet, filteredRows) {
    const pageRows = getPageRows(filteredRows);
    const selectedLabel = state.selectedAbilities.size
      ? `${state.selectedAbilities.size} 項能力條件`
      : "未指定能力條件";

    elements.resultHeading.textContent = `${sheet.name} 圖鑑`;
    elements.resultSubheading.textContent = `共找到 ${filteredRows.length.toLocaleString(
      "zh-Hant"
    )} 筆資料，目前顯示 ${pageRows.length.toLocaleString("zh-Hant")} 筆。`;

    const summary = [
      { label: "筆數", value: filteredRows.length.toLocaleString("zh-Hant") },
      { label: "能力欄位", value: sheet.abilityFields.length.toLocaleString("zh-Hant") },
      { label: "篩選", value: selectedLabel },
    ];

    elements.summaryStrip.innerHTML = summary
      .map(
        (item) =>
          `<span class="tag">${escapeHtml(item.label)}：${escapeHtml(item.value)}</span>`
      )
      .join("");
  }

  function renderResultCards(sheet, filteredRows) {
    const pageRows = getPageRows(filteredRows);

    if (!pageRows.length) {
      elements.resultGrid.innerHTML =
        '<div class="empty-card"><div><strong>沒有符合條件的結果</strong><span>可以換工作表、移除能力條件，或改用名稱關鍵字重新搜尋。</span></div></div>';
      return;
    }

    elements.resultGrid.innerHTML = pageRows
      .map((row) => renderCard(sheet, row))
      .join("");

    elements.resultGrid.querySelectorAll("[data-stat-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        const ability = button.dataset.statFilter;
        state.mode = "ability";
        state.selectedAbilities.add(ability);
        state.page = 1;
        render();
      });
    });
  }

  function renderCard(sheet, row) {
    const stats = Object.entries(row.stats || {})
      .filter(([, value]) => isMeaningful(value))
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 6);
    const meta = META_PREFERRED.map((key) => [key, row.meta?.[key]])
      .filter(([, value]) => value)
      .slice(0, 2)
      .map(([key, value]) => `${key}：${value}`);
    const notes = Object.values(row.meta || {})
      .filter(Boolean)
      .map(String)
      .find((value) => value.length > 8);

    return `
      <article class="result-card">
        <header>
          <div>
            <h3>${escapeHtml(row.name || "未命名")}</h3>
            <div class="card-meta">${escapeHtml(meta.join(" / ") || "無來源補充")}</div>
          </div>
          <span class="sheet-badge">${escapeHtml(sheet.name)}</span>
        </header>
        <div class="card-stats">
          ${stats.length ? stats.map(([key, value]) => renderStatChip(key, value)).join("") : '<span class="mini-note">這筆資料沒有可顯示的能力值。</span>'}
        </div>
        <div class="card-note">${escapeHtml(notes || "沒有額外備註。")}</div>
      </article>
    `;
  }

  function renderStatChip(key, value) {
    return `<button class="stat-chip" data-stat-filter="${escapeAttr(key)}" type="button">${escapeHtml(
      key
    )}<strong>${escapeHtml(formatValue(value))}</strong></button>`;
  }

  function renderTable(sheet, filteredRows) {
    const pageRows = getPageRows(filteredRows);
    const columns = buildVisibleColumns(sheet, pageRows);

    elements.tableMeta.textContent = `欄位數 ${columns.length} / 本頁資料 ${
      pageRows.length
    } 筆`;

    if (!pageRows.length) {
      elements.tableWrap.innerHTML =
        '<div class="empty-card"><div><strong>目前沒有可顯示的表格資料</strong><span>請先調整篩選條件。</span></div></div>';
      elements.footerNote.textContent = buildFooterNote(sheet);
      return;
    }

    const head = columns
      .map((column, index) => {
        const className = index === 0 ? "name-cell" : "";
        return `<th class="${className}">${escapeHtml(column)}</th>`;
      })
      .join("");
    const body = pageRows
      .map((row) => {
        const cells = columns
          .map((column, index) => {
            const value = getRowValue(row, column);
            const cellClass = getTableCellClass(sheet, column, index);
            const content =
              sheet.abilityFields.includes(column) && isMeaningful(value)
                ? renderStatChip(column, value)
                : renderPlainCell(value);
            return `<td class="${cellClass}">${content}</td>`;
          })
          .join("");

        return `<tr>${cells}</tr>`;
      })
      .join("");

    elements.tableWrap.innerHTML = `
      <table>
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    `;

    elements.tableWrap.querySelectorAll("[data-stat-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        state.mode = "ability";
        state.selectedAbilities.add(button.dataset.statFilter);
        state.page = 1;
        render();
      });
    });

    elements.footerNote.textContent = buildFooterNote(sheet);
  }

  function buildVisibleColumns(sheet, pageRows) {
    const columns = ["名稱", ...sheet.abilityFields];
    const metaColumns = sheet.metaFields.filter((field) =>
      pageRows.some((row) => isMeaningful(row.meta?.[field]))
    );
    return unique([...columns, ...metaColumns.slice(0, 4)]);
  }

  function getTableCellClass(sheet, column, index) {
    if (index === 0) return "name-cell";
    if (sheet.metaFields.includes(column)) return "meta-cell";
    return "";
  }

  function renderPlainCell(value) {
    if (!isMeaningful(value)) {
      return '<span class="empty-value">-</span>';
    }

    return escapeHtml(formatValue(value));
  }

  function buildFooterNote(sheet) {
    return `資料庫建立時間：${db.generatedAt}，目前工作表「${sheet.name}」共 ${
      sheet.rows.length
    } 筆。若 Excel 更新，可重新執行 scripts/build-farm-db.py。`;
  }

  function getRowValue(row, column) {
    if (column === "名稱") return row.name;
    if (column in (row.stats || {})) return row.stats[column];
    if (column in (row.meta || {})) return row.meta[column];
    if (column in (row.values || {})) return row.values[column];
    return "";
  }

  function renderPagination(totalItems, totalPages) {
    if (!totalItems) {
      elements.paginationBar.innerHTML = "";
      return;
    }

    const current = state.page;
    const start = (current - 1) * PAGE_SIZE + 1;
    const end = Math.min(totalItems, current * PAGE_SIZE);

    elements.paginationBar.innerHTML = `
      <span class="tag">${start}-${end} / ${totalItems}</span>
      <button class="page-btn" type="button" data-page="prev" ${current <= 1 ? "disabled" : ""}>上一頁</button>
      <button class="page-btn" type="button" data-page="next" ${current >= totalPages ? "disabled" : ""}>下一頁</button>
    `;

    elements.paginationBar.querySelectorAll("[data-page]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.page === "prev" && state.page > 1) {
          state.page -= 1;
        }

        if (button.dataset.page === "next" && state.page < totalPages) {
          state.page += 1;
        }

        render();
      });
    });
  }

  function getPageRows(rows) {
    const start = (state.page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }

  function unique(values) {
    return Array.from(new Set(values));
  }

  function isMeaningful(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === "number") return value !== 0;
    return String(value).trim() !== "";
  }

  function formatValue(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "number") {
      return Number.isInteger(value) ? String(value) : String(value);
    }
    return String(value);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll('"', "&quot;");
  }
})();
