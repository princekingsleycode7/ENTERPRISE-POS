import React from 'react';
import { ProductPerformanceData } from '../../services/reports/reportService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ProductPerformanceProps {
  data: ProductPerformanceData[];
  loading: boolean;
}

export const ProductPerformance: React.FC<ProductPerformanceProps> = ({ data, loading }) => {
  if (loading) return <div className="p-10 text-center text-gray-500">Loading data...</div>;

  const top5Products = data.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Top 5 Products by Revenue</h3>
        <div className="h-[300px]">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={top5Products} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#3B82F6" radius={[0, 4, 4, 0]} />
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
                <th className="px-6 py-4 font-medium text-gray-600">Product Name</th>
                <th className="px-6 py-4 font-medium text-gray-600">Category</th>
                <th className="px-6 py-4 font-medium text-gray-600 text-right">Sold Qty</th>
                <th className="px-6 py-4 font-medium text-gray-600 text-right">Revenue</th>
                <th className="px-6 py-4 font-medium text-gray-600 text-right">Profit</th>
                <th className="px-6 py-4 font-medium text-gray-600 text-right">Margin</th>
                <th className="px-6 py-4 font-medium text-gray-600 text-center">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No sales data for this period.</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 text-gray-600">{item.category}</td>
                    <td className="px-6 py-4 text-right">{item.quantitySold}</td>
                    <td className="px-6 py-4 text-right font-medium">${item.revenue.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right text-green-600">${item.profit.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">{item.margin.toFixed(1)}%</td>
                    <td className="px-6 py-4 text-center">
                       <span className={`px-2 py-1 rounded text-xs font-bold ${
                         item.currentStock <= 5 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                       }`}>
                         {item.currentStock}
                       </span>
                    </td>
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