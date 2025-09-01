import { Card } from "@/components/ui/card";
import { Users, Phone, Mail, Copy, MessageSquare, ExternalLink, ChevronDown, ChevronUp, X, Clock, Search, Edit, Trash2, Plus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import AdvancedSearch from "./AdvancedSearch";
import { type Employee } from "@/hooks/useEmployeeSearch";
import { useStaggerAnimation } from "@/hooks/useStaggerAnimation";
import { useDebounce } from "@/hooks/useDebounce";
import { useSecureSession } from "@/utils/sessionStorage";
import { useEmployeeManager, type EmployeeFormData } from "@/hooks/useEmployeeManager";
import EmployeeForm from "./EmployeeForm";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { isEmployeeOnLunch } from "./LunchHours";
const EmployeeDirectory = () => {
  const [showAll, setShowAll] = useState(false);
  const ITEMS_PER_PAGE = 4; // Mostrar apenas 4 funcionários inicialmente
  
  // Hooks para autenticação e gerenciamento de funcionários
  const { isAuthenticated } = useSecureSession();
  const { 
    employees, 
    addEmployee, 
    updateEmployee, 
    deleteEmployee, 
    getDepartments,
    isLoading 
  } = useEmployeeManager();
  
  // Estados para funcionalidades administrativas
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const isAdminMode = isAuthenticated();
  
  // Funções para manipulação de funcionários (modo admin)
  const handleCreateEmployee = () => {
    setEditingEmployee(null);
    setIsFormOpen(true);
  };
  
  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsFormOpen(true);
  };
  
  const handleDeleteEmployee = (employee: Employee) => {
    setDeletingEmployee(employee);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDeleteEmployee = () => {
    if (deletingEmployee) {
      deleteEmployee(deletingEmployee.id!);
      setDeletingEmployee(null);
      setIsDeleteDialogOpen(false);
    }
  };
  
  const handleFormSubmit = (formData: EmployeeFormData) => {
    if (editingEmployee) {
      updateEmployee(editingEmployee.id!, formData);
    } else {
      addEmployee(formData);
    }
    setIsFormOpen(false);
    setEditingEmployee(null);
  };
  
  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingEmployee(null);
  };

  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const debouncedGlobalSearchTerm = useDebounce(globalSearchTerm, 300);
  const [advancedFilters, setAdvancedFilters] = useState({
    searchTerm: "",
    nameFilter: "",
    extensionFilter: "",
    selectedDepartments: []
  });
  
  const clearAllFilters = () => {
    setGlobalSearchTerm("");
    setAdvancedFilters({
      searchTerm: "",
      nameFilter: "",
      extensionFilter: "",
      selectedDepartments: []
    });
  };

  // Aplicar filtros aos funcionários
  const applyFilters = (employees: Employee[]) => {
    let filtered = employees;

    // Aplicar filtro de busca global (campo principal) - busca em todos os campos
    if (debouncedGlobalSearchTerm) {
      const searchLower = debouncedGlobalSearchTerm.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(searchLower) ||
        emp.email.toLowerCase().includes(searchLower) ||
        emp.department.toLowerCase().includes(searchLower) ||
        emp.extension.includes(debouncedGlobalSearchTerm)
      );
    }

    // Aplicar filtro de busca geral dos filtros avançados
    if (advancedFilters.searchTerm) {
      const searchLower = advancedFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(searchLower) ||
        emp.email.toLowerCase().includes(searchLower) ||
        emp.department.toLowerCase().includes(searchLower) ||
        emp.extension.includes(advancedFilters.searchTerm)
      );
    }

    // Aplicar filtro de nome específico
    if (advancedFilters.nameFilter) {
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(advancedFilters.nameFilter.toLowerCase())
      );
    }

    // Aplicar filtro de ramal específico
    if (advancedFilters.extensionFilter) {
      filtered = filtered.filter(emp => 
        emp.extension.includes(advancedFilters.extensionFilter)
      );
    }

    // Aplicar filtro de departamentos selecionados
    if (advancedFilters.selectedDepartments && advancedFilters.selectedDepartments.length > 0) {
      filtered = filtered.filter(emp => 
        advancedFilters.selectedDepartments.includes(emp.department)
      );
    }

    return filtered;
  };

  // Verificar se há filtros ativos
  const hasFilters = debouncedGlobalSearchTerm || 
                     advancedFilters.searchTerm || 
                     advancedFilters.nameFilter || 
                     advancedFilters.extensionFilter || 
                     (advancedFilters.selectedDepartments && advancedFilters.selectedDepartments.length > 0);


  // Aplicar filtros se houver
  const finalFilteredEmployees = hasFilters ? applyFilters(employees) : employees;
  
  const displayedEmployees = showAll ? finalFilteredEmployees : finalFilteredEmployees.slice(0, ITEMS_PER_PAGE);
  const hasMoreEmployees = finalFilteredEmployees.length > ITEMS_PER_PAGE;
  const filteredCount = finalFilteredEmployees.length;
  const { getAnimationClass } = useStaggerAnimation(displayedEmployees.length);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${type.charAt(0).toUpperCase() + type.slice(1)} copiado para a área de transferência.`,
      duration: 2000,
    });
  };

  const openTeams = (email: string, name: string) => {
    // URLs otimizadas para abrir chat direto no Teams
    const teamsUrls = [
      // Protocolo nativo - formato mais direto para chat
      `msteams://l/chat/0/0?users=${encodeURIComponent(email)}`,
      // Versão web - formato direto para chat
      `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email)}`,
      // Formato alternativo para compose
      `msteams://l/compose?to=${encodeURIComponent(email)}`,
      // Formato web alternativo
      `https://teams.microsoft.com/l/compose?to=${encodeURIComponent(email)}`,
      // Formato universal que funciona em mais cenários
      `https://teams.microsoft.com/_#/l/chat/0/0?users=${encodeURIComponent(email)}`
    ];
    
    // Função para tentar abrir o Teams
    const tryOpenTeams = async () => {
      // Primeiro tenta o protocolo nativo
      try {
        const nativeUrl = teamsUrls[0];
        window.open(nativeUrl, '_blank');
        
        // Aguarda um pouco para ver se o protocolo nativo funcionou
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log('Protocolo nativo falhou, tentando versão web');
      }
      
      // Fallback para versão web após delay
      setTimeout(() => {
        try {
          const webUrl = teamsUrls[1];
          window.open(webUrl, '_blank');
        } catch (error) {
          // Último recurso - formato universal
          window.open(teamsUrls[4], '_blank');
        }
      }, 800);
    };
    
    // Executa a tentativa de abertura
    tryOpenTeams();
    
    toast({
      title: "Teams aberto!",
      description: `Abrindo conversa com ${name} (${email}) no Microsoft Teams.`,
      duration: 3000,
    });
  };

  const getDepartmentColor = (department: string) => {
    const colors: { [key: string]: string } = {
      "Gente e Gestão": "210 100% 50%",
      "Administrativo": "150 70% 45%",
      "Comercial": "30 100% 50%",
      "Controladoria": "270 70% 50%",
      "Marketing": "300 80% 55%",
      "TI": "200 90% 50%",
      "Compras/Prefeitura": "180 60% 45%",
      "Salas": "0 0% 60%",
      "Engenharia": "45 85% 50%",
      "Qualidade": "120 70% 45%",
      "Produção": "15 90% 50%",
      "Manutenção": "240 80% 50%",
      "Logística": "330 75% 50%",
      "Segurança": "0 70% 45%"
    };
    return colors[department] || "220 70% 50%";
  };

  const departmentCounts = employees.reduce((acc, employee) => {
    acc[employee.department] = (acc[employee.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalEmployees = employees.length;

  return (
    <div className="space-y-6">
        <Card className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-background via-background to-muted/20 border-border/60 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Diretório de Funcionários
              </h2>
              <p className="text-sm text-muted-foreground font-medium">
                {filteredCount === totalEmployees 
                  ? `${totalEmployees} de ${totalEmployees} funcionários` 
                  : `${filteredCount} de ${totalEmployees} funcionários`
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Botão para criar novo funcionário - visível apenas para admins */}
            {isAdminMode && (
              <Button 
                onClick={handleCreateEmployee}
                size="sm" 
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4" />
                Novo Funcionário
              </Button>
            )}
            
            <Dialog open={isAdvancedSearchOpen} onOpenChange={setIsAdvancedSearchOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  Filtros Avançados
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md" aria-describedby="advanced-search-description">
                <div id="advanced-search-description" className="sr-only">
                  Filtros avançados para busca de funcionários
                </div>
                <DialogHeader>
                  <DialogTitle>Filtros Avançados</DialogTitle>
                </DialogHeader>
                <AdvancedSearch 
                  employees={employees}
                  filters={advancedFilters}
                  onFiltersChange={setAdvancedFilters}
                  onClose={() => setIsAdvancedSearchOpen(false)}
                />
              </DialogContent>
            </Dialog>
            
            {hasFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearAllFilters}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                Limpar
              </Button>
            )}
          </div>
        </div>
        
        {/* Campo de busca global */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            type="text"
            placeholder="Buscar por nome, ramal ou departamento..."
            value={globalSearchTerm}
            onChange={(e) => setGlobalSearchTerm(e.target.value)}
            className="pl-10 bg-background/50 border-border/60 focus:border-primary/50 focus:ring-primary/20"
            aria-label="Campo de busca global para funcionários"
            aria-describedby="search-description"
          />
          <div id="search-description" className="sr-only">
            Digite para buscar funcionários por nome, ramal, email ou departamento
          </div>
        </div>
      </Card>

      {finalFilteredEmployees.length === 0 ? (
          <div className="text-center py-16">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-full blur-xl" />
              <div className="relative p-6 rounded-full bg-gradient-to-br from-muted/50 to-muted/30 border border-border/40 w-24 h-24 mx-auto flex items-center justify-center">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {hasFilters ? 'Nenhum funcionário encontrado' : 'Nenhum funcionário cadastrado'}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              {hasFilters 
                ? 'Tente ajustar os filtros de busca ou limpar os critérios aplicados' 
                : 'Comece adicionando funcionários ao diretório para visualizá-los aqui'
              }
            </p>
            {isAdminMode && !hasFilters && (
              <Button 
                onClick={handleCreateEmployee}
                className="gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Plus className="h-4 w-4" />
                Adicionar Primeiro Funcionário
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
              {displayedEmployees.map((employee, index) => (
                <Card 
                   key={employee.id}
                   className={`group/item p-4 sm:p-5 bg-gradient-to-br from-card via-card/95 to-muted/20 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/40 transition-all duration-500 hover:scale-[1.03] hover:-translate-y-1 min-h-[180px] sm:min-h-[200px] border-border/40 backdrop-blur-sm ${getAnimationClass(index)} ${
                     employee.lunchTime && isEmployeeOnLunch(employee.lunchTime) ? 'ring-2 ring-green-500/40 bg-gradient-to-br from-green-50/10 via-card to-emerald-50/10 dark:from-green-950/20 dark:via-card dark:to-emerald-950/20' : ''
                   }`}
                 >
                  <div className="space-y-3 sm:space-y-4">
                     <div className="flex items-start gap-2 sm:gap-3">
                       <div 
                         className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm shadow-lg flex-shrink-0"
                         style={{ 
                           background: `linear-gradient(135deg, hsl(${getDepartmentColor(employee.department)}) 0%, hsl(${getDepartmentColor(employee.department)} / 0.8) 100%)` 
                         }}
                       >
                         {employee.name.split(' ').map(n => n[0]).join('')}
                       </div>
                       <div className="min-w-0 flex-1">
                         <h3 className="font-semibold text-sm sm:text-base text-foreground group-hover/item:text-primary transition-colors line-clamp-2">
                           {employee.name}
                         </h3>

                         <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-2" style={{ color: `hsl(${getDepartmentColor(employee.department)})` }}>
                           {employee.department}
                         </p>
                         
                         <div className="flex gap-1 sm:gap-2" role="group" aria-label={`Ações para ${employee.name}`}>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => window.open(`tel:${employee.extension}`)}
                             className="h-6 w-6 sm:h-7 sm:w-7 p-0 bg-background/50 hover:bg-background border-border/60"
                             title={`Ligar para ${employee.name}`}
                             aria-label={`Ligar para ${employee.name} no ramal ${employee.extension}`}
                           >
                             <Phone className="h-2.5 w-2.5 sm:h-3 sm:w-3" aria-hidden="true" />
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => openTeams(employee.email, employee.name)}
                             className="h-7 w-7 p-0 bg-background/50 hover:bg-background border-border/60"
                             title={`Abrir Teams com ${employee.name}`}
                             aria-label={`Abrir conversa no Teams com ${employee.name}`}
                           >
                             <MessageSquare className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-600" aria-hidden="true" />
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => window.open(`mailto:${employee.email}`, '_blank', 'noopener,noreferrer')}
                             className="h-7 w-7 p-0 bg-background/50 hover:bg-background border-border/60"
                             title={`Enviar email para ${employee.name}`}
                             aria-label={`Enviar email para ${employee.name} (${employee.email})`}
                           >
                             <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" aria-hidden="true" />
                           </Button>
                           
                           {/* Botões administrativos - visíveis apenas para admins */}
                           {isAdminMode && (
                             <div className="flex gap-1 ml-2 border-l border-border/30 pl-2">
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => handleEditEmployee(employee)}
                                 className="h-7 w-7 p-0 bg-gradient-to-br from-yellow-50 to-yellow-100/50 hover:from-yellow-100 hover:to-yellow-200/50 border-yellow-200 hover:border-yellow-300 shadow-sm hover:shadow-md transition-all duration-200"
                                 title={`Editar ${employee.name}`}
                                 aria-label={`Editar dados de ${employee.name}`}
                               >
                                 <Edit className="h-3 w-3 text-yellow-700" aria-hidden="true" />
                               </Button>
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => handleDeleteEmployee(employee)}
                                 className="h-7 w-7 p-0 bg-gradient-to-br from-red-50 to-red-100/50 hover:from-red-100 hover:to-red-200/50 border-red-200 hover:border-red-300 shadow-sm hover:shadow-md transition-all duration-200"
                                 title={`Excluir ${employee.name}`}
                                 aria-label={`Excluir ${employee.name} do diretório`}
                               >
                                 <Trash2 className="h-3 w-3 text-red-700" aria-hidden="true" />
                               </Button>
                             </div>
                           )}
                         </div>
                       </div>
                     </div>
                    
                    <div className="space-y-2 sm:space-y-3">
                       <div className="flex items-center gap-2 sm:gap-3 bg-muted/30 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg">
                         <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: 'hsl(var(--directory-accent))' }} />
                         <div className="flex-1">
                           <span className="text-xs font-medium text-muted-foreground block">Ramal</span>
                           <span className="font-mono font-semibold text-xs sm:text-sm text-foreground">
                             {employee.extension}
                           </span>
                         </div>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => copyToClipboard(employee.extension, "ramal")}
                           className="h-5 w-5 sm:h-6 sm:w-6 p-0 hover:bg-muted/50"
                           title="Copiar ramal"
                           aria-label={`Copiar ramal ${employee.extension} de ${employee.name}`}
                         >
                           <Copy className="h-2.5 w-2.5 sm:h-3 sm:w-3" aria-hidden="true" />
                         </Button>
                       </div>
                       
                       <div className="flex items-center gap-2 sm:gap-3 bg-muted/30 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg">
                         <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: 'hsl(var(--directory-accent))' }} />
                         <div className="flex-1 min-w-0">
                           <span className="text-xs font-medium text-muted-foreground block">Email</span>
                           <a 
                             href={`mailto:${employee.email}`}
                             className="text-xs sm:text-sm text-primary hover:text-primary-glow transition-colors hover:underline block truncate"
                             title={employee.email}
                           >
                             {employee.email}
                           </a>
                         </div>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => copyToClipboard(employee.email, "email")}
                           className="h-6 w-6 p-0 hover:bg-muted/50"
                           title="Copiar email"
                           aria-label={`Copiar email ${employee.email} de ${employee.name}`}
                         >
                           <Copy className="h-3 w-3" aria-hidden="true" />
                         </Button>
                       </div>
                       
                       {employee.lunchTime && (
                         <div className="flex items-center gap-2 sm:gap-3 bg-muted/30 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg">
                           <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: 'hsl(var(--directory-accent))' }} />
                           <div className="flex-1">
                             <span className="text-xs font-medium text-muted-foreground block">Horário de Almoço</span>
                             <span className={`text-xs sm:text-sm font-mono ${
                               isEmployeeOnLunch(employee.lunchTime) 
                                 ? 'text-green-600 dark:text-green-400 font-semibold' 
                                 : 'text-foreground'
                             }`}>
                               {employee.lunchTime}
                             </span>
                           </div>
                           {isEmployeeOnLunch(employee.lunchTime) && (
                             <span className="inline-flex items-center justify-center w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500" title="Em horário de almoço" />
                           )}
                         </div>
                       )}
                     </div>
                  </div>
                </Card>
              ))}
            </div>
            
            {/* Botão Ver Todos/Ver Menos */}
            {finalFilteredEmployees.length > ITEMS_PER_PAGE && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => setShowAll(!showAll)}
                  className="gap-2 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-primary/20 hover:border-primary/30 text-primary hover:text-primary font-medium px-6 py-2 rounded-full transition-all duration-300 hover:scale-105 shadow-sm hover:shadow-md"
                >
                  {showAll ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Ver Menos
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Ver Todos ({finalFilteredEmployees.length})
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}

      {/* Modal do formulário de funcionário */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="employee-form-description">
          <div id="employee-form-description" className="sr-only">
            Formulário para adicionar ou editar informações de funcionário
          </div>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isAdminMode && <Shield className="h-5 w-5 text-primary" />}
              {editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}
            </DialogTitle>
          </DialogHeader>
          <EmployeeForm
            employee={editingEmployee}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deletingEmployee?.name}</strong> do diretório?
              <br />
              <span className="text-red-600 font-medium">Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeletingEmployee(null);
              setIsDeleteDialogOpen(false);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteEmployee}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default EmployeeDirectory;