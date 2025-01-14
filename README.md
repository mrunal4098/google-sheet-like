### README: Google Sheets-Like Web Application

---

## **Project Overview**

This project is a **Google Sheets-like web application**, developed as part of an assignment to showcase a range of technical skills and address real-world spreadsheet functionalities. The application features:

1. A **Spreadsheet Interface** resembling Google Sheets, including a toolbar, formula bar, and interactive grid.
2. **Mathematical Functions** like SUM, AVERAGE, MAX, MIN, COUNT, and advanced ones such as MEDIAN, PRODUCT, and IF.
3. **Data Quality Functions** such as TRIM, UPPER, LOWER, REMOVE_DUPLICATES, and FIND_AND_REPLACE.
4. **Save and Load Functionality** via a Node.js/Express backend with local JSON storage.
5. **Chart Creation** using Chart.js to visualize data with bar, line, and pie charts.
6. **Data Entry and Validation** to ensure correctness and support multiple data types.
7. Bonus Features like advanced formula handling, relative/absolute references, and performance optimizations.

---

## **Technology Stack**

### **Frontend**
- **React**: Component-based framework for building dynamic UIs.
- **AG Grid**: Provides robust spreadsheet-like functionality.
- **Chart.js + React-Chart.js-2**: Enables data visualization via bar, line, and pie charts.

### **Backend**
- **Node.js with Express.js**: Backend server for API handling.
- **File-based Storage**: Uses JSON files for simplicity in saving and loading spreadsheets.

---

### **Why These Technologies?**

- **React**: Simplifies complex UI development with reusable components.
- **AG Grid**: Offers advanced grid functionalities like editing, range selection, and cell dependency handling, saving development time.
- **Chart.js**: A lightweight and powerful library for creating customizable and interactive charts.
- **Express.js**: Minimalistic and efficient backend framework for handling REST APIs.

---

## **Data Structures Used and Why**

### **1. Grid Data (Cell Storage)**
**Data Structure:** Object  
**Example:** `{ "A1": { value: "10", type: "number" }, "B2": { value: "=SUM(A1:A5)", type: "formula" } }`

**Why?**  
- **Simplicity**: Direct lookup of cell data via keys like `A1`.
- **Flexibility**: Stores metadata (e.g., formatting, data type) alongside values.
- **Efficiency**: Fast for updates and sparse datasets.

---

### **2. Dependency Graph**
**Data Structure:** Directed Graph (Adjacency List)  
**Example:** `{ "B1": ["A1", "A2"], "C1": ["B1"] }`

**Why?**  
- **Formula Dependencies**: Ensures recalculations propagate correctly.
- **Performance**: Efficiently handles large datasets with complex interdependencies.
- **Topological Sorting**: Ensures proper order of recalculations.

---

### **3. Chart Data**
**Data Structure:** Array of Objects  
**Example:** `[ { label: "Jan", value: 10 }, { label: "Feb", value: 20 } ]`

**Why?**  
- **Integration**: Matches the expected format of Chart.js for rendering.
- **Flexibility**: Easily maps grid data to this format for visualizations.

---

### **4. Selected Range**
**Data Structure:** Object  
**Example:** `{ start: "A1", end: "B3" }`

**Why?**  
- **Simplicity**: Easy to parse and use for operations like SUM, AVERAGE, or chart creation.
- **Consistency**: Matches grid and formula data structures seamlessly.

---

### **5. Undo/Redo Stack**
**Data Structure:** Stack (Array)  
**Example:** `[{ action: "edit", cell: "A1", oldValue: "10", newValue: "20" }]`

**Why?**  
- **Lightweight**: Stores only changes, minimizing memory usage.
- **Ease of Use**: Stack operations directly map to undo/redo functionalities.

---

### **6. Validation Rules**
**Data Structure:** Hash Map (Object)  
**Example:** `{ "A1": { type: "number", required: true } }`

**Why?**  
- **Fast Lookups**: Quickly verify rules for a specific cell.
- **Extensibility**: Easily add rules (e.g., "min", "max") without restructuring.

---

## **Key Features**

### **1. Spreadsheet Interface**
- Toolbar for formatting (bold, italics, font size, color).
- Formula bar for editing/displaying cell formulas.
- Drag-fill functionality for copying formulas and values.

---

### **2. Mathematical Functions**
- **Basic**: SUM, AVERAGE, MAX, MIN, COUNT.
- **Advanced**: MEDIAN, PRODUCT, IF.

---

### **3. Data Quality Functions**
- TRIM, UPPER, LOWER, REMOVE_DUPLICATES, FIND_AND_REPLACE.

---

### **4. Chart Creation**
- Create bar, line, or pie charts based on selected ranges.

---

### **5. Save and Load**
- Save and load spreadsheets via backend API.

---

### **6. Data Entry and Validation**
- Supports numbers, text, and dates.
- Provides feedback for invalid entries.

---

## **Non-Functional Enhancements**

### **1. Security**
- **Input Sanitization**: Prevents XSS and injection attacks.
- **Backend Validation**: Ensures API integrity and data consistency.

---

### **2. Performance**
- **Lazy Loading**: Efficient rendering for large datasets.
- **Debounced Updates**: Prevents redundant formula recalculations.
- **Optimized Dependencies**: Dependency graph ensures minimal recalculations.

---

### **3. Accessibility**
- **Keyboard Navigation**: Full support for tabbing and arrow keys.
- **Screen Reader Support**: Proper ARIA roles for enhanced usability.

---

## **Setup and Installation**

1. Clone the repository:
   ```bash
   git clone <your-github-repo-url>
   cd google-sheets-like
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Start the backend server:
   ```bash
   npm start
   ```

4. Install frontend dependencies:
   ```bash
   cd client
   npm install
   ```

5. Start the frontend:
   ```bash
   npm start
   ```

---

## **Testing**

### **Test Cases**
1. Test mathematical functions with sample data.
2. Verify data quality functions on text-heavy cells.
3. Confirm save/load functionality with multiple sheets.
4. Test chart creation for different datasets and chart types.

---

## **GitHub Repository**

[GitHub Repository Link](https://github.com/mrunal4098/google-sheet-like)


---

## **Conclusion**

This project meets all assignment requirements, including core and bonus features. The modular architecture and optimizations make it scalable, secure, and efficient.
