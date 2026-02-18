import React from 'react';

interface NumPadProps {
  onNumberClick: (num: number) => void;
  onClear: () => void;
  onEnter?: () => void;
  showEnter?: boolean;
}

export const NumPad: React.FC<NumPadProps> = ({ 
  onNumberClick, 
  onClear, 
  onEnter, 
  showEnter = true 
}) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <button
          key={num}
          onClick={() => onNumberClick(num)}
          className="h-16 rounded-xl bg-gray-50 text-2xl font-semibold text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors focus:outline-none"
        >
          {num}
        </button>
      ))}
      <button
        onClick={onClear}
        className="h-16 rounded-xl bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-colors focus:outline-none flex items-center justify-center"
      >
        Clear
      </button>
      <button
        onClick={() => onNumberClick(0)}
        className="h-16 rounded-xl bg-gray-50 text-2xl font-semibold text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors focus:outline-none"
      >
        0
      </button>
      {showEnter && (
        <button
          onClick={onEnter}
          className="h-16 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors focus:outline-none flex items-center justify-center"
        >
          Enter
        </button>
      )}
    </div>
  );
};