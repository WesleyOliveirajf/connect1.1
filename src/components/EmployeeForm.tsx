import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { User, Mail, Phone, Building, Clock, Save, X } from 'lucide-react';
import { type EmployeeFormData } from '@/hooks/useEmployeeManager';
import { type Employee } from '@/hooks/useEmployeeSearch';

interface EmployeeFormProps {
  employee?: Employee;
  onSave: (data: EmployeeFormData) => boolean;
  onCancel: () => void;
  departments: string[];
  isEditing?: boolean;
}

const EmployeeForm = ({ employee, onSave, onCancel, departments, isEditing = false }: EmployeeFormProps) => {
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: '',
    extension: '',
    email: '',
    department: '',
    lunchTime: '',
  });

  const [errors, setErrors] = useState<Partial<EmployeeFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Preencher formulário se estiver editando
  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name,
        extension: employee.extension,
        email: employee.email,
        department: employee.department,
        lunchTime: employee.lunchTime || '',
      });
    }
  }, [employee]);

  // Validar formulário
  const validateForm = (): boolean => {
    const newErrors: Partial<EmployeeFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.extension.trim()) {
      newErrors.extension = 'Ramal é obrigatório';
    } else if (!/^\d{4}$/.test(formData.extension)) {
      newErrors.extension = 'Ramal deve ter 4 dígitos';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (formData.email !== 'xxx' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!formData.department.trim()) {
      newErrors.department = 'Departamento é obrigatório';
    }

    if (formData.lunchTime && !/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(formData.lunchTime)) {
      newErrors.lunchTime = 'Formato: HH:MM-HH:MM (ex: 12:00-13:00)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const success = onSave(formData);
      if (success) {
        // Limpar formulário se for adição
        if (!isEditing) {
          setFormData({
            name: '',
            extension: '',
            email: '',
            department: '',
            lunchTime: '',
          });
        }
        onCancel(); // Fechar formulário
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Atualizar campo do formulário
  const updateField = (field: keyof EmployeeFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">
            {isEditing ? 'Editar Funcionário' : 'Adicionar Funcionário'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isEditing ? 'Atualize as informações do funcionário' : 'Preencha os dados do novo funcionário'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome */}
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Nome Completo *
          </Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Ex: João Silva"
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        {/* Ramal */}
        <div className="space-y-2">
          <Label htmlFor="extension" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Ramal *
          </Label>
          <Input
            id="extension"
            type="text"
            value={formData.extension}
            onChange={(e) => updateField('extension', e.target.value)}
            placeholder="Ex: 4722"
            maxLength={4}
            className={errors.extension ? 'border-red-500' : ''}
          />
          {errors.extension && (
            <p className="text-sm text-red-500">{errors.extension}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email *
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="Ex: joao.silva@torp.ind.br ou xxx"
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Use "xxx" se o email não estiver disponível
          </p>
        </div>

        {/* Departamento */}
        <div className="space-y-2">
          <Label htmlFor="department" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Departamento *
          </Label>
          <Select
            value={formData.department}
            onValueChange={(value) => updateField('department', value)}
          >
            <SelectTrigger className={errors.department ? 'border-red-500' : ''}>
              <SelectValue placeholder="Selecione o departamento" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
              <SelectItem value="Novo Departamento">
                + Novo Departamento
              </SelectItem>
            </SelectContent>
          </Select>
          {errors.department && (
            <p className="text-sm text-red-500">{errors.department}</p>
          )}
          
          {/* Campo para novo departamento */}
          {formData.department === 'Novo Departamento' && (
            <Input
              type="text"
              placeholder="Digite o nome do novo departamento"
              onChange={(e) => updateField('department', e.target.value)}
              className="mt-2"
            />
          )}
        </div>

        {/* Horário de Almoço */}
        <div className="space-y-2">
          <Label htmlFor="lunchTime" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Horário de Almoço (Opcional)
          </Label>
          <Input
            id="lunchTime"
            type="text"
            value={formData.lunchTime}
            onChange={(e) => updateField('lunchTime', e.target.value)}
            placeholder="Ex: 12:00-13:00"
            className={errors.lunchTime ? 'border-red-500' : ''}
          />
          {errors.lunchTime && (
            <p className="text-sm text-red-500">{errors.lunchTime}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Formato: HH:MM-HH:MM (ex: 12:00-13:00)
          </p>
        </div>

        {/* Botões */}
        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 gap-2"
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Adicionar')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default EmployeeForm;