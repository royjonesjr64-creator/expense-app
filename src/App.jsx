import React, { useEffect, useMemo, useState } from "react";

const DEFAULT_BUDGET = 56000;
const DEFAULT_SAVE = 40000;
const STORAGE_KEY = "expense-app-data";

const DEFAULT_CATEGORIES = [
  "Food",
  "Drinks",
  "Golf",
  "Transport",
  "Shopping",
  "Other",
];

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function yen(value) {
  return `¥${Number(value || 0).toLocaleString("ja-JP")}`;
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        budget: DEFAULT_BUDGET,
        saveGoal: DEFAULT_SAVE,
        categories: DEFAULT_CATEGORIES,
        entries: [],
      };
    }
    const parsed = JSON.parse(raw);
    return {
      budget: Number(parsed.budget ?? DEFAULT_BUDGET),
      saveGoal: Number(parsed.saveGoal ?? DEFAULT_SAVE),
      categories: Array.isArray(parsed.categories) && parsed.categories.length
        ? parsed.categories
        : DEFAULT_CATEGORIES,
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    return {
      budget: DEFAULT_BUDGET,
      saveGoal: DEFAULT_SAVE,
      categories: DEFAULT_CATEGORIES,
      entries: [],
    };
  }
}

export default function App() {
  const initial = loadData();

  const [budget, setBudget] = useState(initial.budget);
  const [saveGoal, setSaveGoal] = useState(initial.saveGoal);
  const [categories, setCategories] = useState(initial.categories);
  const [entries, setEntries] = useState(initial.entries);

  const [date, setDate] = useState(todayText());
  const [category, setCategory] = useState(initial.categories[0] || "Other");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [newCategory, setNewCategory] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ budget, saveGoal, categories, entries })
    );
  }, [budget, saveGoal, categories, entries]);

  useEffect(() => {
    if (!categories.includes(category)) {
      setCategory(categories[0] || "Other");
    }
  }, [categories, category]);

  const filteredEntries = useMemo(() => {
    if (filterCategory === "All") return entries;
    return entries.filter((item) => item.category === filterCategory);
  }, [entries, filterCategory]);

  const spent = useMemo(() => {
    return filteredEntries.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [filteredEntries]);

  const available = Math.max(budget - saveGoal, 0);
  const remaining = available - spent;

  function addEntry() {
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) return;

    const item = {
      id: Date.now(),
      date,
      category,
      amount: num,
      note,
    };

    setEntries((prev) => [item, ...prev]);
    setAmount("");
    setNote("");
    setDate(todayText());
  }

  function deleteEntry(id) {
    setEntries((prev) => prev.filter((item) => item.id !== id));
  }

  function addCategory() {
    const value = newCategory.trim();
    if (!value) return;
    if (categories.includes(value)) return;

    setCategories((prev) => [...prev, value]);
    setCategory(value);
    setNewCategory("");
  }

  function deleteCategory(name) {
    const next = categories.filter((item) => item !== name);
    if (next.length === 0) return;

    setCategories(next);

    if (category === name) {
      setCategory(next[0]);
    }
    if (filterCategory === name) {
      setFilterCategory("All");
    }
  }

  function resetAll() {
    if (!window.confirm("Reset all data?")) return;

    setBudget(DEFAULT_BUDGET);
    setSaveGoal(DEFAULT_SAVE);
    setCategories(DEFAULT_CATEGORIES);
    setEntries([]);
    setDate(todayText());
    setCategory(DEFAULT_CATEGORIES[0]);
    setAmount("");
    setNote("");
    setNewCategory("");
    setFilterCategory("All");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        padding: 20,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 700,
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: 20,
          padding: 20,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ marginTop: 0 }}>Expense App</h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              background: "#0f172a",
              color: "#fff",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.8 }}>Budget</div>
            <div style={{ fontSize: 28, fontWeight: "bold" }}>{yen(budget)}</div>
          </div>

          <div
            style={{
              background: remaining < 0 ? "#fee2e2" : "#ecfdf5",
              color: remaining < 0 ? "#b91c1c" : "#047857",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div style={{ fontSize: 12 }}>Remaining</div>
            <div style={{ fontSize: 28, fontWeight: "bold" }}>{yen(remaining)}</div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ marginBottom: 6 }}>Budget</div>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value || 0))}
              style={{ width: "100%", height: 40, padding: "0 10px" }}
            />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Save Goal</div>
            <input
              type="number"
              value={saveGoal}
              onChange={(e) => setSaveGoal(Number(e.target.value || 0))}
              style={{ width: "100%", height: 40, padding: "0 10px" }}
            />
          </div>
        </div>

        <hr />

        <h2>Add Expense</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ marginBottom: 6 }}>Date</div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: "100%", height: 40, padding: "0 10px" }}
            />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Category</div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: "100%", height: 40, padding: "0 10px" }}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Amount</div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: "100%", height: 40, padding: "0 10px" }}
            />
          </div>

          <div>
            <div style={{ marginBottom: 6 }}>Note</div>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ width: "100%", height: 40, padding: "0 10px" }}
            />
          </div>
        </div>

        <button
          onClick={addEntry}
          style={{
            height: 42,
            padding: "0 16px",
            border: "none",
            borderRadius: 10,
            background: "#2563eb",
            color: "#fff",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Add
        </button>

        <hr style={{ marginTop: 24 }} />

        <h2>Categories</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New category"
            style={{ height: 40, padding: "0 10px" }}
          />
          <button
            onClick={addCategory}
            style={{
              height: 42,
              padding: "0 16px",
              border: "none",
              borderRadius: 10,
              background: "#111827",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Add Category
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {categories.map((item) => (
            <div
              key={item}
              style={{
                background: "#e2e8f0",
                borderRadius: 999,
                padding: "6px 10px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>{item}</span>
              <button
                onClick={() => deleteCategory(item)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#475569",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <hr />

        <h2>History</h2>

        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 6 }}>Filter</div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ width: "100%", height: 40, padding: "0 10px" }}
          >
            <option value="All">All</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {filteredEntries.length === 0 ? (
            <div style={{ color: "#64748b" }}>No data yet</div>
          ) : (
            filteredEntries.map((item) => (
              <div
                key={item.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: "bold" }}>
                    {item.category} - {yen(item.amount)}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {item.date} {item.note ? ` / ${item.note}` : ""}
                  </div>
                </div>

                <button
                  onClick={() => deleteEntry(item.id)}
                  style={{
                    border: "none",
                    background: "#fee2e2",
                    color: "#b91c1c",
                    borderRadius: 8,
                    padding: "8px 10px",
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <button
            onClick={resetAll}
            style={{
              height: 42,
              padding: "0 16px",
              border: "none",
              borderRadius: 10,
              background: "#dc2626",
              color: "#fff",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Reset All
          </button>
        </div>
      </div>
    </div>
  );
}