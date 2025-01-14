// File: client/src/App.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { ClientSideRowModelModule } from "ag-grid-community";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

import { Parser } from "hot-formula-parser";

// For chart creation
import { Bar, Line, Pie } from "react-chartjs-2";

// We'll assume the server runs on http://localhost:4000
const SERVER_URL = "http://localhost:4000";

function App() {
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // 1. State
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  const parser = useRef(new Parser()).current; 
  // stable parser instance

  const [rawData, setRawData] = useState([
    { A: "10", B: "=A1+5" },
    { A: "=B1*2", B: "5" },
    { A: "=SUM(A1:A2)", B: '=TRIM("  HELLO ")' },
  ]);
  const [computedData, setComputedData] = useState([]);
  const [cellStyles, setCellStyles] = useState({});
  const [activeCell, setActiveCell] = useState({
    rowIndex: null,
    colId: null,
    rawValue: "",
    computedValue: "",
    styles: {
      fontWeight: "normal",
      fontStyle: "normal",
      color: "#000000",
      fontSize: "16px",
    },
  });
  const [columnDefs] = useState([
    { field: "A", headerName: "A", editable: true },
    { field: "B", headerName: "B", editable: true },
  ]);

  // Chart creation
  const [chartData, setChartData] = useState(null);
  const [chartType, setChartType] = useState("bar"); 
  // 'bar', 'line', or 'pie'

  // For saving/loading
  const [sheetId, setSheetId] = useState("default");

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // 2. Utility: parseRef, getRawValueForRef, etc.
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  function parseRef(ref) {
    // check for absolute reference ($A$1) vs relative (A1)
    // remove leading '$'
    const cleaned = ref.replace(/\$/g, "");
    const col = cleaned.charCodeAt(0) - "A".charCodeAt(0);
    const row = parseInt(cleaned.slice(1), 10) - 1;
    return [col, row];
  }

  function getRawValueForRef(ref) {
    // handle absolute references like $A$1 => A1
    const cleanedRef = ref.replace(/\$/g, "");
    const match = cleanedRef.match(/^([A-Z])(\d+)$/i);
    if (!match) return null;
    const colLetter = match[1].toUpperCase();
    const rowNum = parseInt(match[2], 10) - 1;
    if (rowNum < 0 || rowNum >= rawData.length) return null;
    return rawData[rowNum]?.[colLetter] || null;
  }

  // data quality
  function trimCellValue(val) {
    return typeof val === "string" ? val.trim() : val;
  }
  function toUpper(val) {
    return typeof val === "string" ? val.toUpperCase() : val;
  }
  function toLower(val) {
    return typeof val === "string" ? val.toLowerCase() : val;
  }

  // Additional math (besides SUM, etc.)
  function productCells(values) {
    return values.reduce((acc, v) => acc * (parseFloat(v) || 1), 1);
  }
  function medianCells(values) {
    const nums = values.map((v) => parseFloat(v) || 0).sort((a, b) => a - b);
    const mid = Math.floor(nums.length / 2);
    if (!nums.length) return 0;
    if (nums.length % 2 !== 0) return nums[mid];
    return (nums[mid - 1] + nums[mid]) / 2;
  }
  function ifFunction(condition, trueVal, falseVal) {
    // naive: condition might be "A1>10"
    // for robust parsing, you'd parse "A1" as a reference. We'll do a quick approach
    try {
      return eval(condition) ? trueVal : falseVal; 
    } catch {
      return "#ERROR";
    }
  }

  // Evaluate a single cell
  const evaluateCell = useCallback(
    (cellRaw) => {
      if (typeof cellRaw !== "string" || !cellRaw.startsWith("=")) {
        return cellRaw; 
      }
      let formula = cellRaw.slice(1).trim();

      // 1) TRIM, UPPER, LOWER
      formula = formula.replace(
        /(TRIM|UPPER|LOWER)\(([^)]+)\)/gi,
        (match, fn, inside) => {
          const refMatch = inside.match(/^([A-Z]\d+|\$[A-Z]\$\d+)$/i);
          let val = inside;
          if (refMatch) {
            const tmp = getRawValueForRef(inside) ?? "";
            val = tmp;
          } else if (inside.startsWith('"') && inside.endsWith('"')) {
            val = inside.slice(1, -1);
          }

          let result = val;
          if (/^TRIM$/i.test(fn)) result = trimCellValue(val);
          if (/^UPPER$/i.test(fn)) result = toUpper(val);
          if (/^LOWER$/i.test(fn)) result = toLower(val);

          const num = parseFloat(result);
          return isNaN(num) ? `"${result}"` : num;
        }
      );

      // 2) Built-in range functions: SUM, AVERAGE, MAX, MIN, COUNT
      formula = formula.replace(
        /\b(SUM|AVERAGE|MAX|MIN|COUNT|PRODUCT|MEDIAN)\(\s*([$A-Z]\d+):([$A-Z]\d+)\s*\)/gi,
        (all, fn, startRef, endRef) => {
          const rangeVals = getRangeValues(startRef, endRef);
          let out = 0;
          switch (fn.toUpperCase()) {
            case "SUM":
              out = sumCells(rangeVals);
              break;
            case "AVERAGE":
              out = averageCells(rangeVals);
              break;
            case "MAX":
              out = maxCells(rangeVals);
              break;
            case "MIN":
              out = minCells(rangeVals);
              break;
            case "COUNT":
              out = countCells(rangeVals);
              break;
            case "PRODUCT":
              out = productCells(rangeVals);
              break;
            case "MEDIAN":
              out = medianCells(rangeVals);
              break;
            default:
              out = "#ERROR";
          }
          return out;
        }
      );

      // 3) IF statements: e.g. IF(A1>10,"Yes","No")
      formula = formula.replace(
        /\bIF\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\)/gi,
        (all, condition, trueVal, falseVal) => {
          // parse references in condition e.g. "A1>10"
          const condParsed = condition.replace(/([$A-Z]\d+)/gi, (ref) => {
            // convert ref => getRawValueForRef
            const rawVal = getRawValueForRef(ref) ?? "0";
            return parseFloat(rawVal);
          });
          // parse references in trueVal/falseVal if they exist
          const tvClean = parseStringOrRef(trueVal);
          const fvClean = parseStringOrRef(falseVal);

          return ifFunction(condParsed, tvClean, fvClean);
        }
      );

      // Hook parser for references (like A1) not caught above
      parser.on("callVariable", (name, done) => {
        const val = getRawValueForRef(name) || 0;
        done(val);
      });

      // Finally parse
      const parsed = parser.parse(formula);
      if (parsed.error) {
        return "#ERROR";
      }
      return parsed.result;
    },
    [parser]
  );

  function parseStringOrRef(str) {
    str = str.trim();
    // if it's in quotes => remove quotes
    if (str.startsWith('"') && str.endsWith('"')) {
      return str.slice(1, -1);
    }
    // if it's a ref => get the raw value
    const refMatch = str.match(/^([$A-Z]\d+)$/i);
    if (refMatch) {
      const rawVal = getRawValueForRef(str) ?? "0";
      return parseFloat(rawVal) || rawVal;
    }
    return str; // fallback
  }

  // Range helper
  const getRangeValues = useCallback(
    (startRef, endRef) => {
      const cleanedStart = startRef.replace(/\$/g, "");
      const cleanedEnd = endRef.replace(/\$/g, "");
      const [startCol, startRow] = parseRef(cleanedStart);
      const [endCol, endRow] = parseRef(cleanedEnd);

      const vals = [];
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const colLetter = String.fromCharCode("A".charCodeAt(0) + c);
          const rawVal = rawData[r]?.[colLetter];
          vals.push(rawVal ?? "");
        }
      }
      return vals;
    },
    [rawData]
  );

  // sumCells, averageCells, etc. from earlier
  function sumCells(vals) {
    return vals.reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
  }
  function averageCells(vals) {
    if (!vals.length) return 0;
    return sumCells(vals) / vals.length;
  }
  function maxCells(vals) {
    const nums = vals.map((v) => parseFloat(v) || 0);
    return Math.max(...nums);
  }
  function minCells(vals) {
    const nums = vals.map((v) => parseFloat(v) || 0);
    return Math.min(...nums);
  }
  function countCells(vals) {
    return vals.filter((v) => !isNaN(parseFloat(v))).length;
  }
  function productCells(vals) {
    return vals.reduce((acc, v) => acc * (parseFloat(v) || 1), 1);
  }
  function medianCells(vals) {
    const nums = vals.map((v) => parseFloat(v) || 0).sort((a, b) => a - b);
    const mid = Math.floor(nums.length / 2);
    if (!nums.length) return 0;
    if (nums.length % 2 !== 0) return nums[mid];
    return (nums[mid - 1] + nums[mid]) / 2;
  }
  function ifFunction(condition, trueVal, falseVal) {
    try {
      return eval(condition) ? trueVal : falseVal;
    } catch {
      return "#ERROR";
    }
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // 3. Recalculate entire sheet
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  const recalcAll = useCallback(() => {
    const newComputed = rawData.map((row) => {
      const rowObj = {};
      for (const [col, val] of Object.entries(row)) {
        rowObj[col] = evaluateCell(val);
      }
      return rowObj;
    });
    setComputedData(newComputed);
  }, [rawData, evaluateCell]);

  useEffect(() => {
    recalcAll();
  }, [rawData, recalcAll]);

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // 4. AG Grid event handlers
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  const onCellClicked = useCallback(
    (params) => {
      const { rowIndex, colDef, value } = params;
      const colId = colDef.field;
      const rawValue = rawData[rowIndex][colId];

      setActiveCell((prev) => {
        // check if it's actually different
        if (
          rowIndex === prev.rowIndex &&
          colId === prev.colId &&
          rawValue === prev.rawValue
        ) {
          return prev; // no change
        }
        const styleKey = `${rowIndex}-${colId}`;
        const st = cellStyles[styleKey] || {
          fontWeight: "normal",
          fontStyle: "normal",
          color: "#000000",
          fontSize: "16px",
        };
        return {
          rowIndex,
          colId,
          rawValue,
          computedValue: value,
          styles: { ...st },
        };
      });
    },
    [rawData, cellStyles]
  );

  const onCellValueChanged = useCallback(
    (params) => {
      const { rowIndex, colDef, newValue } = params;
      const oldValue = rawData[rowIndex][colDef.field];
      if (newValue === oldValue) return; 
      const newData = [...rawData];
      newData[rowIndex] = { ...newData[rowIndex], [colDef.field]: newValue };
      setRawData(newData);
    },
    [rawData]
  );

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // 5. Toolbar & Formula Bar
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  const handleBold = () => {
    setActiveCell((prev) => ({
      ...prev,
      styles: {
        ...prev.styles,
        fontWeight: prev.styles.fontWeight === "bold" ? "normal" : "bold",
      },
    }));
  };
  const handleItalic = () => {
    setActiveCell((prev) => ({
      ...prev,
      styles: {
        ...prev.styles,
        fontStyle: prev.styles.fontStyle === "italic" ? "normal" : "italic",
      },
    }));
  };
  const handleFontSizeChange = (e) => {
    const newSize = e.target.value + "px";
    setActiveCell((prev) => ({
      ...prev,
      styles: { ...prev.styles, fontSize: newSize },
    }));
  };
  const handleColorChange = (e) => {
    const newColor = e.target.value;
    setActiveCell((prev) => ({
      ...prev,
      styles: { ...prev.styles, color: newColor },
    }));
  };
  const handleFormulaChange = (val) => {
    setActiveCell((prev) => ({ ...prev, rawValue: val }));
  };

  useEffect(() => {
    if (activeCell.rowIndex === null || activeCell.colId === null) return;
    const { rowIndex, colId, rawValue, styles } = activeCell;

    // Only update rawData if changed
    if (rawData[rowIndex][colId] !== rawValue) {
      const newData = [...rawData];
      newData[rowIndex] = { ...newData[rowIndex], [colId]: rawValue };
      setRawData(newData);
    }
    // update style
    const styleKey = `${rowIndex}-${colId}`;
    setCellStyles((prev) => ({
      ...prev,
      [styleKey]: styles,
    }));
  }, [activeCell, rawData]);

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // 6. Testing Interface
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  const [testFormula, setTestFormula] = useState("");
  const [testResult, setTestResult] = useState("");
  const handleTestFormula = () => {
    const r = evaluateCell(testFormula);
    setTestResult(r);
  };

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // 7. Chart Creation
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  const handleCreateChart = () => {
    // Example: Use the "A" column for data, row index for labels
    const labels = rawData.map((_, i) => `Row ${i + 1}`);
    const values = rawData.map((row) => parseFloat(row.A) || 0);
    setChartData({
      labels,
      datasets: [
        {
          label: "Column A Data",
          data: values,
          backgroundColor: "rgba(75,192,192,0.2)",
          borderColor: "rgba(75,192,192,1)",
          borderWidth: 1,
        },
      ],
    });
  };

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // 8. Save & Load
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  const handleSave = async () => {
    // POST /save
    const payload = {
      sheetId,
      cells: rawData,
    };
    try {
      const resp = await fetch(`${SERVER_URL}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (data.success) {
        alert("Saved successfully!");
      } else {
        alert("Save failed.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving data.");
    }
  };

  const handleLoad = async () => {
    // GET /load/:sheetId
    try {
      const resp = await fetch(`${SERVER_URL}/load/${sheetId}`);
      const data = await resp.json();
      if (data.cells) {
        setRawData(data.cells);
      } else {
        alert("No data found for this sheetId.");
      }
    } catch (e) {
      console.error(e);
      alert("Error loading data.");
    }
  };

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // Render
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  return (
    <div style={{ margin: 20 }}>
      <h1>Google Sheets-Like App (with Bonus Features)</h1>
      <p>
        Includes advanced math/data functions, chart creation, relative/absolute
        references, plus a minimal Node/Express backend for saving/loading.
      </p>

      {/* Toolbar */}
      <div style={myStyles.toolbar}>
        <button onClick={handleBold} style={{ fontWeight: "bold" }}>
          B
        </button>
        <button onClick={handleItalic} style={{ fontStyle: "italic" }}>
          I
        </button>
        <select onChange={handleFontSizeChange} defaultValue="16">
          <option value="12">12 px</option>
          <option value="14">14 px</option>
          <option value="16">16 px</option>
          <option value="18">18 px</option>
          <option value="20">20 px</option>
        </select>
        <input type="color" onChange={handleColorChange} title="Font Color" />

        {/* Save/Load */}
        <input
          type="text"
          placeholder="Sheet ID"
          value={sheetId}
          onChange={(e) => setSheetId(e.target.value)}
          style={{ width: 100 }}
        />
        <button onClick={handleSave}>Save</button>
        <button onClick={handleLoad}>Load</button>

        {/* Create Chart Button */}
        <button onClick={handleCreateChart}>Create Chart</button>
      </div>

      {/* Formula Bar */}
      <div style={myStyles.formulaBar}>
        <input
          type="text"
          style={myStyles.formulaInput}
          value={activeCell.rawValue}
          onChange={(e) => handleFormulaChange(e.target.value)}
          placeholder='e.g. "=SUM(A1:A2)" or "Hello"'
        />
      </div>

      {/* Testing Interface */}
      <div style={myStyles.testPanel}>
        <h3>Test Formula</h3>
        <input
          type="text"
          style={myStyles.formulaInput}
          value={testFormula}
          onChange={(e) => setTestFormula(e.target.value)}
          placeholder='Try "=PRODUCT(A1:A3)" or "=IF(A1>5,"Yes","No")"'
        />
        <button onClick={handleTestFormula}>Evaluate</button>
        {testResult !== "" && (
          <p>
            <strong>Result:</strong> {testResult}
          </p>
        )}
      </div>

      {/* Chart Preview */}
      {chartData && (
        <div style={{ marginTop: 20 }}>
          <h3>Chart Preview</h3>
          {/* Switch chartType for different chart */}
          {chartType === "bar" && <Bar data={chartData} />}
          {chartType === "line" && <Line data={chartData} />}
          {chartType === "pie" && <Pie data={chartData} />}
          <div style={{ marginTop: 10 }}>
            <label>Chart Type: </label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
            >
              <option value="bar">Bar</option>
              <option value="line">Line</option>
              <option value="pie">Pie</option>
            </select>
          </div>
        </div>
      )}

      {/* AG Grid */}
      <div
        className="ag-theme-alpine"
        style={{ height: 300, width: 600, marginTop: 10 }}
      >
        <AgGridReact
          modules={[ClientSideRowModelModule]}
          rowData={computedData}
          columnDefs={columnDefs}
          onCellClicked={onCellClicked}
          onCellValueChanged={onCellValueChanged}
          enableRangeSelection={true}
          enableFillHandle={true}
          fillHandleDirection="xy"
        />
      </div>
    </div>
  );
}

const myStyles = {
  toolbar: {
    display: "flex",
    gap: "8px",
    padding: "8px",
    backgroundColor: "#f1f1f1",
    borderBottom: "1px solid #ddd",
    alignItems: "center",
  },
  formulaBar: {
    marginTop: 5,
    padding: "8px",
    border: "1px solid #ccc",
    backgroundColor: "#fff",
  },
  formulaInput: {
    width: "100%",
    fontSize: 16,
  },
  testPanel: {
    marginTop: 15,
    padding: "8px",
    border: "1px solid #ccc",
    backgroundColor: "#fafafa",
  },
};

export default App;
