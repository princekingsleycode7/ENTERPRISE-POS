import React from 'react';
import { EmployeePerformanceData } from '../../services/reports/reportService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface EmployeePerformanceProps {
  data: EmployeePerformanceData[];
  loading: boolean;
}

export const EmployeePerformance: React.FC<EmployeePerformanceProps> = ({ data, loading }) => {
  if (loading) return <div className="p-10 text-center text-gray-500">Loading data...</div>;

  return (
    <div className="space-y-6">
      
      {/* Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Sales by Employee</h3>
        <div className="h-[300px]">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Sales']} />
                <Bar dataKey="totalSales" fill="#8884d8" radius={[4, 4, 0, 0]} barSize={50} />
             </BarChart>
           </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-600">Employee Name</th>
                <th className="px-6 py-4 font-medium text-gray-600 text-center">Transactions</th>
                <th className="px-6 py-4 font-medium text-gray-600 text-right">Total Sales</th>
                <th className="px-6 py-4 font-medium text-gray-600 text-right">Avg Sale Value</th>
                <th className="px-6 py-4 font-medium text-gray-600 text-center">Voids Processed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.length === 0 ? (
                 <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No data available.</td></tr>
              ) : (
                data.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{emp.name}</td>
                    <td className="px-6 py-4 text-center">{emp.transactionCount}</td>
                    <td className="px-6 py-4 text-right font-medium text-blue-600">${emp.totalSales.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">${emp.averageSale.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center text-red-500">{emp.voidCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};