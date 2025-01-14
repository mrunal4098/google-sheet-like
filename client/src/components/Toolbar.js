// File: src/components/Toolbar.js
import React from "react";

function Toolbar({ onBold, onItalic, onFontSizeChange, onColorChange }) {
  return (
    <div style={styles.toolbarContainer}>
      <button onClick={onBold}>B</button>
      <button onClick={onItalic}>I</button>

      {/* Font Size Selector */}
      <select onChange={onFontSizeChange} defaultValue="16">
        <option value="12">12 px</option>
        <option value="14">14 px</option>
        <option value="16">16 px</option>
        <option value="18">18 px</option>
        <option value="20">20 px</option>
      </select>

      {/* Color Selector */}
      <input type="color" onChange={onColorChange} title="Font Color" />
    </div>
  );
}

// Simple inline style
const styles = {
  toolbarContainer: {
    display: "flex",
    gap: "8px",
    backgroundColor: "#f1f3f4",
    padding: "8px",
    borderBottom: "1px solid #ddd",
  },
};

export default Toolbar;
