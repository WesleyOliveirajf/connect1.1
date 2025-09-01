import { ThemeToggle } from "./ThemeToggle";

const Header = () => {
  return (
    <header className="w-full py-8 sm:py-12 mb-8 sm:mb-12 relative overflow-hidden">
      <div className="absolute inset-0 gradient-primary opacity-5"></div>
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="absolute top-0 right-0 z-20 animate-slide-in-right">
          <ThemeToggle />
        </div>
        <div className="text-center animate-bounce-in">
          <div className="inline-block mb-4 sm:mb-6">
            <div className="relative">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-transparent bg-clip-text torp-text-brand mb-2 tracking-tight">
                Torp Connect
              </h1>
              <span className="torp-tech-text">40 ANOS</span>
              <div className="absolute -inset-2 gradient-primary opacity-10 blur-xl rounded-full"></div>
            </div>
          </div>
          <p className="text-muted-foreground text-lg sm:text-xl font-medium px-4">
            Um espaço para unir, informar e transformar
          </p>
                                <div className="w-16 sm:w-24 h-1 torp-gradient-brand mx-auto mt-3 sm:mt-4 rounded-full"></div>
        </div>
      </div>
    </header>
  );
};

export default Header;