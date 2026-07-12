import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { departmentsApi, categoriesApi, employeesApi, settingsApi } from "../api/client";

const AppContext = createContext(null);

const ACTIVE_EMPLOYEE_KEY = "ecosphere:activeEmployeeId";

export function AppProvider({ children }) {
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeEmployeeId, setActiveEmployeeIdState] = useState(
    () => localStorage.getItem(ACTIVE_EMPLOYEE_KEY) || ""
  );

  const refreshDepartments = useCallback(async () => setDepartments(await departmentsApi.list()), []);
  const refreshCategories = useCallback(async () => setCategories(await categoriesApi.list()), []);
  const refreshEmployees = useCallback(async () => setEmployees(await employeesApi.list()), []);
  const refreshSettings = useCallback(async () => setSettings(await settingsApi.get()), []);

  // Master Data mutates departments/categories/employees from a different
  // page — call this after create/update/delete there so every dropdown
  // across the app (Social, Governance, Gamification…) stays current.
  const refreshMasterData = useCallback(
    () => Promise.all([refreshDepartments(), refreshCategories(), refreshEmployees()]),
    [refreshDepartments, refreshCategories, refreshEmployees]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([refreshDepartments(), refreshCategories(), refreshEmployees(), refreshSettings()]);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshDepartments, refreshCategories, refreshEmployees, refreshSettings]);

  function setActiveEmployeeId(id) {
    setActiveEmployeeIdState(id);
    if (id) localStorage.setItem(ACTIVE_EMPLOYEE_KEY, id);
    else localStorage.removeItem(ACTIVE_EMPLOYEE_KEY);
  }

  async function updateSetting(key, value) {
    await settingsApi.update(key, value);
    setSettings((s) => ({ ...s, [key]: value }));
  }

  const departmentName = useCallback(
    (id) => departments.find((d) => d.id === id)?.name || "—",
    [departments]
  );
  const categoryName = useCallback(
    (id) => categories.find((c) => c.id === id)?.name || "—",
    [categories]
  );
  const employeeName = useCallback(
    (id) => employees.find((e) => e.id === id)?.name || "—",
    [employees]
  );

  const value = useMemo(
    () => ({
      departments,
      categories,
      employees,
      settings,
      loading,
      activeEmployeeId,
      setActiveEmployeeId,
      updateSetting,
      departmentName,
      categoryName,
      employeeName,
      refreshDepartments,
      refreshCategories,
      refreshEmployees,
      refreshMasterData,
    }),
    [
      departments,
      categories,
      employees,
      settings,
      loading,
      activeEmployeeId,
      departmentName,
      categoryName,
      employeeName,
      refreshDepartments,
      refreshCategories,
      refreshEmployees,
      refreshMasterData,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp() must be used inside <AppProvider>");
  return ctx;
}
