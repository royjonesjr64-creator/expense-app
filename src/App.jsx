import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "simple-kakeibo-app";
const DEFAULT_CATEGORIES = ["食費", "交通", "買い物", "娯楽", "固定費", "その他"];

function registerServiceWorker(setMessage) {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/sw.js");
      setMessage((prev) => prev || "アプリをオフライン対応にしました。");
    } catch {
      // sw.js がまだ無い時は何もしない
    }
  });
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentMonth() {
  return getToday().slice(0, 7);
}

function formatMonthLabel(month) {
  const [year, mon] = month.split("-");
  return `${year}年${Number(mon)}月`;
}

function moveMonth(month, diff) {
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(year, mon - 1 + diff, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatYen(value) {
  return `¥${Number(value || 0).toLocaleString("ja-JP")}`;
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { categories: DEFAULT_CATEGORIES, entries: [] };
    }
    const parsed = JSON.parse(raw);
    return {
      categories:
        Array.isArray(parsed.categories) && parsed.categories.length > 0
          ? parsed.categories
          : DEFAULT_CATEGORIES,
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    return { categories: DEFAULT_CATEGORIES, entries: [] };
  }
}

function iconButtonStyle(active) {
  return {
    flex: 1,
    height: 62,
    border: "none",
    background: "transparent",
    color: active ? "#2563eb" : "#64748b",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  };
}

export default function App() {
  const initial = loadData();

  const [categories, setCategories] = useState(initial.categories);
  const [entries, setEntries] = useState(initial.entries);
  const [newCategory, setNewCategory] = useState("");
  const [tab, setTab] = useState("add");
  const [message, setMessage] = useState("");
  const [editingCategory, setEditingCategory] = useState("");
  const [editingValue, setEditingValue] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false
  );

  const [form, setForm] = useState({
    date: getToday(),
    category: initial.categories[0] || "その他",
    amount: "",
    note: "",
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ categories, entries }));
  }, [categories, entries]);

  useEffect(() => {
    if (!categories.includes(form.category)) {
      setForm((prev) => ({ ...prev, category: categories[0] || "その他" }));
    }
  }, [categories, form.category]);

  useEffect(() => {
    registerServiceWorker(setMessage);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const todayText = getToday();
  const currentMonth = selectedMonth;

  const todayEntries = useMemo(
    () => entries.filter((item) => item.date === todayText),
    [entries, todayText]
  );
  const monthEntries = useMemo(
    () => entries.filter((item) => item.date.slice(0, 7) === currentMonth),
    [entries, currentMonth]
  );

  const todayTotal = useMemo(
    () => todayEntries.reduce((s, i) => s + Number(i.amount || 0), 0),
    [todayEntries]
  );
  const monthTotal = useMemo(
    () => monthEntries.reduce((s, i) => s + Number(i.amount || 0), 0),
    [monthEntries]
  );

  const recentEntries = useMemo(
    () => monthEntries.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 8),
    [monthEntries]
  );

  const categoryTotals = useMemo(() => {
    return categories
      .map((category) => ({
        category,
        total: monthEntries
          .filter((i) => i.category === category)
          .reduce((s, i) => s + Number(i.amount || 0), 0),
      }))
      .filter((i) => i.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [categories, monthEntries]);

  function addExpense() {
    const amountNumber = Number(form.amount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setMessage("正しい金額を入力してください。");
      return;
    }

    const item = {
      id: Date.now(),
      date: form.date,
      category: form.category,
      amount: amountNumber,
      note: form.note.trim(),
    };

    setEntries((prev) => [item, ...prev]);
    setForm({
      date: getToday(),
      category: categories[0] || "その他",
      amount: "",
      note: "",
    });
    setMessage("保存しました。");
    setTab("history");
  }

  function deleteExpense(id) {
    setEntries((prev) => prev.filter((i) => i.id !== id));
    setMessage("削除しました。");
  }

  function addCategory() {
    const value = newCategory.trim();
    if (!value) return;
    if (categories.includes(value)) {
      setMessage("同じカテゴリがあります。");
      return;
    }
    setCategories((prev) => [...prev, value]);
    setForm((prev) => ({ ...prev, category: value }));
    setNewCategory("");
    setMessage("カテゴリを追加しました。");
  }

  function startRenameCategory(oldName) {
    setEditingCategory(oldName);
    setEditingValue(oldName);
  }

  function saveRenameCategory(oldName) {
    const trimmed = editingValue.trim();
    if (!trimmed) return setMessage("新しいカテゴリ名を入力してください。");
    if (trimmed !== oldName && categories.includes(trimmed)) {
      return setMessage("同じカテゴリ名があります。");
    }

    setCategories((prev) => prev.map((c) => (c === oldName ? trimmed : c)));
    setEntries((prev) =>
      prev.map((e) => (e.category === oldName ? { ...e, category: trimmed } : e))
    );

    if (form.category === oldName) {
      setForm((p) => ({ ...p, category: trimmed }));
    }

    setEditingCategory("");
    setEditingValue("");
    setMessage("カテゴリ名を変更しました。");
  }

  function cancelRenameCategory() {
    setEditingCategory("");
    setEditingValue("");
  }

  function deleteCategory(name) {
    const next = categories.filter((c) => c !== name);
    if (next.length === 0) return;
    setCategories(next);
    if (form.category === name) {
      setForm((p) => ({ ...p, category: next[0] }));
    }
    setMessage("カテゴリを削除しました。");
  }

  async function installApp() {
    if (!deferredPrompt) {
      setMessage("ホーム画面に追加できる状態になったらここからインストールできます。");
      return;
    }

    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setMessage("アプリをインストールしました。");
    }
    setDeferredPrompt(null);
  }

  function resetAll() {
    if (!window.confirm("すべてのデータをリセットしますか？")) return;
    setCategories(DEFAULT_CATEGORIES);
    setEntries([]);
    setForm({
      date: getToday(),
      category: DEFAULT_CATEGORIES[0],
      amount: "",
      note: "",
    });
    setMessage("リセットしました。");
    setTab("add");
  }

  const phoneShell = {
    maxWidth: 430,
    margin: "0 auto",
    minHeight: "100vh",
    background: "linear-gradient(180deg, #eff6ff 0%, #f8fafc 18%, #f8fafc 100%)",
    position: "relative",
    boxSizing: "border-box",
  };

  const card = {
    background: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(12px)",
    borderRadius: 24,
    padding: 16,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
    border: "1px solid rgba(255,255,255,0.7)",
  };

  const fieldLabel = { fontSize: 13, color: "#475569", marginBottom: 6, fontWeight: 700 };
  const inputBase = {
    width: "100%",
    height: 52,
    borderRadius: 16,
    border: "1px solid #dbeafe",
    background: "#f8fbff",
    padding: "0 14px",
    boxSizing: "border-box",
    fontSize: 16,
    outline: "none",
  };

  return (
    <div style={{ background: "#e2e8f0", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
      <div style={phoneShell}>
        <div style={{ padding: "16px 16px 110px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>毎日の支出をかんたん管理</div>
              <div style={{ fontSize: 34, fontWeight: 900, color: "#0f172a", letterSpacing: -1 }}>経費アプリ</div>
            </div>
            <button
              onClick={installApp}
              style={{
                border: "none",
                background: "#0f172a",
                color: "white",
                borderRadius: 16,
                height: 44,
                padding: "0 14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ＋追加
            </button>
          </div>

          <div style={{ ...card, background: "linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)", color: "white", marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>シンプル家計簿</div>
                <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{formatMonthLabel(selectedMonth)}の支出</div>
                <div style={{ fontSize: 34, fontWeight: 900, marginTop: 8 }}>{formatYen(monthTotal)}</div>
              </div>
              <div style={{ fontSize: 28 }}>💳</div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginTop: 16,
                background: "rgba(255,255,255,0.12)",
                borderRadius: 18,
                padding: 10,
              }}
            >
              <button
                onClick={() => setSelectedMonth((prev) => moveMonth(prev, -1))}
                style={{
                  border: "none",
                  background: "rgba(255,255,255,0.16)",
                  color: "white",
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  fontSize: 18,
                  cursor: "pointer",
                }}
              >
                ←
              </button>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{formatMonthLabel(selectedMonth)}</div>
              <button
                onClick={() => setSelectedMonth((prev) => moveMonth(prev, 1))}
                style={{
                  border: "none",
                  background: "rgba(255,255,255,0.16)",
                  color: "white",
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  fontSize: 18,
                  cursor: "pointer",
                }}
              >
                →
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 18 }}>
              <div style={{ background: "rgba(255,255,255,0.14)", borderRadius: 18, padding: 14 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>今日</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{formatYen(todayTotal)}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.14)", borderRadius: 18, padding: 14 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>月の件数</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{monthEntries.length}件</div>
              </div>
            </div>
          </div>

          {message ? (
            <div style={{ ...card, marginBottom: 14, padding: "12px 14px", background: "#eff6ff", color: "#1d4ed8", fontSize: 13, fontWeight: 700 }}>
              {message}
            </div>
          ) : null}

          {isOffline ? (
            <div style={{ ...card, marginBottom: 14, padding: "12px 14px", background: "#fff7ed", color: "#c2410c", fontSize: 13, fontWeight: 700 }}>
              オフラインでも使えます。保存済みデータを表示中です。
            </div>
          ) : null}

          {tab === "add" && (
            <div style={{ ...card, marginBottom: 14 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>支出を追加</div>

              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div style={fieldLabel}>金額</div>
                  <input
                    type="number"
                    placeholder="例: 1200"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    style={{ ...inputBase, fontSize: 22, fontWeight: 800 }}
                  />
                </div>

                <div>
                  <div style={fieldLabel}>カテゴリ</div>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    style={inputBase}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={fieldLabel}>日付</div>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    style={inputBase}
                  />
                </div>

                <div>
                  <div style={fieldLabel}>メモ</div>
                  <input
                    type="text"
                    placeholder="ランチ、電車、日用品など"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    style={inputBase}
                  />
                </div>

                <button
                  onClick={addExpense}
                  style={{
                    width: "100%",
                    height: 56,
                    borderRadius: 18,
                    border: "none",
                    background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                    color: "white",
                    fontSize: 18,
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 12px 24px rgba(37, 99, 235, 0.28)",
                  }}
                >
                  保存する
                </button>
              </div>
            </div>
          )}

          {tab === "history" && (
            <div style={{ ...card, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{formatMonthLabel(selectedMonth)}の履歴</div>
                <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>{monthEntries.length}件</div>
              </div>

              {recentEntries.length === 0 ? (
                <div style={{ color: "#64748b", fontSize: 14 }}>{formatMonthLabel(selectedMonth)}のデータがありません。</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {recentEntries.map((e) => (
                    <div
                      key={e.id}
                      style={{
                        background: "#f8fbff",
                        border: "1px solid #dbeafe",
                        borderRadius: 18,
                        padding: 14,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{e.category}</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                          {e.date} {e.note ? `・${e.note}` : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: "#1d4ed8" }}>{formatYen(e.amount)}</div>
                        <button
                          onClick={() => deleteExpense(e.id)}
                          style={{
                            marginTop: 8,
                            border: "none",
                            background: "#fee2e2",
                            color: "#b91c1c",
                            borderRadius: 12,
                            padding: "8px 10px",
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "summary" && (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={card}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>{formatMonthLabel(selectedMonth)}のカテゴリ別集計</div>
                {categoryTotals.length === 0 ? (
                  <div style={{ color: "#64748b", fontSize: 14 }}>今月のデータがありません。</div>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {categoryTotals.map((c) => (
                      <div key={c.category}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14, fontWeight: 700 }}>
                          <span>{c.category}</span>
                          <span>{formatYen(c.total)}</span>
                        </div>
                        <div style={{ height: 10, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              width: `${monthTotal > 0 ? (c.total / monthTotal) * 100 : 0}%`,
                              background: "linear-gradient(90deg, #60a5fa 0%, #2563eb 100%)",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={card}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>カテゴリ管理</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 12 }}>
                  <input
                    type="text"
                    placeholder="新しいカテゴリ"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    style={inputBase}
                  />
                  <button
                    onClick={addCategory}
                    style={{
                      border: "none",
                      background: "#0f172a",
                      color: "white",
                      borderRadius: 16,
                      padding: "0 16px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    追加
                  </button>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {categories.map((item) => (
                    <div
                      key={item}
                      style={{
                        background: "#f8fbff",
                        border: "1px solid #dbeafe",
                        borderRadius: 18,
                        padding: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      {editingCategory === item ? (
                        <>
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            style={{ ...inputBase, height: 42, minWidth: 130 }}
                          />
                          <button
                            onClick={() => saveRenameCategory(item)}
                            style={{
                              border: "none",
                              background: "#2563eb",
                              color: "white",
                              borderRadius: 12,
                              padding: "10px 12px",
                              cursor: "pointer",
                              fontWeight: 700,
                            }}
                          >
                            保存
                          </button>
                          <button
                            onClick={cancelRenameCategory}
                            style={{
                              border: "none",
                              background: "#cbd5e1",
                              color: "#334155",
                              borderRadius: 12,
                              padding: "10px 12px",
                              cursor: "pointer",
                              fontWeight: 700,
                            }}
                          >
                            キャンセル
                          </button>
                        </>
                      ) : (
                        <>
                          <div style={{ flex: 1, fontWeight: 700, color: "#0f172a" }}>{item}</div>
                          <button
                            onClick={() => startRenameCategory(item)}
                            style={{
                              border: "none",
                              background: "#dbeafe",
                              color: "#1d4ed8",
                              borderRadius: 12,
                              padding: "8px 10px",
                              cursor: "pointer",
                              fontWeight: 700,
                            }}
                          >
                            変更
                          </button>
                          <button
                            onClick={() => deleteCategory(item)}
                            style={{
                              border: "none",
                              background: "#fee2e2",
                              color: "#b91c1c",
                              borderRadius: 12,
                              padding: "8px 10px",
                              cursor: "pointer",
                              fontWeight: 700,
                            }}
                          >
                            削除
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={card}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 14 }}>データ管理</div>
                <button
                  onClick={resetAll}
                  style={{
                    width: "100%",
                    height: 50,
                    borderRadius: 16,
                    border: "none",
                    background: "#dc2626",
                    color: "white",
                    fontSize: 16,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  すべてリセット
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 430,
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(14px)",
              borderTop: "1px solid #dbeafe",
              boxShadow: "0 -8px 30px rgba(15, 23, 42, 0.08)",
              display: "flex",
              paddingBottom: "env(safe-area-inset-bottom)",
              pointerEvents: "auto",
            }}
          >
            {[
              { key: "add", label: "追加", icon: "➕" },
              { key: "history", label: "履歴", icon: "🕒" },
              { key: "summary", label: "集計", icon: "📊" },
            ].map((item) => {
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  style={iconButtonStyle(active)}
                >
                  <div style={{ fontSize: 20 }}>{item.icon}</div>
                  <div>{item.label}</div>
                  <div
                    style={{
                      width: 26,
                      height: 3,
                      borderRadius: 999,
                      background: active ? "#2563eb" : "transparent",
                      marginTop: 2,
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

console.assert(formatYen(1200) === "¥1,200", "yen format ok");
console.assert(getToday().length === 10, "date ok");
console.assert(
  typeof registerServiceWorker === "function",
  "service worker helper should exist"
);
console.assert(formatMonthLabel("2026-03") === "2026年3月", "month label should format correctly");
console.assert(moveMonth("2026-01", -1) === "2025-12", "moveMonth should cross year boundary");
