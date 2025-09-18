import { useState, useEffect } from 'react';
import { type Employee } from './useEmployeeSearch';
import { toast } from './use-toast';
import { EmployeeService, DepartmentService, setupRealtime } from '@/services/supabaseService';

const STORAGE_KEY = 'torp_employees';

// Função para gerar ID único
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Dados padrão dos funcionários
const DEFAULT_EMPLOYEES: Employee[] = [
  // GENTE E GESTÃO
  { id: generateId(), name: "Flávia (Diretora)", extension: "4723", email: "xxx", department: "Gente e Gestão" },
  { id: generateId(), name: "Bruno (RH)", extension: "4727", email: "bruno.oliveira@torp.ind.br", department: "Gente e Gestão", lunchTime: "12:00-13:00" },
  { id: generateId(), name: "Fabiane (Enfermagem)", extension: "4805", email: "fabiane.lourenco@torp.ind.br", department: "Gente e Gestão", lunchTime: "12:00-13:00" },
  
  // SALAS
  { id: generateId(), name: "Sala de Reuniões", extension: "4724", email: "xxx", department: "Salas" },
  
  // ADMINISTRATIVO
  { id: generateId(), name: "Ediane (Financeiro)", extension: "4713", email: "ediane.costa@torp.ind.br", department: "Administrativo", lunchTime: "12:00-13:00" },
  { id: generateId(), name: "Michele (Fiscal)", extension: "4729", email: "fiscal@torp.ind.br", department: "Administrativo", lunchTime: "11:00-12:00" },
  { id: generateId(), name: "Jussara Inácio (Recepção)", extension: "4701", email: "jussara.inacio@torp.ind.br", department: "Administrativo", lunchTime: "11:30-13:00" },
  { id: generateId(), name: "Fernanda (Faturamento)", extension: "4737", email: "fernanda.faturamento@torp.com", department: "Administrativo", lunchTime: "12:30-14:00" },
  { id: generateId(), name: "Tatiana (DP)", extension: "4728", email: "tatiana.guimaraes@torp.ind.br", department: "Administrativo", lunchTime: "12:30-13:30" },
  
  // COMERCIAL
  { id: generateId(), name: "Carlos Eduardo (Supervisor Operações)", extension: "4717", email: "carloseduardo.oliveira@torp.ind.br", department: "Comercial" },
  { id: generateId(), name: "Khendry", extension: "4714", email: "khendry.mendonca@torp.ind.br", department: "Comercial", lunchTime: "12:00-13:00" },
  { id: generateId(), name: "Marcus", extension: "4732", email: "marcos.teixeira@torp.ind.br", department: "Comercial", lunchTime: "11:00-12:00" },
  
  // CONTROLADORIA
  { id: generateId(), name: "Vinícius", extension: "4705", email: "vinicius.reis@torp.ind.br", department: "Controladoria", lunchTime: "12:30-13:30" },
  
  // MARKETING
  { id: generateId(), name: "Alice", extension: "4718", email: "alice.abreu@torp.ind.br", department: "Marketing", lunchTime: "12:00-13:00" },
  
  // TI
  { id: generateId(), name: "Wesley Oliveira", extension: "4722", email: "wesley.oliveira@torp.ind.br", department: "TI", lunchTime: "12:30-13:30" },
  
  // PCP
  { id: generateId(), name: "João Silva (PCP)", extension: "4750", email: "joao.silva@torp.ind.br", department: "PCP", lunchTime: "12:00-13:00" },
  { id: generateId(), name: "Maria Santos (PCP)", extension: "4751", email: "maria.santos@torp.ind.br", department: "PCP", lunchTime: "11:30-12:30" },
  
  // COMPRAS/PREFEITURA
  { id: generateId(), name: "Felipe (Supervisor Operações)", extension: "4708", email: "felipe.marciano@torp.ind.br", department: "Compras/Prefeitura", lunchTime: "13:00-14:00" },
  
  // SALA DE CARTELA
  { id: generateId(), name: "Sala de Cartela", extension: "4709", email: "xxx", department: "Salas" },
];

export interface EmployeeFormData {
  name: string;
  extension: string;
  email: string;
  department: string;
  lunchTime?: string;
}

export const useEmployeeManager = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados do Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Carregar funcionários e departamentos em paralelo
        const [employeesData, departmentsData] = await Promise.all([
          EmployeeService.getEmployees(),
          DepartmentService.getDepartments()
        ]);
        
        setEmployees(employeesData);
        setDepartments(departmentsData.map(dept => dept.name));
        
        console.log(`[useEmployeeManager] ✅ Carregados ${employeesData.length} funcionários e ${departmentsData.length} departamentos`);
      } catch (error) {
        console.error('[useEmployeeManager] ❌ Erro ao carregar dados:', error);
        // Fallback para dados padrão em caso de erro
        const employeesWithIds = DEFAULT_EMPLOYEES.map(emp => ({
          ...emp,
          id: emp.id || generateId()
        }));
        setEmployees(employeesWithIds);
        setDepartments([...new Set(employeesWithIds.map(emp => emp.department))]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Configurar realtime para sincronização
    setupRealtime();

    // Escutar eventos de atualização
    const handleEmployeesUpdate = () => {
      loadData();
    };

    window.addEventListener('employees_updated', handleEmployeesUpdate);
    
    return () => {
      window.removeEventListener('employees_updated', handleEmployeesUpdate);
    };
  }, []);

  // Adicionar novo funcionário
  const addEmployee = async (employeeData: EmployeeFormData): Promise<boolean> => {
    const success = await EmployeeService.addEmployee(employeeData);
    if (success) {
      // Recarregar dados após adição
      const updatedEmployees = await EmployeeService.getEmployees();
      setEmployees(updatedEmployees);
    }
    return success;
  };

  // Editar funcionário existente
  const updateEmployee = async (id: string, employeeData: EmployeeFormData): Promise<boolean> => {
    const success = await EmployeeService.updateEmployee(id, employeeData);
    if (success) {
      // Recarregar dados após atualização
      const updatedEmployees = await EmployeeService.getEmployees();
      setEmployees(updatedEmployees);
    }
    return success;
  };

  // Remover funcionário
  const removeEmployee = async (id: string): Promise<boolean> => {
    const success = await EmployeeService.deleteEmployee(id);
    if (success) {
      // Recarregar dados após remoção
      const updatedEmployees = await EmployeeService.getEmployees();
      setEmployees(updatedEmployees);
    }
    return success;
  };

  // Adicionar novo departamento
  const addDepartment = async (name: string): Promise<boolean> => {
    const success = await DepartmentService.addDepartment(name);
    if (success) {
      // Recarregar departamentos
      const departmentsData = await DepartmentService.getDepartments();
      setDepartments(departmentsData.map(dept => dept.name));
    }
    return success;
  };

  // Exportar dados
  const exportEmployees = (): string | null => {
    try {
      return JSON.stringify(employees, null, 2);
    } catch (error) {
      console.error('Erro ao exportar funcionários:', error);
      return null;
    }
  };

  // Importar dados (implementação simplificada para compatibilidade)
  const importEmployees = (jsonData: string): boolean => {
    try {
      const importedEmployees = JSON.parse(jsonData);
      
      // Validar estrutura dos dados
      if (!Array.isArray(importedEmployees)) {
        throw new Error('Dados devem ser um array');
      }

      // Validar cada funcionário
      for (const emp of importedEmployees) {
        if (!emp.name || !emp.extension || !emp.email || !emp.department) {
          throw new Error('Dados de funcionário inválidos');
        }
      }

      // TODO: Implementar importação em lote no Supabase
      toast({
        title: "⚠️ Importação Temporariamente Desabilitada",
        description: "A importação será implementada em breve. Use a interface para adicionar funcionários individualmente.",
        variant: "destructive",
      });

      return false;
    } catch (error) {
      console.error('Erro ao importar funcionários:', error);
      toast({
        title: "❌ Erro na Importação",
        description: "Arquivo inválido ou corrompido.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    employees,
    departments,
    isLoading,
    addEmployee,
    updateEmployee,
    removeEmployee,
    addDepartment,
    exportEmployees,
    importEmployees,
    getDepartments: () => departments,
  };
};