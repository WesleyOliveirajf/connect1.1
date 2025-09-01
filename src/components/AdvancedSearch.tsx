import { useState } from "react";
import { Search, X, Download, Users, Building } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { type Employee } from "@/hooks/useEmployeeSearch";

interface AdvancedSearchProps {
  employees: Employee[];
  filters: {
    searchTerm: string;
    nameFilter: string;
    extensionFilter: string;
    selectedDepartments: string[];
  };
  onFiltersChange: (filters: any) => void;
  onClose: () => void;
}

export function AdvancedSearch({ employees, filters, onFiltersChange, onClose }: AdvancedSearchProps) {
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || "");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(filters.selectedDepartments || []);
  const [nameFilter, setNameFilter] = useState(filters.nameFilter || "");
  const [extensionFilter, setExtensionFilter] = useState(filters.extensionFilter || "");

  const departments = Array.from(new Set(employees.map(emp => emp.department))).sort();

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments(prev => 
      prev.includes(dept) 
        ? prev.filter(d => d !== dept)
        : [...prev, dept]
    );
  };

  const applyFilters = () => {
    const newFilters = {
      searchTerm,
      nameFilter,
      extensionFilter,
      selectedDepartments
    };
    onFiltersChange(newFilters);
    onClose();
  };

  const clearFilters = () => {
    const clearedFilters = {
      searchTerm: "",
      nameFilter: "",
      extensionFilter: "",
      selectedDepartments: []
    };
    setSearchTerm("");
    setNameFilter("");
    setExtensionFilter("");
    setSelectedDepartments([]);
    onFiltersChange(clearedFilters);
  };

  const exportResults = () => {
    const filtered = applyCurrentFilters();
    console.log('Exportar resultados:', filtered);
  };

  const applyCurrentFilters = () => {
    let filtered = employees;

    if (searchTerm) {
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.extension.includes(searchTerm)
      );
    }

    if (nameFilter) {
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }

    if (extensionFilter) {
      filtered = filtered.filter(emp => 
        emp.extension.includes(extensionFilter)
      );
    }

    if (selectedDepartments.length > 0) {
      filtered = filtered.filter(emp => 
        selectedDepartments.includes(emp.department)
      );
    }

    return filtered;
  };

  const hasActiveFilters = searchTerm || nameFilter || extensionFilter || selectedDepartments.length > 0;
  const filteredCount = applyCurrentFilters().length;

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Busca Avançada de Funcionários
        </DialogTitle>
        <DialogDescription>
          Use os filtros abaixo para encontrar funcionários específicos
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Busca Geral</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, ramal ou departamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome Específico</label>
            <Input
              placeholder="Ex: João, Maria..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Ramal Específico</label>
            <Input
              placeholder="Ex: 4701, 47..."
              value={extensionFilter}
              onChange={(e) => setExtensionFilter(e.target.value)}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2">
            <Building className="h-4 w-4" />
            Departamentos ({selectedDepartments.length}/{departments.length})
          </label>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
            {departments.map((dept) => (
              <Button
                key={dept}
                variant={selectedDepartments.includes(dept) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleDepartment(dept)}
                className="justify-start text-xs h-8"
              >
                {dept}
              </Button>
            ))}
          </div>

          {selectedDepartments.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedDepartments.map((dept) => (
                <Badge 
                  key={dept} 
                  variant="secondary" 
                  className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => toggleDepartment(dept)}
                >
                  {dept}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        <div className="bg-muted/30 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Resultados: {filteredCount} funcionário(s)
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={exportResults}
              disabled={filteredCount === 0}
              className="h-7"
            >
              <Download className="h-3 w-3 mr-1" />
              Exportar
            </Button>
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            <X className="h-4 w-4 mr-2" />
            Limpar Filtros
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={applyFilters}>
              <Search className="h-4 w-4 mr-2" />
              Aplicar Filtros
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdvancedSearch;