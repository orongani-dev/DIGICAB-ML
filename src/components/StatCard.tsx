import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
  onClick?: () => void;
}

export default function StatCard({ title, value, icon: Icon, subValue, trend, color = 'navy', onClick }: StatCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      onClick={onClick}
      className={`bg-surface p-4 rounded-lg shadow-sm border border-border-theme flex flex-col justify-between transition-all ${onClick ? 'cursor-pointer hover:border-gold shadow-md hover:shadow-xl' : ''}`}
    >
      <div>
        <span className="text-[0.75rem] font-bold text-text-muted uppercase tracking-wider mb-2 block">{title}</span>
        <div className="flex items-end justify-between">
          <h3 className="text-2xl font-bold text-navy leading-none">{value}</h3>
          <div className={`p-2 rounded-lg ${color === 'navy' ? 'bg-navy/5 text-navy' : 'bg-gold/10 text-gold'}`}>
             <Icon size={18} />
          </div>
        </div>
      </div>
      {subValue && (
        <p className={`text-[0.7rem] mt-3 font-medium ${
          trend === 'up' ? 'text-success' : 
          trend === 'down' ? 'text-danger' : 'text-text-muted'
        }`}>
          {trend === 'up' ? '↑ ' : trend === 'down' ? '↓ ' : ''}
          {subValue}
        </p>
      )}
    </motion.div>
  );
}
