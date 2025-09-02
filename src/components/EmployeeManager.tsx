import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Download, 
  Upload, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useEmployeeManager, type EmployeeFormData } from '@/hooks/useEmployeeManager';
import { type Employee } from '@/hooks/useEmployeeSearch';
import EmployeeForm from './EmployeeForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const EmployeeManager = () => {
  const {
    employees,
    addEmployee,
    updateEmployee,
    removeEmployee,
    exportEmployees,
    importEmployees,
    getDepartments
  } = useEmployeeManager();

  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar funcionários por busca
  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.extension.includes(searchTerm)
  );

  // Salvar funcionário (adicionar ou editar)
  const handleSaveEmployee = (data: EmployeeFormData): boolean => {
    try {
      if (editingEmployee) {
        const success = updateEmployee(editingEmployee.id, data);
        if (success) {
          toast.success('Funcionário atualizado com sucesso!');
          setEditingEmployee(null);
          setShowForm(false);
        } else {
          toast.error('Erro ao atualizar funcionário. Verifique se o ramal não está em uso.');
        }
        return success;
      } else {
        const success = addEmployee(data);
        if (success) {
          toast.success('Funcionário adicionado com sucesso!');
          setShowForm(false);
        } else {
          toast.error('Erro ao adicionar funcionário. Verifique se o ramal não está em uso.');
        }
        return success;
      }
    } catch (error) {
      toast.error('Erro inesperado ao salvar funcionário.');
      return false;
    }
  };

  // Confirmar exclusão
  const handleDeleteEmployee = () => {
    if (deleteEmployee) {
      const success = removeEmployee(deleteEmployee.id);
      if (success) {
        toast.success('Funcionário removido com sucesso!');
      } else {
        toast.error('Erro ao remover funcionário.');
      }
      setDeleteEmployee(null);
    }
  };

  // Exportar dados
  const handleExport = () => {
    try {
      exportEmployees();
      toast.success('Dados exportados com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar dados.');
    }
  };

  // Importar dados
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          const success = importEmployees(data);
          if (success) {
            toast.success('Dados importados com sucesso!');
          } else {
            toast.error('Erro ao importar dados. Verifique o formato do arquivo.');
          }
        } catch (error) {
          toast.error('Arquivo inválido. Use apenas arquivos JSON válidos.');
        }
      };
      reader.readAsText(file);
    }
    // Limpar input
    event.target.value = '';
  };

  // Cancelar formulário
  const handleCancelForm = () => {
    setShowForm(false);
    setEditingEmployee(null);
  };

  // Iniciar edição
  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Gerenciar Funcionários</h2>
            <p className="text-muted-foreground">
              {employees.length} funcionário{employees.length !== 1 ? 's' : ''} cadastrado{employees.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Botão Importar */}
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Importar
            </Button>
          </div>

          {/* Botão Exportar */}
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>

          {/* Botão Adicionar */}
          <Button 
            onClick={() => setShowForm(true)} 
            className="gap-2"
            disabled={showForm}
          >
            <Plus className="h-4 w-4" />
            Adicionar Funcionário
          </Button>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <EmployeeForm
          employee={editingEmployee || undefined}
          onSave={handleSaveEmployee}
          onCancel={handleCancelForm}
          departments={getDepartments()}
          isEditing={!!editingEmployee}
        />
      )}

      {/* Busca */}
      {!showForm && (
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nome, departamento ou ramal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>
      )}

      {/* Lista de Funcionários */}
      {!showForm && (
        <div className="grid gap-4">
          {filteredEmployees.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'Nenhum funcionário encontrado' : 'Nenhum funcionário cadastrado'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Tente ajustar os termos de busca'
                  : 'Comece adicionando o primeiro funcionário'
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowForm(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Primeiro Funcionário
                </Button>
              )}
            </Card>
          ) : (
            filteredEmployees.map((employee) => (
              <div key={employee.id}>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{employee.name}</h3>
                          <Badge variant="secondary">{employee.department}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Ramal: {employee.extension}</span>
                          <span>Email: {employee.email}</span>
                          {employee.lunchTime && (
                            <span>Almoço: {employee.lunchTime}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditEmployee(employee)}
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteEmployee(employee)}
                        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            ))
          )}
        </div>
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteEmployee} onOpenChange={() => setDeleteEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o funcionário <strong>{deleteEmployee?.name}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEmployee}
              className="bg-red-600 hover:bg-red-700"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmployeeManager;