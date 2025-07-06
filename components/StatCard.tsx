
import React from 'react';
import type { StatCardData } from '../types';

function StatCard({ data }: { data: StatCardData }): React.ReactNode {
  const { title, value, subValue, change, changeType, icon } = data;
  const isIncrease = changeType === 'increase';
  const changeColor = isIncrease ? 'text-green-500' : 'text-red-500';
  const changeIcon = isIncrease ? '▲' : '▼';

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className="flex items-baseline space-x-2 mt-2">
            <p className="text-3xl font-bold text-gray-800">{value}</p>
            {subValue && (
                <span className="text-sm font-semibold text-green-600">{subValue}</span>
            )}
        </div>
        <div className="flex items-center mt-2 text-sm">
          <span className={`font-semibold ${changeColor}`}>{changeIcon} {change}</span>
          <span className="text-gray-500 ml-1">vs. mês anterior</span>
        </div>
      </div>
      <div className="bg-amber-100 text-amber-600 p-3 rounded-lg">
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "h-6 w-6" })}
      </div>
    </div>
  );
}

export default StatCard;
