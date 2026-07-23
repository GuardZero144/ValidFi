import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface AnalyticsData {
  usage: {
    totalIdentities: number;
    activeIdentities: number;
    revokedIdentities: number;
  };
  verificationRates: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  sharingPatterns: {
    total: number;
    active: number;
    expired: number;
  };
  verificationTrend: {
    date: string;
    count: number;
  }[];
}

const COLORS = ['#10B981', '#3B82F6', '#EF4444', '#F59E0B'];

export function CredentialAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        // We simulate calling the API since the frontend/backend connect isn't fully set up in this snippet
        const res = await fetch('http://localhost:3000/analytics/dashboard');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else {
          // Mock data fallback if backend is down
          setData({
            usage: { totalIdentities: 120, activeIdentities: 105, revokedIdentities: 15 },
            verificationRates: { total: 300, approved: 250, pending: 30, rejected: 20 },
            sharingPatterns: { total: 150, active: 80, expired: 70 },
            verificationTrend: [
              { date: '1/1', count: 12 },
              { date: '1/2', count: 19 },
              { date: '1/3', count: 15 },
              { date: '1/4', count: 22 },
              { date: '1/5', count: 30 },
              { date: '1/6', count: 25 },
              { date: '1/7', count: 35 }
            ]
          });
        }
      } catch (e) {
        console.error("Failed to fetch analytics:", e);
        // Fallback mock data
        setData({
          usage: { totalIdentities: 120, activeIdentities: 105, revokedIdentities: 15 },
          verificationRates: { total: 300, approved: 250, pending: 30, rejected: 20 },
          sharingPatterns: { total: 150, active: 80, expired: 70 },
          verificationTrend: [
            { date: '1/1', count: 12 },
            { date: '1/2', count: 19 },
            { date: '1/3', count: 15 },
            { date: '1/4', count: 22 },
            { date: '1/5', count: 30 },
            { date: '1/6', count: 25 },
            { date: '1/7', count: 35 }
          ]
        });
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-green-200">Loading analytics...</div>
      </div>
    );
  }

  const pieData = [
    { name: 'Approved', value: data.verificationRates.approved },
    { name: 'Pending', value: data.verificationRates.pending },
    { name: 'Rejected', value: data.verificationRates.rejected },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white mb-4">Credential Analytics Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-green-200 text-sm font-medium">Total Credentials Issued</h3>
          <p className="text-3xl text-white font-bold mt-2">{data.usage.totalIdentities}</p>
          <div className="mt-2 text-xs text-green-300">
            {data.usage.activeIdentities} active • {data.usage.revokedIdentities} revoked
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-blue-200 text-sm font-medium">Total Verifications</h3>
          <p className="text-3xl text-white font-bold mt-2">{data.verificationRates.total}</p>
          <div className="mt-2 text-xs text-blue-300">
            {data.verificationRates.approved} approved • {data.verificationRates.rejected} rejected
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-purple-200 text-sm font-medium">Data Shares</h3>
          <p className="text-3xl text-white font-bold mt-2">{data.sharingPatterns.total}</p>
          <div className="mt-2 text-xs text-purple-300">
            {data.sharingPatterns.active} active • {data.sharingPatterns.expired} expired
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-white text-lg font-medium mb-4">Verification Trend (Last 7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.verificationTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                <XAxis dataKey="date" stroke="#ffffff80" />
                <YAxis stroke="#ffffff80" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="count" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h3 className="text-white text-lg font-medium mb-4">Verification Rates</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '0.5rem', color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#ffffff80' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
