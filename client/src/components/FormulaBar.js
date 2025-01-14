// File: src/components/FormulaBar.js
import React from "react";

function FormulaBar({ activeCell, onChange }) {
  return (
    <div style={styles.formulaBarContainer}>
      {/* Show the current cell value or formula */}
      <input
        style={styles.formulaInput}
        type="text"
        value={activeCell.value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter a formula or value..."
      />
    </div>
  );
}

const styles = {
  formulaBarContainer: {
    display: "flex",
    backgroundColor: "#f1f3f4",
    padding: "8px",
    borderBottom: "1px solid #ddd",
  },
  formulaInput: {
    width: "100%",
    fontSize: "14px",
    padding: "4px",
  },
};

export default FormulaBar;
