import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Tipos locais para compatibilidade
export interface Employee {
  id: string;
  name: string;
  extension: string;
  email: string;
  department: string;
  lunchTime?: string;
}

export interface Department {
  id: string;
  name: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'alta' | 'média' | 'baixa';
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeFormData {
  name: string;
  extension: string;
  email: string;
  department: string;
  lunchTime?: string;
}

// Serviço para funcionários
export class EmployeeService {
  // Buscar todos os funcionários
  static async getEmployees(): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');

      if (error) throw error;

      return data.map(emp => ({
        id: emp.id,
        name: emp.name,
        extension: emp.extension,
        email: emp.email,
        department: emp.department,
        lunchTime: emp.lunch_time || undefined,
      }));
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
      toast.error('Erro ao carregar funcionários');
      return [];
    }
  }

  // Adicionar funcionário
  static async addEmployee(employeeData: EmployeeFormData): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('employees')
        .insert({
          name: employeeData.name,
          extension: employeeData.extension,
          email: employeeData.email,
          department: employeeData.department,
          lunch_time: employeeData.lunchTime || null,
        });

      if (error) throw error;

      toast.success('Funcionário adicionado com sucesso!');
      return true;
    } catch (error: any) {
      console.error('Erro ao adicionar funcionário:', error);
      
      if (error.code === '23505') {
        toast.error('Ramal já está em uso por outro funcionário');
      } else {
        toast.error('Erro ao adicionar funcionário');
      }
      return false;
    }
  }

  // Atualizar funcionário
  static async updateEmployee(id: string, employeeData: EmployeeFormData): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          name: employeeData.name,
          extension: employeeData.extension,
          email: employeeData.email,
          department: employeeData.department,
          lunch_time: employeeData.lunchTime || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Funcionário atualizado com sucesso!');
      return true;
    } catch (error: any) {
      console.error('Erro ao atualizar funcionário:', error);
      
      if (error.code === '23505') {
        toast.error('Ramal já está em uso por outro funcionário');
      } else {
        toast.error('Erro ao atualizar funcionário');
      }
      return false;
    }
  }

  // Remover funcionário
  static async deleteEmployee(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Funcionário removido com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao remover funcionário:', error);
      toast.error('Erro ao remover funcionário');
      return false;
    }
  }
}

// Serviço para departamentos
export class DepartmentService {
  // Buscar todos os departamentos
  static async getDepartments(): Promise<Department[]> {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;

      return data.map(dept => ({
        id: dept.id,
        name: dept.name,
      }));
    } catch (error) {
      console.error('Erro ao buscar departamentos:', error);
      return [];
    }
  }

  // Adicionar departamento
  static async addDepartment(name: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('departments')
        .insert({ name });

      if (error) throw error;

      toast.success('Departamento adicionado com sucesso!');
      return true;
    } catch (error: any) {
      console.error('Erro ao adicionar departamento:', error);
      
      if (error.code === '23505') {
        toast.error('Departamento já existe');
      } else {
        toast.error('Erro ao adicionar departamento');
      }
      return false;
    }
  }
}

// Serviço para comunicados
export class AnnouncementService {
  // Buscar todos os comunicados
  static async getAnnouncements(): Promise<Announcement[]> {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(ann => ({
        id: ann.id,
        title: ann.title,
        content: ann.content,
        priority: ann.priority,
        date: new Date(ann.created_at).toLocaleDateString('pt-BR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }),
        createdAt: ann.created_at,
        updatedAt: ann.updated_at,
      }));
    } catch (error) {
      console.error('Erro ao buscar comunicados:', error);
      toast.error('Erro ao carregar comunicados');
      return [];
    }
  }

  // Adicionar comunicado
  static async addAnnouncement(announcementData: Omit<Announcement, 'id' | 'date' | 'createdAt' | 'updatedAt'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('announcements')
        .insert({
          title: announcementData.title,
          content: announcementData.content,
          priority: announcementData.priority,
        });

      if (error) throw error;

      toast.success('Comunicado adicionado com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao adicionar comunicado:', error);
      toast.error('Erro ao adicionar comunicado');
      return false;
    }
  }

  // Atualizar comunicado
  static async updateAnnouncement(id: string, announcementData: Partial<Omit<Announcement, 'id' | 'date' | 'createdAt' | 'updatedAt'>>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({
          ...announcementData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Comunicado atualizado com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar comunicado:', error);
      toast.error('Erro ao atualizar comunicado');
      return false;
    }
  }

  // Remover comunicado
  static async deleteAnnouncement(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Comunicado removido com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao remover comunicado:', error);
      toast.error('Erro ao remover comunicado');
      return false;
    }
  }
}

// Configurar realtime para sincronização
export const setupRealtime = () => {
  // Escutar mudanças na tabela de funcionários
  supabase
    .channel('employees_changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'employees' },
      (payload) => {
        console.log('Mudança detectada em funcionários:', payload);
        // Disparar evento customizado para atualizar a UI
        window.dispatchEvent(new CustomEvent('employees_updated', { detail: payload }));
      }
    )
    .subscribe();

  // Escutar mudanças na tabela de comunicados
  supabase
    .channel('announcements_changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'announcements' },
      (payload) => {
        console.log('Mudança detectada em comunicados:', payload);
        // Disparar evento customizado para atualizar a UI
        window.dispatchEvent(new CustomEvent('announcements_updated', { detail: payload }));
      }
    )
    .subscribe();
};
