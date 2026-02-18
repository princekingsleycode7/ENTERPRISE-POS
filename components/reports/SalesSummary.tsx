import React from 'react';
import { SalesSummaryData } from '../../services/reports/reportService';
import { DollarSign, ShoppingBag, CreditCard, AlertOctagon } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';

interface SalesSummaryProps {
  data: SalesSummaryData | null;
  loading: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const SalesSummary: React.FC<SalesSummaryProps> = ({ data, loading }) => {
  if (loading || !data) {
    return <div className="p-10 text-center text-gray-500">Loading summary...</div>;
  }

  const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      {sub && <p className="text-xs text-gray-400 mt-2">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Gross Sales" 
          value={`$${data.totalRevenue.toFixed(2)}`}
          sub={`Net: $${data.netRevenue.toFixed(2)} | Tax: $${data.totalTax.toFixed(2)}`}
          icon={DollarSign}
          color="bg-green-500"
        />
        <StatCard 
          title="Transactions" 
          value={data.totalTransactions}
          sub={`Avg Order: $${data.averageOrderValue.toFixed(2)}`}
          icon={ShoppingBag}
          color="bg-blue-500"
        />
        <StatCard 
          title="Voided" 
          value={`$${data.voidAmount.toFixed(2)}`}
          sub={`${data.voidCount} transactions voided`}
          icon={AlertOctagon}
          color="bg-red-500"
        />
        <StatCard 
          title="Top Payment" 
          value={data.paymentMethods[0]?.name || 'N/A'}
          sub={data.paymentMethods[0] ? `${((data.paymentMethods[0].value / data.totalRevenue) * 100).toFixed(1)}% of sales` : ''}
          icon={CreditCard}
          color="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Sales Trend</h3>
          <div className="h-[300px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={data.salesByDay.length > 0 ? data.salesByDay : data.salesByHour}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
                 <XAxis dataKey={data.salesByDay.length > 0 ? "date" : "hour"} />
                 <YAxis />
                 <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']} />
                 <Legend />
                 <Line type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={3} activeDot={{ r: 8 }} name="Revenue" />
               </LineChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Payment Methods</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.paymentMethods}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.paymentMethods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Sales']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};