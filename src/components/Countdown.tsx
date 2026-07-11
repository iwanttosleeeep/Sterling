import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

export const Countdown: React.FC = () => {
  const targetDate = new Date('2029-08-21T00:00:00');
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const difference = +targetDate - +new Date();
    let timeLeft = {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0
    };

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    }

    return timeLeft;
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="p-6 brutalist-border bg-black/40 backdrop-blur-sm mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[10px] font-pixel uppercase tracking-widest text-primary">System Protocol: PR_COUNTDOWN</h2>
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(timeLeft).map(([unit, value]) => (
          <div key={unit} className="flex flex-col items-center">
            <motion.span 
              key={value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-5xl font-bold font-pixel tracking-tighter"
            >
              {value.toString().padStart(2, '0')}
            </motion.span>
            <span className="text-[8px] font-pixel uppercase opacity-50 mt-2">{unit}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-6 h-1 w-full bg-[#1a1a1a] overflow-hidden">
        <motion.div 
          className="h-full bg-primary"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 2, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};
