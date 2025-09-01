import { useState, useMemo } from "react";

export interface Employee {
  id?: string;
  name: string;
  extension: string;
  email: string;
  department: string;
  lunchTime?: string; // Horário de almoço no formato "12:00-13:00"
}

export function useEmployeeSearch(employees: Employee[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("todos");

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesSearch = 
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.extension.includes(searchTerm);

      const matchesDepartment = 
        departmentFilter === "todos" || 
        employee.department.toLowerCase().includes(departmentFilter.toLowerCase());

      return matchesSearch && matchesDepartment;
    });
  }, [employees, searchTerm, departmentFilter]);

  const departments = useMemo(() => {
    const unique = new Set(employees.map(emp => emp.department));
    return Array.from(unique).sort();
  }, [employees]);

  return {
    searchTerm,
    setSearchTerm,
    departmentFilter,
    setDepartmentFilter,
    filteredEmployees,
    departments,
    totalResults: filteredEmployees.length,
    totalEmployees: employees.length
  };
}
