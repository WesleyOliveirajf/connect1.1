import { useState, useEffect } from "react";

export function useCurrentTime() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Atualiza a cada segundo

    return () => clearInterval(timer);
  }, []);

  const getCurrentHour = () => {
    return currentTime.getHours();
  };

  const getCurrentMinute = () => {
    return currentTime.getMinutes();
  };

  const getCurrentTimeMinutes = () => {
    return getCurrentHour() * 60 + getCurrentMinute();
  };

  const isTimeInRange = (timeRange: string) => {
    // Converte "11h30 - 12h30" para minutos e verifica se o horário atual está no range
    const [start, end] = timeRange.split(' - ');
    const parseTime = (time: string) => {
      const [hours, minutes] = time.replace('h', ':').split(':');
      return parseInt(hours) * 60 + (parseInt(minutes) || 0);
    };

    const startMinutes = parseTime(start);
    const endMinutes = parseTime(end);
    const currentMinutes = getCurrentTimeMinutes();

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  };

  const getTimeUntilRange = (timeRange: string) => {
    const [start] = timeRange.split(' - ');
    const parseTime = (time: string) => {
      const [hours, minutes] = time.replace('h', ':').split(':');
      return parseInt(hours) * 60 + (parseInt(minutes) || 0);
    };

    const startMinutes = parseTime(start);
    const currentMinutes = getCurrentTimeMinutes();
    
    if (currentMinutes < startMinutes) {
      const diffMinutes = startMinutes - currentMinutes;
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      
      if (hours > 0) {
        return `em ${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
      } else {
        return `em ${mins} minutos`;
      }
    }
    
    return null;
  };

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return {
    currentTime,
    getCurrentHour,
    getCurrentMinute,
    getCurrentTimeMinutes,
    isTimeInRange,
    getTimeUntilRange,
    formatCurrentTime
  };
}
