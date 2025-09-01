import { toast } from "@/hooks/use-toast";
import { type Employee } from "./useEmployeeSearch";

export function useExport() {
  const exportToCSV = (employees: Employee[], filename: string = "funcionarios_torp") => {
    try {
      // Criar cabeçalho CSV
      const headers = ["Nome", "Departamento", "Ramal", "Email"];
      
      // Criar linhas de dados
      const csvData = employees.map(emp => [
        emp.name,
        emp.department,
        emp.extension,
        emp.email
      ]);

      // Combinar cabeçalho e dados
      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(","))
        .join("\n");

      // Criar e baixar arquivo
      const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        // Verificação de segurança antes de remover
        if (link.parentNode === document.body) {
          document.body.removeChild(link);
        }
      }

      toast({
        title: "Exportação Concluída",
        description: `${employees.length} funcionário(s) exportado(s) para ${filename}.csv`,
      });
    } catch (error) {
      toast({
        title: "Erro na Exportação",
        description: "Não foi possível exportar os dados.",
        variant: "destructive",
      });
    }
  };

  const exportToJSON = (employees: Employee[], filename: string = "funcionarios_torp") => {
    try {
      const jsonContent = JSON.stringify(employees, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const link = document.createElement("a");
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}.json`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        // Verificação de segurança antes de remover
        if (link.parentNode === document.body) {
          document.body.removeChild(link);
        }
      }

      toast({
        title: "Exportação Concluída",
        description: `${employees.length} funcionário(s) exportado(s) para ${filename}.json`,
      });
    } catch (error) {
      toast({
        title: "Erro na Exportação",
        description: "Não foi possível exportar os dados.",
        variant: "destructive",
      });
    }
  };

  const exportToText = (employees: Employee[], filename: string = "funcionarios_torp") => {
    try {
      const textContent = employees
        .map(emp => `${emp.name} - ${emp.department} - Ramal: ${emp.extension} - Email: ${emp.email}`)
        .join("\n");

      const blob = new Blob([textContent], { type: "text/plain" });
      const link = document.createElement("a");
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}.txt`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        // Verificação de segurança antes de remover
        if (link.parentNode === document.body) {
          document.body.removeChild(link);
        }
      }

      toast({
        title: "Exportação Concluída",
        description: `${employees.length} funcionário(s) exportado(s) para ${filename}.txt`,
      });
    } catch (error) {
      toast({
        title: "Erro na Exportação",
        description: "Não foi possível exportar os dados.",
        variant: "destructive",
      });
    }
  };

  const shareData = async (employees: Employee[]) => {
    if (navigator.share && employees.length > 0) {
      try {
        const textContent = employees
          .map(emp => `${emp.name} - ${emp.department} - Ramal: ${emp.extension}`)
          .join("\n");

        await navigator.share({
          title: "Lista de Funcionários TORP",
          text: `Lista de Funcionários (${employees.length}):\n\n${textContent}`,
        });

        toast({
          title: "Compartilhado",
          description: `Lista de ${employees.length} funcionário(s) compartilhada`,
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          toast({
            title: "Erro ao Compartilhar",
            description: "Não foi possível compartilhar os dados.",
            variant: "destructive",
          });
        }
      }
    } else {
      // Fallback para copiar para clipboard
      try {
        const textContent = employees
          .map(emp => `${emp.name} - ${emp.department} - Ramal: ${emp.extension}`)
          .join("\n");

        await navigator.clipboard.writeText(textContent);
        toast({
          title: "Copiado para Área de Transferência",
          description: `Lista de ${employees.length} funcionário(s) copiada`,
        });
      } catch (error) {
        toast({
          title: "Erro ao Copiar",
          description: "Não foi possível copiar os dados.",
          variant: "destructive",
        });
      }
    }
  };

  return {
    exportToCSV,
    exportToJSON,
    exportToText,
    shareData,
  };
}
