# 瑪奇農場娃娃能力值查詢

這是一個靜態網頁工具，用來查詢瑪奇農場娃娃、模型、小屋、女神像等資料的能力值與來源。資料來源是 Excel 檔，透過 Python 腳本轉成前端可直接讀取的 JS 資料庫。

## 功能

- 名稱與來源關鍵字搜尋
- 能力值條件篩選
- 多能力條件支援 AND / OR
- 工作表切換
- 能力總值、名稱、來源排序
- 結果卡片快速瀏覽
- 完整資料表對照 Excel 欄位

## 檔案結構

```text
.
├── index.html                         # 主畫面與樣式
├── app.js                             # 查詢、篩選、排序、分頁互動
├── data/
│   └── farm-db.js                     # 由 Excel 產出的前端 JS 資料庫
├── scripts/
│   └── build-farm-db.py               # Excel 轉 farm-db.js 的建置腳本
└── 瑪奇農場模型(ver.241123).xlsx       # 原始資料
```

## 使用方式

直接用瀏覽器開啟 `index.html` 即可使用，不需要啟動伺服器。

建議入口：

```text
index.html
```

## 更新資料庫

如果修改了 `瑪奇農場模型(ver.241123).xlsx`，請重新產生 `data/farm-db.js`：

```powershell
python scripts\build-farm-db.py
```

如果系統的 `python` 找不到 `openpyxl`，可改用 Codex 內建 Python 路徑執行：

```powershell
& "C:\Users\Administrator\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" scripts\build-farm-db.py
```

## 資料流程

1. 編輯或更新 Excel 原始資料。
2. 執行 `scripts/build-farm-db.py`。
3. 腳本讀取所有工作表並輸出 `data/farm-db.js`。
4. `index.html` 載入 `data/farm-db.js`。
5. `app.js` 負責搜尋、篩選、排序、分頁與畫面渲染。

## 主要工作表

目前介面會優先顯示這些娃娃能力相關工作表：

- `素質`
- `素質(額外)`
- `素質(小屋)`
- `素質(女神像)`

其他工作表也會被寫入資料庫，可透過工作表下拉選單切換。

## 開發備註

- 這是純前端靜態工具，沒有後端服務。
- `data/farm-db.js` 是產物檔，可以重新產生。
- `scripts/build-farm-db.py` 會自動判斷數值型欄位作為能力欄位。
- 日期欄位會轉成字串，避免 JSON 產生失敗。
- 若 Excel 欄位名稱或工作表名稱大幅變動，可能需要同步調整 `app.js` 的顯示邏輯。

## 驗證

可用以下方式做基本檢查：

```powershell
node --check app.js
python -m py_compile scripts\build-farm-db.py
python scripts\build-farm-db.py
```
