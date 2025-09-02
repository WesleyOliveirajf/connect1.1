import { useState, useEffect } from 'react';
import { type Employee } from './useEmployeeSearch';
import { toast } from './use-toast';

const STORAGE_KEY = 'torp_employees';

// Função para gerar ID único
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Dados padrão dos funcionários
const DEFAULT_EMPLOYEES: Employee[] = [
  // FUNCIONÁRIO TESTE - DEMONSTRAÇÃO PARA DIRETORIA
  { 
    id: generateId(),
    name: "João Silva (TESTE - Demonstração)", 
    extension: "4999", 
    email: "joao.teste@torp.ind.br", 
    department: "TI", 
    lunchTime: "07:00-16:00" 
  },
  
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
  const [isLoading, setIsLoading] = useState(true);

  // Função para garantir que todos os funcionários tenham IDs
  const ensureEmployeeIds = (employees: Employee[]): Employee[] => {
    return employees.map(emp => ({
      ...emp,
      id: emp.id || generateId()
    }));
  };

  // Carregar funcionários do localStorage ou usar dados padrão
  useEffect(() => {
    try {
      const storedEmployees = localStorage.getItem(STORAGE_KEY);
      if (storedEmployees) {
        const parsed = JSON.parse(storedEmployees);
        const employeesWithIds = ensureEmployeeIds(parsed);
        setEmployees(employeesWithIds);
        // Salvar de volta com IDs se necessário
        if (employeesWithIds.some((emp, index) => emp.id !== parsed[index]?.id)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(employeesWithIds));
        }
      } else {
        const employeesWithIds = ensureEmployeeIds(DEFAULT_EMPLOYEES);
        setEmployees(employeesWithIds);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(employeesWithIds));
      }
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
      const employeesWithIds = ensureEmployeeIds(DEFAULT_EMPLOYEES);
      setEmployees(employeesWithIds);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Salvar funcionários no localStorage
  const saveEmployees = (newEmployees: Employee[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newEmployees));
      setEmployees(newEmployees);
    } catch (error) {
      console.error('Erro ao salvar funcionários:', error);
      toast({
        title: "❌ Erro ao Salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    }
  };

  // Adicionar novo funcionário
  const addEmployee = (employeeData: EmployeeFormData): boolean => {
    try {
      // Verificar se o email já existe (se não for 'xxx')
      if (employeeData.email !== 'xxx') {
        const emailExists = employees.some(emp => emp.email === employeeData.email);
        if (emailExists) {
          toast({
            title: "❌ Email já existe",
            description: `O email ${employeeData.email} já está sendo usado por outro funcionário.`,
            variant: "destructive",
          });
          return false;
        }
      }

      const newEmployee: Employee = {
        id: generateId(),
        ...employeeData,
        lunchTime: employeeData.lunchTime || undefined,
      };

      const updatedEmployees = [...employees, newEmployee];
      saveEmployees(updatedEmployees);

      toast({
        title: "✅ Funcionário Adicionado",
        description: `${employeeData.name} foi adicionado com sucesso.`,
      });

      return true;
    } catch (error) {
      console.error('Erro ao adicionar funcionário:', error);
      toast({
        title: "❌ Erro ao Adicionar",
        description: "Não foi possível adicionar o funcionário.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Editar funcionário existente
  const updateEmployee = (id: string, employeeData: EmployeeFormData): boolean => {
    try {
      const index = employees.findIndex(emp => emp.id === id);
      if (index === -1) {
        toast({
          title: "❌ Erro ao Atualizar",
          description: "Funcionário não encontrado.",
          variant: "destructive",
        });
        return false;
      }

      // Verificar se o email já existe (exceto para o próprio funcionário e se não for 'xxx')
      if (employeeData.email !== 'xxx') {
        const emailExists = employees.some(emp => 
          emp.id !== id && emp.email === employeeData.email
        );
        if (emailExists) {
          toast({
            title: "❌ Email já existe",
            description: `O email ${employeeData.email} já está sendo usado por outro funcionário.`,
            variant: "destructive",
          });
          return false;
        }
      }

      const updatedEmployees = [...employees];
      updatedEmployees[index] = {
        ...updatedEmployees[index],
        ...employeeData,
        lunchTime: employeeData.lunchTime || undefined,
      };

      saveEmployees(updatedEmployees);

      toast({
        title: "✅ Funcionário Atualizado",
        description: `${employeeData.name} foi atualizado com sucesso.`,
      });

      return true;
    } catch (error) {
      console.error('Erro ao atualizar funcionário:', error);
      toast({
        title: "❌ Erro ao Atualizar",
        description: "Não foi possível atualizar o funcionário.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Remover funcionário
  const removeEmployee = (id: string): boolean => {
    try {
      const employeeToRemove = employees.find(emp => emp.id === id);
      if (!employeeToRemove) {
        toast({
          title: "❌ Erro ao Remover",
          description: "Funcionário não encontrado.",
          variant: "destructive",
        });
        return false;
      }

      const updatedEmployees = employees.filter(emp => emp.id !== id);
      saveEmployees(updatedEmployees);

      toast({
        title: "✅ Funcionário Removido",
        description: `${employeeToRemove.name} foi removido com sucesso.`,
      });

      return true;
    } catch (error) {
      console.error('Erro ao remover funcionário:', error);
      toast({
        title: "❌ Erro ao Remover",
        description: "Não foi possível remover o funcionário.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Resetar para dados padrão
  const resetToDefault = () => {
    try {
      saveEmployees(DEFAULT_EMPLOYEES);
      toast({
        title: "✅ Dados Resetados",
        description: "Lista de funcionários foi resetada para os dados padrão.",
      });
    } catch (error) {
      console.error('Erro ao resetar funcionários:', error);
      toast({
        title: "❌ Erro ao Resetar",
        description: "Não foi possível resetar os dados.",
        variant: "destructive",
      });
    }
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

  // Importar dados
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

      saveEmployees(importedEmployees);
      toast({
        title: "✅ Dados Importados",
        description: `${importedEmployees.length} funcionários foram importados com sucesso.`,
      });

      return true;
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

  // Obter departamentos únicos
  const getDepartments = (): string[] => {
    const departments = employees.map(emp => emp.department);
    return [...new Set(departments)].sort();
  };

  return {
    employees,
    isLoading,
    addEmployee,
    updateEmployee,
    removeEmployee,
    resetToDefault,
    exportEmployees,
    importEmployees,
    getDepartments,
  };
};