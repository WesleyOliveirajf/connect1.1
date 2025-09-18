import Header from "@/components/Header";
import EmployeeDirectory from "@/components/EmployeeDirectory";
import AnnouncementManager from "@/components/AnnouncementManager";
import LunchHours from "@/components/LunchHours";
import Footer from "@/components/Footer";
import ErrorBoundary from "@/components/ErrorBoundary";
import AdminPanel from "@/components/AdminPanel";
import Chatbot from "@/components/Chatbot";
import { useAnnouncements } from "@/hooks/useAnnouncements";

const Index = () => {
  const { 
    announcements, 
    updateAnnouncements, 
    isLoading,
    exportData,
    importData,
    restoreFromBackup,
    resetAnnouncements
  } = useAnnouncements();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        <Header />
        
        <main className="container mx-auto px-4 sm:px-6 pb-12">
          {/* Painel Administrativo */}
          <div className="mb-6 flex justify-end">
            <AdminPanel 
              announcements={announcements}
              onAnnouncementsChange={updateAnnouncements}
              exportData={exportData}
              importData={importData}
              restoreFromBackup={restoreFromBackup}
              resetAnnouncements={resetAnnouncements}
            />
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
            <ErrorBoundary>
              <div className="xl:col-span-2 order-1 animate-slide-in-left">
                <AnnouncementManager 
                  announcements={announcements}
                  onAnnouncementsChange={updateAnnouncements}
                  exportData={exportData}
                  importData={importData}
                  restoreFromBackup={restoreFromBackup}
                  resetAnnouncements={resetAnnouncements}
                />
              </div>
            </ErrorBoundary>
            
            <ErrorBoundary>
              <div className="xl:col-span-1 order-2 animate-scale-in" style={{ animationDelay: '0.1s' }}>
                <EmployeeDirectory />
              </div>
            </ErrorBoundary>
          </div>
          
          {/* Seção de Horários de Almoço - Movida para o final */}
          <ErrorBoundary>
            <div className="mt-8 animate-fade-in">
              <LunchHours />
            </div>
          </ErrorBoundary>
        </main>
        <Footer />
        
        {/* Chatbot - Ocultado temporariamente */}
        {/* <Chatbot /> */}
      </div>
    </ErrorBoundary>
  );
};

export default Index;
