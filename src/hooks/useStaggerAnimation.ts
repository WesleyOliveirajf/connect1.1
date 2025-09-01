import { useEffect, useState } from "react";

export function useStaggerAnimation(itemsLength: number, delay: number = 100) {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    
    for (let i = 0; i < itemsLength; i++) {
      const timeout = setTimeout(() => {
        setVisibleItems(prev => [...prev, i]);
      }, i * delay);
      
      timeouts.push(timeout);
    }

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [itemsLength, delay]);

  const isVisible = (index: number) => visibleItems.includes(index);
  
  const getAnimationClass = (index: number, baseClass: string = "animate-scale-in") => {
    return isVisible(index) ? baseClass : "opacity-0";
  };

  return { isVisible, getAnimationClass };
}
