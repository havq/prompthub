import React from 'react';

export const Toggle: React.FC<{checked: boolean, onChange: (val: boolean) => void, label: string, hint: string}> = ({ checked, onChange, label, hint }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
       <span className="flex-grow flex flex-col">
           <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
           <span className="text-xs text-gray-500 dark:text-gray-400">{hint}</span>
       </span>
       <label className="relative inline-flex items-center cursor-pointer">
           <input type="checkbox" className="sr-only peer" checked={checked} onChange={e => onChange(e.target.checked)} />
           <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
       </label>
   </div>
);