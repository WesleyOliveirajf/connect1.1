import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface EmployeeSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  departmentFilter: string;
  onDepartmentChange: (value: string) => void;
  departments: string[];
  totalResults: number;
  totalEmployees: number;
  displayedCount?: number;
}

export function EmployeeSearch({
  searchTerm,
  onSearchChange,
  departmentFilter,
  onDepartmentChange,
  departments,
  totalResults,
  totalEmployees,
  displayedCount
}: EmployeeSearchProps) {
  const clearSearch = () => {
    onSearchChange("");
    onDepartmentChange("todos");
  };

  const hasActiveFilters = searchTerm !== "" || departmentFilter !== "todos";

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, ramal..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-card/50 border-border/60 focus:bg-card/80 transition-all duration-200"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSearchChange("")}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted/50"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-2 sm:mt-0" />
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Select value={departmentFilter} onValueChange={onDepartmentChange}>
              <SelectTrigger className="w-full sm:w-[200px] bg-card/50 border-border/60 focus:bg-card/80">
                <SelectValue placeholder="Filtrar por departamento" />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-sm border-border/60">
                <SelectItem value="todos">Todos os departamentos</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Badge variant="secondary" className="font-medium text-xs sm:text-sm">
            {displayedCount ? `${displayedCount} de ${totalResults}` : totalResults} de {totalEmployees} funcionários
          </Badge>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearSearch}
              className="h-7 text-xs bg-card/50 border-border/60 hover:bg-card/80"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>
        
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="text-xs sm:text-sm">Filtros:</span>
            {searchTerm && (
              <Badge variant="outline" className="text-xs">
                {searchTerm.length > 10 ? `${searchTerm.substring(0, 10)}...` : searchTerm}
              </Badge>
            )}
            {departmentFilter !== "todos" && (
              <Badge variant="outline" className="text-xs">
                {departmentFilter}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
